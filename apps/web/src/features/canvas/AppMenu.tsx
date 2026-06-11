import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GlassPanel, Icon, Popover, useTheme, type IconName } from "@notux/ui";
import {
  BACKGROUND_PRESETS,
  exportBoardToPdf,
  useAssetStore,
  useCommandStore,
  usePageStore,
  usePrefsStore,
  useSettingsStore,
  useShapeStore,
  useToolStore,
} from "@notux/canvas";
import type { BackgroundPresetId, GridStyle } from "@notux/sync";
import { EmbedDialog } from "./EmbedDialog";
import { SnapshotsPanel } from "./SnapshotsPanel";

interface AppMenuProps {
  boardId: string;
  client: SupabaseClient | null;
  owned: boolean;
}

interface MenuItemProps {
  icon?: IconName;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  /** Renders a trailing checkmark (menu toggle rows). */
  checked?: boolean;
  onClick(): void;
}

const GRID_OPTIONS: Array<{ id: GridStyle; icon: IconName; label: string }> = [
  { id: "dots", icon: "grid-dots", label: "Dotted" },
  { id: "lines", icon: "grid-lines", label: "Squared" },
  { id: "ruled", icon: "grid-ruled", label: "Ruled" },
  { id: "plain", icon: "grid-plain", label: "Plain" },
];

function MenuItem({ icon, label, shortcut, disabled, checked, onClick }: MenuItemProps) {
  return (
    <button
      type="button"
      className="menu__item"
      disabled={disabled}
      role={checked !== undefined ? "menuitemcheckbox" : undefined}
      aria-checked={checked}
      onClick={onClick}
    >
      <span className="menu__item-icon">{icon && <Icon name={icon} size={18} />}</span>
      <span className="menu__item-label">{label}</span>
      {shortcut && <span className="menu__item-shortcut">{shortcut}</span>}
      {checked && <Icon name="check" size={14} className="menu__item-check" />}
    </button>
  );
}

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="menu__section">
      <div className="menu__section-title">{title}</div>
      {children}
    </div>
  );
}

