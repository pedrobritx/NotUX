import { useTextEditStore } from "./store/textEditStore";

const FONT_OPTIONS = [
  { label: "System", value: "-apple-system, system-ui, sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Roboto", value: "'Roboto', sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'SF Mono', 'Fira Code', monospace" },
];

const SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

/**
 * Mini formatting toolbar displayed above the text textarea.
 * Reads/writes formatting state from textEditStore.
 */
export function TextToolbar() {
  const session = useTextEditStore((s) => s.session);
  const setFormat = useTextEditStore((s) => s.setFormat);

  if (!session || session.mode === "sticky") return null;

  const bold = session.bold ?? false;
  const italic = session.italic ?? false;
  const underline = session.underline ?? false;
  const align = session.align ?? "left";

  return (
    <div className="text-toolbar" onPointerDown={(e) => e.stopPropagation()}>
      {/* Bold */}
      <button
        type="button"
        className={
          "text-toolbar__btn" + (bold ? " text-toolbar__btn--active" : "")
        }
        onClick={() => setFormat({ bold: !bold })}
        title="Bold"
        aria-label="Bold"
        aria-pressed={bold}
      >
        B
      </button>

      {/* Italic */}
      <button
        type="button"
        className={
          "text-toolbar__btn text-toolbar__btn--italic" +
          (italic ? " text-toolbar__btn--active" : "")
        }
        onClick={() => setFormat({ italic: !italic })}
        title="Italic"
        aria-label="Italic"
        aria-pressed={italic}
      >
        I
      </button>

      {/* Underline */}
      <button
        type="button"
        className={
          "text-toolbar__btn text-toolbar__btn--underline" +
          (underline ? " text-toolbar__btn--active" : "")
        }
        onClick={() => setFormat({ underline: !underline })}
        title="Underline"
        aria-label="Underline"
        aria-pressed={underline}
      >
        U
      </button>

      <span className="text-toolbar__divider" />

      {/* Alignment */}
      {(["left", "center", "right"] as const).map((a) => (
        <button
          key={a}
          type="button"
          className={
            "text-toolbar__btn" +
            (align === a ? " text-toolbar__btn--active" : "")
          }
          onClick={() => setFormat({ align: a })}
          title={`Align ${a}`}
          aria-label={`Align ${a}`}
          aria-pressed={align === a}
        >
          {a === "left" ? "⫷" : a === "center" ? "☰" : "⫸"}
        </button>
      ))}

      <span className="text-toolbar__divider" />

      {/* Font family */}
      <select
        className="text-toolbar__select"
        value={session.font}
        onChange={(e) => setFormat({ font: e.target.value } as any)}
        aria-label="Font family"
      >
        {FONT_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font size */}
      <select
        className="text-toolbar__select text-toolbar__select--size"
        value={session.size}
        onChange={(e) => setFormat({ size: Number(e.target.value) } as any)}
        aria-label="Font size"
      >
        {SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
