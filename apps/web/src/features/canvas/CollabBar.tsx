import { useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GlassPanel, Icon, Popover } from "@notux/ui";
import {
  useAwareness,
  useFollowStore,
  useRemoteCursors,
  type RemoteCursor,
} from "@notux/canvas";
import { createShareLink, setBoardVisibility } from "../board/boardOwnership";
import type { Identity } from "./useIdentity";

interface Props {
  boardId: string;
  client: SupabaseClient | null;
  owned: boolean;
  isPublic: boolean;
  identity: Identity;
}

const MAX_AVATARS = 4;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function Avatar({
  name,
  color,
  avatarUrl,
  spotlight,
  onClick,
  title,
  self,
}: {
  name: string;
  color: string;
  avatarUrl: string | null;
  spotlight?: boolean;
  onClick?: () => void;
  title: string;
  self?: boolean;
}) {
  const cls =
    "collab-avatar" +
    (spotlight ? " collab-avatar--spotlight" : "") +
    (self ? " collab-avatar--self" : "");
  const body = avatarUrl ? (
    <img className="collab-avatar__img" src={avatarUrl} alt="" />
  ) : (
    initials(name)
  );
  if (!onClick) {
    return (
      <span className={cls} style={{ background: color }} title={title}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      style={{ background: color }}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {body}
    </button>
  );
}

// Top-right collaboration bar (FigJam-inspired): connected peers, spotlight
// presenting, and sharing. In local-only mode it reduces to the share button.
export function CollabBar({ boardId, client, owned, isPublic, identity }: Props) {
  const awareness = useAwareness();
  const peers = useRemoteCursors(awareness);
  const spotlighting = useFollowStore((s) => s.spotlighting);
  const setSpotlighting = useFollowStore((s) => s.setSpotlighting);
  const follow = useFollowStore((s) => s.follow);

  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [pub, setPub] = useState(isPublic);
  const [busy, setBusy] = useState(false);
  const shareBtnRef = useRef<HTMLButtonElement>(null);

  const shown = peers.slice(0, MAX_AVATARS);
  const overflow = peers.length - shown.length;

  function copyLink() {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1500);
    });
  }

  async function copyInvite() {
    if (!client) return;
    setBusy(true);
    const res = await createShareLink(client, boardId, "draw");
    setBusy(false);
    if ("url" in res) {
      await navigator.clipboard?.writeText(res.url);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1500);
    }
  }

  async function toggleVisibility() {
    if (!client) return;
    setBusy(true);
    const next = !pub;
    const res = await setBoardVisibility(client, boardId, next);
    if (res.ok) setPub(next);
    setBusy(false);
  }

  function peerTitle(p: RemoteCursor): string {
    if (p.spotlight) return `${p.name} is presenting — click to follow`;
    return p.hasView ? `Follow ${p.name}` : p.name;
  }

  return (
    <>
      <GlassPanel className="collab-bar" aria-label="Collaboration">
        {awareness && (
          <>
            <span className="collab-bar__avatars">
              {shown.map((p) => (
                <Avatar
                  key={p.clientID}
                  name={p.name}
                  color={p.color}
                  avatarUrl={p.avatarUrl}
                  spotlight={p.spotlight}
                  onClick={
                    p.hasView ? () => follow(p.clientID, "manual") : undefined
                  }
                  title={peerTitle(p)}
                />
              ))}
              {overflow > 0 && (
                <span
                  className="collab-avatar collab-avatar--overflow"
                  title={`${overflow} more`}
                >
                  +{overflow}
                </span>
              )}
              <Avatar
                name={identity.name}
                color={identity.color}
                avatarUrl={identity.avatarUrl}
                spotlight={spotlighting}
                title={`${identity.name} (you)`}
                self
              />
            </span>
            <button
              type="button"
              className={
                "collab-bar__btn" +
                (spotlighting ? " collab-bar__btn--active" : "")
              }
              onClick={() => setSpotlighting(!spotlighting)}
              aria-pressed={spotlighting}
              title={
                spotlighting
                  ? "Stop presenting"
                  : "Spotlight — others follow your view"
              }
              aria-label="Spotlight"
            >
              <Icon name="spotlight" size={18} />
            </button>
            <span className="collab-bar__divider" />
          </>
        )}
        <button
          ref={shareBtnRef}
          type="button"
          className="collab-bar__btn"
          onClick={() => setShareOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={shareOpen}
          title="Share"
          aria-label="Share"
        >
          <Icon name="share" size={18} />
        </button>
      </GlassPanel>

      <Popover
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        anchorRef={shareBtnRef}
        placement="bottom"
        className="menu-popover"
      >
        <div className="menu" style={{ width: 230 }}>
          <div className="menu__section-title">Share</div>
          <button type="button" className="menu__item" onClick={copyLink}>
            <span className="menu__item-icon">
              <Icon name={linkCopied ? "check" : "link"} size={18} />
            </span>
            <span className="menu__item-label">
              {linkCopied ? "Link copied" : "Copy link"}
            </span>
          </button>
          {client && owned && (
            <button
              type="button"
              className="menu__item"
              disabled={busy}
              onClick={() => void copyInvite()}
            >
              <span className="menu__item-icon">
                <Icon name={inviteCopied ? "check" : "link"} size={18} />
              </span>
              <span className="menu__item-label">
                {inviteCopied ? "Invite copied" : "Invite to edit"}
              </span>
              <span className="menu__item-shortcut">expires 7d</span>
            </button>
          )}
          {client && owned && (
            <button
              type="button"
              className="menu__item"
              disabled={busy}
              onClick={() => void toggleVisibility()}
            >
              <span className="menu__item-icon">
                <Icon name={pub ? "unlock" : "lock"} size={18} />
              </span>
              <span className="menu__item-label">
                {pub ? "Shared — anyone with the link" : "Private — only you"}
              </span>
              <span className="menu__item-shortcut">
                {pub ? "Make private" : "Share"}
              </span>
            </button>
          )}
        </div>
      </Popover>
    </>
  );
}
