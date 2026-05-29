import type { ToolKind } from "@notux/types";
import { useToolStore } from "@notux/canvas";
import { COLORS, SIZES } from "./palette";

interface ToolDef {
  kind: ToolKind;
  label: string;
  glyph: string;
}

const TOOLS: ToolDef[] = [
  { kind: "select", label: "Select", glyph: "↖" },
  { kind: "pen", label: "Pen", glyph: "✎" },
  { kind: "highlighter", label: "Highlighter", glyph: "▮" },
  { kind: "eraser", label: "Eraser", glyph: "⌫" },
  { kind: "rect", label: "Rectangle", glyph: "▭" },
  { kind: "ellipse", label: "Ellipse", glyph: "◯" },
  { kind: "line", label: "Line", glyph: "╱" },
  { kind: "arrow", label: "Arrow", glyph: "→" },
  { kind: "text", label: "Text", glyph: "T" },
];

// Temporary palette — the real Liquid Glass dock lands in M7.
export function ToolPalette() {
  const tool = useToolStore((s) => s.tool);
  const options = useToolStore((s) => s.options);
  const setTool = useToolStore((s) => s.setTool);
  const setColor = useToolStore((s) => s.setColor);
  const setSize = useToolStore((s) => s.setSize);

  return (
    <div className="tool-palette" role="toolbar" aria-label="Drawing tools">
      <div className="tool-palette__row">
        {TOOLS.map((t) => (
          <button
            key={t.kind}
            type="button"
            className={
              "tool-palette__chip" +
              (tool === t.kind ? " tool-palette__chip--active" : "")
            }
            onClick={() => setTool(t.kind)}
            title={t.label}
            aria-pressed={tool === t.kind}
          >
            <span aria-hidden>{t.glyph}</span>
          </button>
        ))}
      </div>
      <div className="tool-palette__row tool-palette__row--swatches">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={
              "tool-palette__swatch" +
              (options.color === c ? " tool-palette__swatch--active" : "")
            }
            style={{ background: c }}
            onClick={() => setColor(c)}
            title={c}
            aria-label={`Color ${c}`}
            aria-pressed={options.color === c}
          />
        ))}
      </div>
      <div className="tool-palette__row tool-palette__row--sizes">
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            className={
              "tool-palette__size" +
              (options.size === s ? " tool-palette__size--active" : "")
            }
            onClick={() => setSize(s)}
            title={`${s}px`}
            aria-pressed={options.size === s}
          >
            <span style={{ width: s + 2, height: s + 2 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
