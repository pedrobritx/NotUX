import { useEffect, useRef } from "react";
import {
  GlassButton,
  GlassPanel,
  Instrument,
  Popover,
  Slider,
  Swatch,
} from "@notux/ui";
import type { ToolKind } from "@notux/types";
import {
  INSTRUMENT_IDS,
  INSTRUMENT_MAP,
  WIDTH_PRESETS,
  useAssetStore,
  useDockStore,
  useToolStore,
} from "@notux/canvas";
import { ColorPicker } from "./ColorPicker";
import { ThemeToggle } from "./ThemeToggle";

const DRAWING_TOOLS: ReadonlySet<ToolKind> = new Set([
  "pen",
  "highlighter",
  "eraser",
]);

// A wavy stroke sample for the width-preset buttons (Frame 2).
function WidthSquiggle({ width }: { width: number }) {
  const sw = Math.max(1.5, Math.min(11, width * 0.55));
  return (
    <svg width={30} height={30} viewBox="0 0 30 30" aria-hidden>
      <path
        d="M4 19 q 4 -11 7 0 t 7 0 t 7 -1"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </svg>
  );
}

const TRAY_TOOLS: { kind: ToolKind; glyph: string; label: string }[] = [
  { kind: "select", glyph: "↖", label: "Select" },
  { kind: "text", glyph: "T", label: "Text" },
  { kind: "rect", glyph: "▭", label: "Rectangle" },
  { kind: "ellipse", glyph: "◯", label: "Ellipse" },
  { kind: "line", glyph: "╱", label: "Line" },
  { kind: "arrow", glyph: "→", label: "Arrow" },
];

export function Dock() {
  const instruments = useDockStore((s) => s.instruments);
  const activeId = useDockStore((s) => s.activeInstrumentId);
  const trayOpen = useDockStore((s) => s.trayOpen);
  const widthPopoverOpen = useDockStore((s) => s.widthPopoverOpen);
  const colorPickerOpen = useDockStore((s) => s.colorPickerOpen);
  const selectInstrument = useDockStore((s) => s.selectInstrument);
  const setActiveWidth = useDockStore((s) => s.setActiveWidth);
  const setActiveOpacity = useDockStore((s) => s.setActiveOpacity);
  const setTrayOpen = useDockStore((s) => s.setTrayOpen);
  const setWidthPopoverOpen = useDockStore((s) => s.setWidthPopoverOpen);
  const setColorPickerOpen = useDockStore((s) => s.setColorPickerOpen);

  const tool = useToolStore((s) => s.tool);
  const canImport = useAssetStore((s) => s.canImport);

  const drawing = DRAWING_TOOLS.has(tool);
  const activeColor = instruments[activeId].color;

  const activeInstrRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLSpanElement>(null);
  const addBtnRef = useRef<HTMLSpanElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync toolStore with the default instrument once on mount so the canvas
  // starts drawing with the pen's ink/width rather than raw tool defaults.
  useEffect(() => {
    selectInstrument(useDockStore.getState().activeInstrumentId);
  }, [selectInstrument]);

  function onInstrumentClick(id: (typeof INSTRUMENT_IDS)[number]) {
    if (drawing && id === activeId) {
      setWidthPopoverOpen(!widthPopoverOpen);
    } else {
      selectInstrument(id);
    }
  }

  return (
    <>
      <GlassPanel className="dock" role="toolbar" aria-label="Drawing tools">
        {INSTRUMENT_IDS.map((id) => {
          const isActive = drawing && id === activeId;
          return (
            <button
              key={id}
              ref={isActive ? activeInstrRef : undefined}
              type="button"
              className={
                "dock__instrument" +
                (isActive ? " dock__instrument--active" : "") +
                (!drawing ? " dock__instrument--dimmed" : "")
              }
              onClick={() => onInstrumentClick(id)}
              title={id.charAt(0).toUpperCase() + id.slice(1)}
              aria-pressed={isActive}
            >
              <Instrument
                kind={id}
                color={instruments[id].color}
                selected={isActive}
                lifted={isActive}
                opacity={instruments[id].opacity}
              />
            </button>
          );
        })}

        <span className="dock__divider" />

        <span ref={colorBtnRef} className="dock__color">
          <Swatch
            rainbow
            color={activeColor}
            size={36}
            onClick={() => setColorPickerOpen(!colorPickerOpen)}
            title="Color"
            aria-label="Color picker"
          />
        </span>

        <span ref={addBtnRef} className="dock__add">
          <GlassButton
            round
            active={trayOpen || !drawing}
            onClick={() => setTrayOpen(!trayOpen)}
            aria-label="More tools"
            title="More tools"
          >
            ＋
          </GlassButton>
        </span>
      </GlassPanel>

      {/* Width + opacity popover for the active instrument (Frame 2). */}
      <Popover
        open={widthPopoverOpen && drawing}
        onClose={() => setWidthPopoverOpen(false)}
        anchorRef={activeInstrRef}
        placement="top"
        tail
      >
        <div className="width-presets">
          {WIDTH_PRESETS[activeId].map((w) => (
            <button
              key={w}
              type="button"
              className={
                "width-preset" +
                (instruments[activeId].width === w ? " width-preset--active" : "")
              }
              onClick={() => setActiveWidth(w)}
              aria-label={`Width ${w}`}
              aria-pressed={instruments[activeId].width === w}
            >
              <WidthSquiggle width={w} />
            </button>
          ))}
        </div>
        {activeId !== "eraser" && (
          <Slider
            value={instruments[activeId].opacity}
            onChange={setActiveOpacity}
            trackStyle="opacity"
            color={activeColor}
            aria-label="Opacity"
          />
        )}
      </Popover>

      {/* "+" tray: the non-drawing tools + import + theme toggle. */}
      <Popover
        open={trayOpen}
        onClose={() => setTrayOpen(false)}
        anchorRef={addBtnRef}
        placement="top"
        tail
      >
        <div className="tool-tray">
          {TRAY_TOOLS.map((t) => (
            <button
              key={t.kind}
              type="button"
              className={
                "tool-tray__btn" + (tool === t.kind ? " tool-tray__btn--active" : "")
              }
              onClick={() => {
                useToolStore.getState().setTool(t.kind);
                setTrayOpen(false);
              }}
              title={t.label}
              aria-label={t.label}
              aria-pressed={tool === t.kind}
            >
              {t.glyph}
            </button>
          ))}
          <div className="tool-tray__sep" />
          <button
            type="button"
            className="tool-tray__btn"
            onClick={() => fileRef.current?.click()}
            disabled={!canImport}
            title={canImport ? "Import image or PDF" : "Import requires Supabase"}
            aria-label="Import image or PDF"
          >
            ⬆
          </button>
          <ThemeToggle />
        </div>
      </Popover>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            void useAssetStore.getState().importAtCenter(files);
            setTrayOpen(false);
          }
          e.target.value = "";
        }}
      />

      <ColorPicker
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        anchorRef={colorBtnRef}
      />
    </>
  );
}
