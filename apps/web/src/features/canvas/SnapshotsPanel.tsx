import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Popover, Icon } from "@notux/ui";
import { useShapeStore } from "@notux/canvas";
import { encodeSnapshot, restoreSnapshot } from "@notux/sync";
import {
  saveNamedSnapshot,
  listNamedSnapshots,
  fetchSnapshotBytes,
  type NamedSnapshot,
} from "../board/snapshotsApi";

interface Props {
  open: boolean;
  onClose(): void;
  anchorRef: RefObject<HTMLElement>;
  boardId: string;
  client: SupabaseClient | null;
  owned: boolean;
}

function formatRelative(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Named-snapshot panel: save the current board as a labelled version, list saved
// versions, and restore one (overwriting the live board for everyone). Owner-only
// per the snapshots RLS; read/list is public. Disabled entirely in local-only mode.
export function SnapshotsPanel({
  open,
  onClose,
  anchorRef,
  boardId,
  client,
  owned,
}: Props) {
  const [label, setLabel] = useState("");
  const [snapshots, setSnapshots] = useState<NamedSnapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!client) return;
    try {
      setSnapshots(await listNamedSnapshots(client, boardId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load snapshots");
    }
  }, [client, boardId]);

  useEffect(() => {
    if (open) {
      setError(null);
      void refresh();
    }
  }, [open, refresh]);

  async function onSave() {
    if (!client || !owned) return;
    const doc = useShapeStore.getState()._doc;
    if (!doc) return;
    const name = label.trim() || `Snapshot ${new Date().toLocaleString()}`;
    setBusy(true);
    setError(null);
    try {
      await saveNamedSnapshot(client, boardId, name, encodeSnapshot(doc));
      setLabel("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(snap: NamedSnapshot) {
    if (!client || !owned) return;
    const doc = useShapeStore.getState()._doc;
    if (!doc) return;
    const ok = window.confirm(
      `Replace the entire board with “${snap.label}”?\n\n` +
        "This affects all collaborators and can be undone with Cmd/Ctrl+Z.",
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await fetchSnapshotBytes(client, snap.id);
      restoreSnapshot(doc, bytes);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      placement="bottom"
      className="menu-popover"
    >
      <div className="snapshots">
        <div className="snapshots__head">Snapshots</div>

        {!client ? (
          <p className="snapshots__note">
            Named snapshots require sign-in and Supabase to be configured.
          </p>
        ) : !owned ? (
          <p className="snapshots__note">
            Sign in as the board owner to save or restore snapshots.
          </p>
        ) : (
          <div className="snapshots__save">
            <input
              ref={labelRef}
              className="snapshots__input"
              placeholder="Version label…"
              value={label}
              disabled={busy}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSave();
              }}
            />
            <button
              type="button"
              className="menu__item snapshots__save-btn"
              disabled={busy}
              onClick={() => void onSave()}
            >
              <Icon name="plus" size={16} />
              Save
            </button>
          </div>
        )}

        {error && <p className="snapshots__error">{error}</p>}

        <div className="snapshots__list">
          {client && snapshots.length === 0 && (
            <p className="snapshots__note">No saved snapshots yet.</p>
          )}
          {snapshots.map((s) => (
            <div key={s.id} className="snapshots__row">
              <span className="snapshots__row-label">{s.label}</span>
              <span className="snapshots__row-time">
                {formatRelative(s.createdAt)}
              </span>
              {owned && (
                <button
                  type="button"
                  className="snapshots__restore"
                  disabled={busy}
                  onClick={() => void onRestore(s)}
                  title="Restore this snapshot"
                >
                  Restore
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Popover>
  );
}