export function AppMenu({ boardId, client, owned }: AppMenuProps) {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();

  const pages = usePageStore((s) => s.pages);
  const activePageId = usePageStore((s) => s.activePageId);
  usePageStore((s) => s.revision); // re-render on remote page changes
  const setActivePage = usePageStore((s) => s.setActivePage);
  const addPage = usePageStore((s) => s.addPage);
  const deletePage = usePageStore((s) => s.deletePage);
  const renamePage = usePageStore((s) => s.renamePage);
  const reorderPage = usePageStore((s) => s.reorderPage);

  const canImport = useAssetStore((s) => s.canImport);
  const canUndo = useCommandStore((s) => s.canUndo);
  const canRedo = useCommandStore((s) => s.canRedo);
  const selection = useToolStore((s) => s.selection);
  useShapeStore((s) => s.revision); // keep Object actions in sync

  const [menuOpen, setMenuOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const background = useSettingsStore((s) => s.background);
  const grid = useSettingsStore((s) => s.grid);
  const setBackground = useSettingsStore((s) => s.setBackground);
  const setGrid = useSettingsStore((s) => s.setGrid);
  const showRemoteCursors = usePrefsStore((s) => s.showRemoteCursors);
  const setShowRemoteCursors = usePrefsStore((s) => s.setShowRemoteCursors);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const pagesBtnRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeTitle =
    pages.find((p) => p.id === activePageId)?.title ?? "Untitled";
  const hasSelection = selection.size > 0;

  function run(fn: () => void) {
    fn();
    setMenuOpen(false);
  }

  // ----- Object / Edit actions on the current selection -------------------
  function selectedIds(): string[] {
    return Array.from(useToolStore.getState().selection);
  }
  function zOrder(op: "front" | "forward" | "backward" | "back") {
    const ids = selectedIds();
    if (ids.length === 0) return;
    const store = useShapeStore.getState();
    if (op === "front") store.bringToFront(activePageId, ids);
    else if (op === "forward") store.bringForward(activePageId, ids);
    else if (op === "backward") store.sendBackward(activePageId, ids);
    else store.sendToBack(activePageId, ids);
  }
  function toggleLock() {
    const ids = selectedIds();
    if (ids.length === 0) return;
    const store = useShapeStore.getState();
    const allLocked = ids.every((id) => store.getShape(activePageId, id)?.locked);
    store.transact(() => ids.forEach((id) => store.setLocked(activePageId, id, !allLocked)));
  }
  function deleteSelection() {
    const ids = selectedIds();
    if (ids.length === 0) return;
    const store = useShapeStore.getState();
    store.transact(() => ids.forEach((id) => store.deleteShape(activePageId, id)));
    useToolStore.getState().clearSelection();
  }
  function selectAll() {
    const ids = useShapeStore
      .getState()
      .listShapes(activePageId)
      .map((s) => s.id);
    useToolStore.getState().setTool("select");
    useToolStore.getState().setSelection(ids);
  }

  async function runExport(scope: "current" | "all") {
    setExportOpen(false);
    const all = usePageStore.getState().pages;
    const active = usePageStore.getState().activePageId;
    const pages = scope === "current" ? all.filter((p) => p.id === active) : all;
    setExporting(true);
    try {
      await exportBoardToPdf({ pages, filename: "board.pdf" });
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setExporting(false);
    }
  }

  function copyShareLink() {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1500);
    });
  }

  function commitDrop() {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      reorderPage(dragIdx, overIdx);
    }
    setDragIdx(null);
    setOverIdx(null);
  }

  // Commands (undo/redo/zoom) are registered by CanvasStage after mount, so
  // fetch them fresh at click time rather than capturing a stale snapshot.
  const cmd = () => useCommandStore.getState();

  return (
    <>
      <GlassPanel className="app-menu" aria-label="Menu">
        <button
          ref={menuBtnRef}
          type="button"
          className="app-menu__btn app-menu__btn--menu"
          onClick={() => setMenuOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Menu"
        >
          <Icon name="menu" size={20} />
          <Icon name="chevron-down" size={12} className="app-menu__chevron" />
        </button>
        <button
          type="button"
          className="app-menu__title"
          onClick={() => setPagesOpen((o) => !o)}
          title="Pages"
        >
          {activeTitle}
        </button>
        <button
          ref={pagesBtnRef}
          type="button"
          className="app-menu__btn"
          onClick={() => setPagesOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={pagesOpen}
          title="Pages"
        >
          <Icon name="pages" size={18} />
        </button>
      </GlassPanel>

      {/* Main menu dropdown */}
      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchorRef={menuBtnRef}
        placement="bottom"
        className="menu-popover"
      >
        <div className="menu">
          <MenuItem
            icon="chevron-left"
            label="Back to files"
            onClick={() => run(() => navigate("/"))}
          />

          <MenuSection title="File">
            <MenuItem
              icon="plus"
              label="New page"
              onClick={() => run(() => setActivePage(addPage()))}
            />
            <MenuItem
              icon="upload"
              label="Import image, PDF or audio"
              disabled={!canImport}
              onClick={() => run(() => fileRef.current?.click())}
            />
            <MenuItem
              icon="plus"
              label="Embed YouTube / Google Drive…"
              disabled={!canImport}
              onClick={() => {
                setMenuOpen(false);
                setEmbedOpen(true);
              }}
            />
            <MenuItem
              icon="download"
              label={exporting ? "Exporting…" : "Export as PDF…"}
              disabled={exporting}
              onClick={() => {
                setMenuOpen(false);
                setExportOpen(true);
              }}
            />
            <MenuItem
              icon={linkCopied ? "check" : "link"}
              label={linkCopied ? "Link copied" : "Copy share link"}
              onClick={copyShareLink}
            />
            <MenuItem
              icon="history"
              label="Snapshots…"
              onClick={() => {
                setMenuOpen(false);
                setSnapshotsOpen(true);
              }}
            />
          </MenuSection>

          <MenuSection title="Edit">
            <MenuItem
              icon="undo"
              label="Undo"
              shortcut="⌘Z"
              disabled={!canUndo}
              onClick={() => run(() => cmd().undo?.())}
            />
            <MenuItem
              icon="redo"
              label="Redo"
              shortcut="⌘⇧Z"
              disabled={!canRedo}
              onClick={() => run(() => cmd().redo?.())}
            />
            <MenuItem
              label="Select all"
              shortcut="⌘A"
              onClick={() => run(selectAll)}
            />
            <MenuItem
              icon="trash"
              label="Delete selection"
              disabled={!hasSelection}
              onClick={() => run(deleteSelection)}
            />
          </MenuSection>

          <MenuSection title="View">
            <MenuItem icon="zoom-in" label="Zoom in" onClick={() => run(() => cmd().zoomIn?.())} />
            <MenuItem icon="zoom-out" label="Zoom out" onClick={() => run(() => cmd().zoomOut?.())} />
            <MenuItem icon="zoom-reset" label="Reset zoom" onClick={() => run(() => cmd().zoomReset?.())} />
            <MenuItem
              icon={theme === "dark" ? "sun" : "moon"}
              label={theme === "dark" ? "Light mode" : "Dark mode"}
              onClick={() => run(toggleTheme)}
            />
            <div className="menu__row" role="group" aria-label="Background">
              <span className="menu__row-label">Background</span>
              <span className="menu__row-options">
                {(Object.keys(BACKGROUND_PRESETS) as BackgroundPresetId[]).map(
                  (id) => (
                    <button
                      key={id}
                      type="button"
                      className={
                        "menu__bg-swatch" +
                        (background === id ? " menu__bg-swatch--active" : "")
                      }
                      style={{ background: BACKGROUND_PRESETS[id][theme] }}
                      onClick={() => setBackground(id)}
                      title={BACKGROUND_PRESETS[id].label}
                      aria-label={BACKGROUND_PRESETS[id].label}
                      aria-pressed={background === id}
                    />
                  ),
                )}
              </span>
            </div>
            <div className="menu__row" role="group" aria-label="Grid">
              <span className="menu__row-label">Grid</span>
              <span className="menu__row-options menu__grid-seg">
                {GRID_OPTIONS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={
                      "menu__grid-btn" +
                      (grid === g.id ? " menu__grid-btn--active" : "")
                    }
                    onClick={() => setGrid(g.id)}
                    title={g.label}
                    aria-label={`${g.label} grid`}
                    aria-pressed={grid === g.id}
                  >
                    <Icon name={g.icon} size={18} />
                  </button>
                ))}
              </span>
            </div>
            <MenuItem
              icon="cursors"
              label="Show collaborator cursors"
              checked={showRemoteCursors}
              onClick={() => setShowRemoteCursors(!showRemoteCursors)}
            />
          </MenuSection>

          <MenuSection title="Arrange">
            <MenuItem icon="to-front" label="Bring to front" disabled={!hasSelection} onClick={() => run(() => zOrder("front"))} />
            <MenuItem icon="forward" label="Bring forward" disabled={!hasSelection} onClick={() => run(() => zOrder("forward"))} />
            <MenuItem icon="backward" label="Send backward" disabled={!hasSelection} onClick={() => run(() => zOrder("backward"))} />
            <MenuItem icon="to-back" label="Send to back" disabled={!hasSelection} onClick={() => run(() => zOrder("back"))} />
            <MenuItem icon="lock" label="Lock / unlock" disabled={!hasSelection} onClick={() => run(toggleLock)} />
          </MenuSection>
        </div>
      </Popover>

      {/* Pages list popover */}
      <Popover
        open={pagesOpen}
        onClose={() => setPagesOpen(false)}
        anchorRef={pagesBtnRef}
        placement="bottom"
      >
        <div className="page-tray">
          <div className="page-tray__head">
            <span>Pages</span>
            <button
              type="button"
              className="page-tray__add"
              onClick={() => setActivePage(addPage())}
              title="Add page"
              aria-label="Add page"
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
          {pages.map((p, i) => (
            <div
              key={p.id}
              className={
                "page-tray__item" +
                (p.id === activePageId ? " page-tray__item--active" : "") +
                (overIdx === i && dragIdx !== null ? " page-tray__item--dragover" : "")
              }
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIdx(i);
              }}
              onDrop={commitDrop}
              onDragEnd={() => {
                setDragIdx(null);
                setOverIdx(null);
              }}
              onClick={() => setActivePage(p.id)}
            >
              <span className="page-tray__num">{i + 1}</span>
              <input
                key={`${p.id}:${p.title}`}
                className="page-tray__title"
                defaultValue={p.title}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== p.title) renamePage(p.id, v);
                }}
                aria-label={`Rename ${p.title}`}
              />
              <button
                type="button"
                className="page-tray__del"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePage(p.id);
                }}
                disabled={pages.length <= 1}
                aria-label={`Delete ${p.title}`}
                title="Delete page"
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
        </div>
      </Popover>

      {/* Export scope chooser */}
      <Popover
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        anchorRef={menuBtnRef}
        placement="bottom"
        className="menu-popover"
      >
        <div className="menu">
          <div className="menu__section-title">Export as PDF</div>
          <MenuItem
            icon="pages"
            label="Current page"
            onClick={() => void runExport("current")}
          />
          <MenuItem
            icon="download"
            label="All pages"
            onClick={() => void runExport("all")}
          />
        </div>
      </Popover>

      {/* Embed-by-URL (YouTube / Google Drive) */}
      <EmbedDialog
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        anchorRef={menuBtnRef}
        placement="bottom"
      />

      <SnapshotsPanel
        open={snapshotsOpen}
        onClose={() => setSnapshotsOpen(false)}
        anchorRef={menuBtnRef}
        boardId={boardId}
        client={client}
        owned={owned}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,audio/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            void useAssetStore.getState().importAtCenter(files);
          }
          e.target.value = "";
        }}
      />
    </>
  );
}
