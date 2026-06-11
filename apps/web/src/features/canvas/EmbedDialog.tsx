import { useState, type RefObject } from "react";
import { Popover } from "@notux/ui";
import { useAssetStore } from "@notux/canvas";

interface Props {
  open: boolean;
  onClose(): void;
  anchorRef: RefObject<HTMLElement>;
  placement?: "top" | "bottom" | "auto";
}

/** Embed-by-URL dialog (YouTube / Google Drive), shared by the app menu and
 *  the dock's import button. */
export function EmbedDialog({ open, onClose, anchorRef, placement = "bottom" }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const err = useAssetStore.getState().insertEmbed(url);
    if (err) {
      setError(err);
      return;
    }
    setUrl("");
    setError(null);
    onClose();
  }

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorRef={anchorRef}
      placement={placement}
      className="menu-popover"
    >
      <div className="embed-dialog">
        <div className="menu__section-title">Embed a link</div>
        <input
          type="url"
          className="embed-dialog__input"
          value={url}
          autoFocus
          placeholder="Paste a YouTube or Google Drive URL"
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {error && <div className="embed-dialog__error">{error}</div>}
        <div className="embed-dialog__hint">
          Google Drive files must be shared “anyone with the link”.
        </div>
        <button
          type="button"
          className="menu__item embed-dialog__submit"
          onClick={submit}
        >
          <span className="menu__item-label">Add to board</span>
        </button>
      </div>
    </Popover>
  );
}
