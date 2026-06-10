import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { setBoardVisibility } from "./boardOwnership";

interface Props {
  client: SupabaseClient | null;
  boardId: string;
  owned: boolean;
  isPublic: boolean;
}

// Compact ownership/sharing chip shown on a board. Only the owner can flip a
// board between private (annotations visible only to them) and shared (anyone
// with the link can collaborate in realtime). Hidden entirely in local-only or
// signed-out contexts, where there is no ownership to express.
export function BoardAccessIndicator({ client, boardId, owned, isPublic }: Props) {
  const [pub, setPub] = useState(isPublic);
  const [busy, setBusy] = useState(false);

  if (!client || !owned) return null;

  async function toggle() {
    setBusy(true);
    const next = !pub;
    const res = await setBoardVisibility(client, boardId, next);
    if (res.ok) setPub(next);
    setBusy(false);
  }

  return (
    <div className="board-access">
      <span className="board-access__label">
        {pub ? "🔗 Shared" : "🔒 Private"}
      </span>
      <button
        className="board-access__toggle"
        onClick={() => void toggle()}
        disabled={busy}
        title={pub ? "Make private (owner only)" : "Share — anyone with the link can edit"}
      >
        {pub ? "Make private" : "Share"}
      </button>
    </div>
  );
}
