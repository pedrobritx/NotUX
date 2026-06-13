import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { toBase64, fromBase64 } from "lib0/buffer";
import * as syncProtocol from "y-protocols/sync";
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import type {
  SupabaseClient,
  RealtimeChannel,
} from "@supabase/supabase-js";

// Networks a Y.Doc over a Supabase Realtime broadcast channel scoped to one
// board. Implements the Yjs sync protocol (state-vector handshake so late
// joiners get missing updates from connected peers) plus awareness for
// presence/cursors. The Y.Doc remains the single source of truth — this is
// just another transport attached to it, alongside IndexedDB.
//
// Echo / undo handling: every update applied from the network uses THIS
// provider instance as the transaction origin. The `doc.on("update")` handler
// skips updates whose origin is `this` (no re-broadcast), and the canvas
// UndoManager — which tracks only null-origin (local) transactions — never
// captures them.

// Message types, written as the first varUint of each payload.
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const MSG_QUERY_AWARENESS = 2;

const BROADCAST_EVENT = "y";
// Supabase broadcast frames are size-limited; warn well before the ~256 KB cap.
const PAYLOAD_WARN_BYTES = 200_000;

export interface SupabaseProviderOptions {
  client: SupabaseClient;
  boardId: string;
  doc: Y.Doc;
  awareness: Awareness;
  // When true, open the channel as a private (RLS-authorized) channel so only
  // members of the board can subscribe/broadcast. Requires the project's
  // Realtime "Allow public access" to be disabled and the realtime.messages
  // policies from 0005_security_membership.sql. Defaults to the legacy public
  // channel for backward compatibility.
  privateChannel?: boolean;
}

interface Envelope {
  from: string;
  b64: string;
}

export class SupabaseProvider {
  readonly boardId: string;
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  synced = false;

  private client: SupabaseClient;
  private channel: RealtimeChannel;
  // Distinguishes our own broadcasts from peers' (belt-and-suspenders alongside
  // the channel's `broadcast.self = false`).
  private sessionId: string;
  private destroyed = false;

  constructor(opts: SupabaseProviderOptions) {
    this.client = opts.client;
    this.boardId = opts.boardId;
    this.doc = opts.doc;
    this.awareness = opts.awareness;
    this.sessionId = Math.random().toString(36).slice(2);

    this.channel = this.client.channel(`notux-board-${opts.boardId}`, {
      config: { broadcast: { self: false }, private: opts.privateChannel ?? false },
    });

    this.channel.on("broadcast", { event: BROADCAST_EVENT }, ({ payload }) => {
      this.handleMessage(payload as Envelope);
    });

    this.doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", this.onUnload);
      window.addEventListener("beforeunload", this.onUnload);
    }

    this.channel.subscribe((status) => {
      if (status === "SUBSCRIBED") this.onConnect();
    });
  }

  // --- outbound -----------------------------------------------------------

  private broadcast(encoder: encoding.Encoder) {
    if (this.destroyed) return;
    const bytes = encoding.toUint8Array(encoder);
    const b64 = toBase64(bytes);
    if (b64.length > PAYLOAD_WARN_BYTES) {
      // A board large enough to exceed the broadcast frame limit may have this
      // message silently dropped. Late-join still works via the joiner's own
      // IndexedDB; chunking is a future improvement.
      console.warn(
        `[notux/sync] broadcast payload ${b64.length}B exceeds safe size; ` +
          "peers may not receive this update.",
      );
    }
    void this.channel.send({
      type: "broadcast",
      event: BROADCAST_EVENT,
      payload: { from: this.sessionId, b64 } satisfies Envelope,
    });
  }

  private onConnect() {
    // Step 1: advertise our state vector so peers reply with what we're missing.
    const sync = encoding.createEncoder();
    encoding.writeVarUint(sync, MSG_SYNC);
    syncProtocol.writeSyncStep1(sync, this.doc);
    this.broadcast(sync);

    // Advertise our local awareness state and ask peers for theirs.
    if (this.awareness.getLocalState() !== null) {
      this.broadcastAwareness([this.awareness.clientID]);
    }
    const query = encoding.createEncoder();
    encoding.writeVarUint(query, MSG_QUERY_AWARENESS);
    this.broadcast(query);
  }

  private broadcastAwareness(clients: number[]) {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_AWARENESS);
    encoding.writeVarUint8Array(enc, encodeAwarenessUpdate(this.awareness, clients));
    this.broadcast(enc);
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    // Don't echo updates we just applied from the network.
    if (origin === this) return;
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    syncProtocol.writeUpdate(enc, update);
    this.broadcast(enc);
  };

  private onAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    if (origin === this) return;
    const { added, updated, removed } = changes;
    this.broadcastAwareness([...added, ...updated, ...removed]);
  };

  private onUnload = () => {
    removeAwarenessStates(this.awareness, [this.awareness.clientID], "unload");
  };

  // --- inbound ------------------------------------------------------------

  private handleMessage(envelope: Envelope) {
    if (!envelope || envelope.from === this.sessionId) return;
    const decoder = decoding.createDecoder(fromBase64(envelope.b64));
    const type = decoding.readVarUint(decoder);

    switch (type) {
      case MSG_SYNC: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_SYNC);
        // Applies any incoming update with `this` as origin and writes a reply
        // (e.g. sync-step-2 in response to a peer's step-1) into `encoder`.
        syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
        if (!this.synced) {
          this.synced = true;
        }
        // Only broadcast if the protocol produced a reply beyond the type byte.
        if (encoding.length(encoder) > 1) this.broadcast(encoder);
        break;
      }
      case MSG_AWARENESS: {
        applyAwarenessUpdate(
          this.awareness,
          decoding.readVarUint8Array(decoder),
          this,
        );
        break;
      }
      case MSG_QUERY_AWARENESS: {
        // A peer joined and wants current presence — re-send all known states.
        const clients = Array.from(this.awareness.getStates().keys());
        if (clients.length > 0) this.broadcastAwareness(clients);
        break;
      }
      default:
        break;
    }
  }

  // --- teardown -----------------------------------------------------------

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.onUnload);
      window.removeEventListener("beforeunload", this.onUnload);
    }
    removeAwarenessStates(this.awareness, [this.awareness.clientID], "destroy");
    void this.client.removeChannel(this.channel);
    _providers.delete(this.boardId);
    _awarenessByBoard.delete(this.boardId);
  }
}

// Per-board singletons, mirroring getIndexedDbProvider. These outlive React
// component mounts (StrictMode double-invokes the effect), so we never open two
// channels or attach duplicate doc handlers for the same board.
const _providers = new Map<string, SupabaseProvider>();
const _awarenessByBoard = new Map<string, Awareness>();

export function getAwareness(boardId: string, doc: Y.Doc): Awareness {
  let awareness = _awarenessByBoard.get(boardId);
  if (!awareness) {
    awareness = new Awareness(doc);
    _awarenessByBoard.set(boardId, awareness);
  }
  return awareness;
}

export function getSupabaseProvider(
  opts: SupabaseProviderOptions,
): SupabaseProvider {
  let provider = _providers.get(opts.boardId);
  if (!provider) {
    provider = new SupabaseProvider(opts);
    _providers.set(opts.boardId, provider);
  }
  return provider;
}
