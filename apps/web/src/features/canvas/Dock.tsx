import { useEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import {
  GlassPanel,
  Icon,
  Popover,
  Segmented,
  Slider,
  Swatch,
  type IconName,
} from "@notux/ui";
import type { ToolKind } from "@notux/types";
import {
  PEN_STYLES,
  WIDTH_PRESETS,
  useAssetStore,
  useDockStore,
  useToolStore,
  type InstrumentId,
} from "@notux/canvas";
import { ColorPicker } from "./ColorPicker";
import { EmbedDialog } from "./EmbedDialog";

// Tools that count as "a shape" for the Shapes button's active state.
const SHAPE_TOOLS: ReadonlySet<ToolKind> = new Set([
  "rect",
  "ellipse",
  "polygon",
  "line",
  "arrow",
]);

const PEN_STYLE_LABELS: Record<InstrumentId, string> = {
  pen: "Pen",
  fineliner: "Fine",
  pencil: "Pencil",
  marker: "Marker",
  highlighter: "Highlighter",
  eraser: "Eraser",
};

const STICKY_COLORS = ["#ffe066", "#ff9eb1", "#9ad0ff", "#b9f6c5", "#d8b4fe"];

interface ShapeItem {
  tool: ToolKind;
  variant?: string;
  icon: IconName;
  label: string;
}

const SHAPE_ITEMS: ShapeItem[] = [
  { tool: "rect", icon: "square", label: "Rectangle" },
  { tool: "rect", variant: "rounded", icon: "rounded", label: "Rounded rectangle" },
  { tool: "ellipse", icon: "circle", label: "Ellipse" },
  { tool: "polygon", variant: "diamond", icon: "diamond", label: "Diamond" },
  { tool: "polygon", variant: "triangle", icon: "triangle", label: "Triangle" },
  { tool: "line", icon: "line", label: "Line" },
  { tool: "arrow", variant: "straight", icon: "arrow", label: "Arrow" },
  { tool: "arrow", variant: "curved", icon: "arrow-curved", label: "Curved arrow" },
  { tool: "arrow", variant: "elbow", icon: "arrow-elbow", label: "Elbow arrow" },
];

// A wavy stroke sample for the width-preset buttons.
function WidthSquiggle({ width }: { width: number }) {
  const sw = Math.max(1.5, Math.min(11, width * 0.55));
  return (
    <svg width={28} height={28} viewBox="0 0 30 30" aria-hidden>
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

interface ToolButtonProps {
  icon: IconName;
  label: string;
  active?: boolean;
  filled?: boolean;
  onClick(): void;
  innerRef?: Ref<HTMLButtonElement>;
  chevron?: boolean;
}

function ToolButton({
  icon,
  label,
  active,
  filled,
  onClick,
  innerRef,
  chevron,
}: ToolButtonProps) {
  return (
    <button
      ref={innerRef}
      type="button"
      className={"dock__tool" + (active ? " dock__tool--active" : "")}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon name={icon} filled={filled} />
      {chevron && <Icon name="chevron-down" size={12} className="dock__chevron" />}
    </button>
  );
}

export function Dock() {
  const instruments = useDockStore((s) => s.instruments);
  const activeId = useDockStore((s) => s.activeInstrumentId);
  const penStyle = useDockStore((s) => s.penStyle);
  const collapsed = useDockStore((s) => s.collapsed);
  const position = useDockStore((s) => s.position);
  const penPopoverOpen = useDockStore((s) => s.penPopoverOpen);
  const eraserPopoverOpen = useDockStore((s) => s.eraserPopoverOpen);
  const shapesFlyoutOpen = useDockStore((s) => s.shapesFlyoutOpen);
  const stickyPopoverOpen = useDockStore((s) => s.stickyPopoverOpen);
  const colorPickerOpen = useDockStore((s) => s.colorPickerOpen);
  const importPopoverOpen = useDockStore((s) => s.importPopoverOpen);

  const selectInstrument = useDockStore((s) => s.selectInstrument);
  const setPenStyle = useDockStore((s) => s.setPenStyle);
  const setActiveWidth = useDockStore((s) => s.setActiveWidth);
  const setActiveOpacity = useDockStore((s) => s.setActiveOpacity);
  const setCollapsed = useDockStore((s) => s.setCollapsed);
  const setPosition = useDockStore((s) => s.setPosition);
  const setPenPopoverOpen = useDockStore((s) => s.setPenPopoverOpen);
  const setEraserPopoverOpen = useDockStore((s) => s.setEraserPopoverOpen);
  const setShapesFlyoutOpen = useDockStore((s) => s.setShapesFlyoutOpen);
  const setStickyPopoverOpen = useDockStore((s) => s.setStickyPopoverOpen);
  const setColorPickerOpen = useDockStore((s) => s.setColorPickerOpen);
  const setImportPopoverOpen = useDockStore((s) => s.setImportPopoverOpen);
  const closeAllPopovers = useDockStore((s) => s.closeAllPopovers);

  const canImport = useAssetStore((s) => s.canImport);
  const [embedOpen, setEmbedOpen] = useState(false);

  const tool = useToolStore((s) => s.tool);
  const eraserMode = useToolStore((s) => s.options.eraserMode);
  const stickyColor = useToolStore((s) => s.options.stickyColor);
  const setOptions = useToolStore((s) => s.setOptions);

  const activeColor = instruments[activeId].color;

  const penBtnRef = useRef<HTMLButtonElement>(null);
  const highlighterBtnRef = useRef<HTMLButtonElement>(null);
  const eraserBtnRef = useRef<HTMLButtonElement>(null);
  const shapesBtnRef = useRef<HTMLButtonElement>(null);
  const stickyBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLSpanElement>(null);
  const importBtnRef = useRef<HTMLButtonElement>(null);
  const collapsedRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // The brush popover (width + opacity, plus pen styles) anchors to whichever
  // brush tool is active.
  const brushAnchor = tool === "highlighter" ? highlighterBtnRef : penBtnRef;
  const isPenFamily = activeId !== "highlighter" && activeId !== "eraser";

  // Sync the default instrument into the tool store once on mount.
  useEffect(() => {
    selectInstrument(useDockStore.getState().activeInstrumentId);
  }, [selectInstrument]);

  function pickShape(item: ShapeItem) {
    useToolStore.getState().setTool(item.tool);
    setOptions({ shapeVariant: item.variant });
    closeAllPopovers();
  }

  // ----- dragging the dock around -----------------------------------------
  function onGripPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const dock = (e.currentTarget as HTMLElement).closest(".dock") as HTMLElement;
    if (!dock) return;
    const rect = dock.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = position?.x ?? rect.left;
    const baseY = position?.y ?? rect.top;
    const w = rect.width;
    const h = rect.height;
    const move = (ev: PointerEvent) => {
      const x = Math.max(8, Math.min(baseX + (ev.clientX - startX), window.innerWidth - w - 8));
      const y = Math.max(8, Math.min(baseY + (ev.clientY - startY), window.innerHeight - h - 8));
      setPosition({ x, y });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // When a custom position is set, override the centered default.
  const dockStyle: CSSProperties | undefined = position
    ? { left: position.x, top: position.y, bottom: "auto", transform: "none" }
    : undefined;

  // Whether the dock currently sits in the top half of the viewport (the
  // default). Drives collapse-chevron direction; popovers flip on their own.
  const inTopHalf =
    position === null ||
    (typeof window !== "undefined" && position.y < window.innerHeight / 2);

  function onImportFiles(files: FileList | null, input: HTMLInputElement) {
    if (files && files.length > 0) {
      void useAssetStore.getState().importAtCenter(files);
    }
    input.value = "";
  }

  function importRow(input: HTMLInputElement | null) {
    setImportPopoverOpen(false);
    input?.click();
  }

  if (collapsed) {
    return (
      <button
        ref={collapsedRef}
        type="button"
        className="dock-collapsed"
        style={dockStyle}
        onClick={() => setCollapsed(false)}
        title="Show tools"
        aria-label="Show tools"
      >
        <Icon name={inTopHalf ? "chevron-down" : "chevron-up"} />
      </button>
    );
  }

  return (
    <>
      <GlassPanel
        className="dock"
        role="toolbar"
        aria-label="Tools"
        style={dockStyle}
      >
        <span
          className="dock__grip"
          onPointerDown={onGripPointerDown}
          onDoubleClick={() => setPosition(null)}
          title="Drag to move · double-click to re-center"
          role="separator"
          aria-label="Move toolbar"
        >
          <Icon name="grip" size={18} />
        </span>

        <ToolButton
          icon="hand"
          label="Hand (pan)"
          active={tool === "hand"}
          onClick={() => {
            useToolStore.getState().setTool("hand");
            closeAllPopovers();
          }}
        />
        <ToolButton
          icon="select"
          label="Select"
          active={tool === "select"}
          onClick={() => {
            useToolStore.getState().setTool("select");
            closeAllPopovers();
          }}
        />

        <span className="dock__divider" />

        <ToolButton
          innerRef={penBtnRef}
          icon="pen"
          label="Pen"
          active={tool === "pen"}
          onClick={() => {
            if (tool === "pen") setPenPopoverOpen(!penPopoverOpen);
            else selectInstrument(useDockStore.getState().penStyle);
          }}
        />
        <ToolButton
          innerRef={highlighterBtnRef}
          icon="highlighter"
          label="Highlighter"
          active={tool === "highlighter"}
          onClick={() => {
            if (tool === "highlighter") setPenPopoverOpen(!penPopoverOpen);
            else selectInstrument("highlighter");
          }}
        />
        <ToolButton
          innerRef={eraserBtnRef}
          icon="eraser"
          label="Eraser"
          active={tool === "eraser"}
          onClick={() => {
            if (tool === "eraser") setEraserPopoverOpen(!eraserPopoverOpen);
            else selectInstrument("eraser");
          }}
        />

        <span className="dock__divider" />

        <ToolButton
          icon="text"
          label="Text"
          active={tool === "text"}
          onClick={() => {
            useToolStore.getState().setTool("text");
            closeAllPopovers();
          }}
        />
        <ToolButton
          innerRef={stickyBtnRef}
          icon="sticky"
          label="Sticky note"
          active={tool === "sticky"}
          onClick={() => {
            if (tool === "sticky") setStickyPopoverOpen(!stickyPopoverOpen);
            else {
              useToolStore.getState().setTool("sticky");
              setOptions({ stickyColor: useToolStore.getState().options.stickyColor });
              closeAllPopovers();
            }
          }}
        />
        <ToolButton
          innerRef={shapesBtnRef}
          icon="shapes"
          label="Shapes"
          active={SHAPE_TOOLS.has(tool)}
          chevron
          onClick={() => setShapesFlyoutOpen(!shapesFlyoutOpen)}
        />

        <span className="dock__divider" />

        <span ref={colorBtnRef} className="dock__color">
          <Swatch
            rainbow
            color={activeColor}
            size={32}
            onClick={() => setColorPickerOpen(!colorPickerOpen)}
            title="Color"
            aria-label="Color picker"
          />
        </span>

        <ToolButton
          innerRef={importBtnRef}
          icon="media"
          label="Insert media"
          active={importPopoverOpen}
          chevron
          onClick={() => setImportPopoverOpen(!importPopoverOpen)}
        />

        <span className="dock__divider" />

        <button
          type="button"
          className="dock__chrome-btn"
          onClick={() => setCollapsed(true)}
          title="Hide tools"
          aria-label="Hide tools"
        >
          <Icon name={inTopHalf ? "chevron-up" : "chevron-down"} size={18} />
        </button>
      </GlassPanel>

      {/* Brush popover: pen styles (pen family) + width + opacity. */}
      <Popover
        open={penPopoverOpen && (tool === "pen" || tool === "highlighter")}
        onClose={() => setPenPopoverOpen(false)}
        anchorRef={brushAnchor}
        placement="auto"
        tail
      >
        {isPenFamily && (
          <div className="brush-styles">
            {PEN_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                className={
                  "brush-style" + (penStyle === style ? " brush-style--active" : "")
                }
                onClick={() => setPenStyle(style)}
                aria-pressed={penStyle === style}
              >
                {PEN_STYLE_LABELS[style]}
              </button>
            ))}
          </div>
        )}
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
        <Slider
          value={instruments[activeId].opacity}
          onChange={setActiveOpacity}
          trackStyle="opacity"
          color={activeColor}
          aria-label="Opacity"
        />
      </Popover>

      {/* Eraser popover: mode + size. */}
      <Popover
        open={eraserPopoverOpen && tool === "eraser"}
        onClose={() => setEraserPopoverOpen(false)}
        anchorRef={eraserBtnRef}
        placement="auto"
        tail
      >
        <div className="eraser-popover">
          <Segmented<"Object" | "Area">
            options={["Object", "Area"]}
            value={eraserMode === "area" ? "Area" : "Object"}
            onChange={(v) => setOptions({ eraserMode: v === "Area" ? "area" : "object" })}
          />
          <div className="width-presets">
            {WIDTH_PRESETS.eraser.map((w) => (
              <button
                key={w}
                type="button"
                className={
                  "width-preset" +
                  (instruments.eraser.width === w ? " width-preset--active" : "")
                }
                onClick={() => setActiveWidth(w)}
                aria-label={`Eraser ${w}`}
                aria-pressed={instruments.eraser.width === w}
              >
                <span
                  className="eraser-dot"
                  style={{ width: Math.min(28, w / 2), height: Math.min(28, w / 2) }}
                />
              </button>
            ))}
          </div>
        </div>
      </Popover>

      {/* Shapes flyout. */}
      <Popover
        open={shapesFlyoutOpen}
        onClose={() => setShapesFlyoutOpen(false)}
        anchorRef={shapesBtnRef}
        placement="auto"
        tail
      >
        <div className="shapes-flyout">
          {SHAPE_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="shape-item"
              onClick={() => pickShape(item)}
              title={item.label}
              aria-label={item.label}
            >
              <Icon name={item.icon} size={24} />
            </button>
          ))}
        </div>
      </Popover>

      {/* Sticky color popover. */}
      <Popover
        open={stickyPopoverOpen && tool === "sticky"}
        onClose={() => setStickyPopoverOpen(false)}
        anchorRef={stickyBtnRef}
        placement="auto"
        tail
      >
        <div className="sticky-colors">
          {STICKY_COLORS.map((c) => (
            <Swatch
              key={c}
              color={c}
              size={30}
              selected={c.toLowerCase() === stickyColor.toLowerCase()}
              onClick={() => setOptions({ stickyColor: c })}
              aria-label={`Sticky color ${c}`}
            />
          ))}
        </div>
      </Popover>

      <ColorPicker
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        anchorRef={colorBtnRef}
      />

      {/* Import / embed menu. */}
      <Popover
        open={importPopoverOpen}
        onClose={() => setImportPopoverOpen(false)}
        anchorRef={importBtnRef}
        placement="auto"
        tail
        className="menu-popover"
      >
        <div className="menu" role="menu" style={{ width: 220 }}>
          <div className="menu__section-title">Import</div>
          <MediaMenuItem
            icon="photo"
            label="Image…"
            disabled={!canImport}
            onClick={() => importRow(imageInputRef.current)}
          />
          <MediaMenuItem
            icon="file"
            label="PDF…"
            disabled={!canImport}
            onClick={() => importRow(pdfInputRef.current)}
          />
          <MediaMenuItem
            icon="audio"
            label="Audio…"
            disabled={!canImport}
            onClick={() => importRow(audioInputRef.current)}
          />
          <div className="menu__section-title" style={{ marginTop: 6 }}>
            Embed
          </div>
          <MediaMenuItem
            icon="video"
            label="YouTube video…"
            disabled={!canImport}
            onClick={() => {
              setImportPopoverOpen(false);
              setEmbedOpen(true);
            }}
          />
          <MediaMenuItem
            icon="folder"
            label="Google Drive…"
            disabled={!canImport}
            onClick={() => {
              setImportPopoverOpen(false);
              setEmbedOpen(true);
            }}
          />
        </div>
      </Popover>

      <EmbedDialog
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        anchorRef={importBtnRef}
        placement="auto"
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => onImportFiles(e.target.files, e.target)}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => onImportFiles(e.target.files, e.target)}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        multiple
        style={{ display: "none" }}
        onChange={(e) => onImportFiles(e.target.files, e.target)}
      />
    </>
  );
}

interface MediaMenuItemProps {
  icon: IconName;
  label: string;
  disabled?: boolean;
  onClick(): void;
}

function MediaMenuItem({ icon, label, disabled, onClick }: MediaMenuItemProps) {
  return (
    <button
      type="button"
      className="menu__item"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="menu__item-icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="menu__item-label">{label}</span>
    </button>
  );
}
