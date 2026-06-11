import { useAwareness, useFollowStore, useRemoteCursors } from "@notux/canvas";

// "Following <name> — tap to stop" pill shown while follow mode is active.
export function FollowPill() {
  const awareness = useAwareness();
  const peers = useRemoteCursors(awareness);
  const followingClientID = useFollowStore((s) => s.followingClientID);
  const stopFollowing = useFollowStore((s) => s.stopFollowing);

  if (followingClientID === null) return null;
  const peer = peers.find((p) => p.clientID === followingClientID);
  if (!peer) return null;

  return (
    <button
      type="button"
      className="follow-pill"
      role="status"
      style={{ borderColor: peer.color }}
      onClick={() => stopFollowing(true)}
      title="Stop following"
    >
      <span
        className="follow-pill__dot"
        style={{ background: peer.color }}
        aria-hidden
      />
      Following {peer.name} — tap to stop
    </button>
  );
}
