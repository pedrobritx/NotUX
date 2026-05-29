import { useRef, useState } from "react";
import { GlassPanel, Popover } from "@notux/ui";
import { usePageStore } from "@notux/canvas";

export function PageNavigator() {
  const pages = usePageStore((s) => s.pages);
  const activePageId = usePageStore((s) => s.activePageId);
  // Subscribe to revision so remote list changes re-render the navigator.
  usePageStore((s) => s.revision);
  const setActivePage = usePageStore((s) => s.setActivePage);
  const addPage = usePageStore((s) => s.addPage);
  const deletePage = usePageStore((s) => s.deletePage);
  const renamePage = usePageStore((s) => s.renamePage);
  const reorderPage = usePageStore((s) => s.reorderPage);

  const [trayOpen, setTrayOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const labelRef = useRef<HTMLButtonElement>(null);

  const index = Math.max(
    0,
    pages.findIndex((p) => p.id === activePageId),
  );
  const prevId = pages[index - 1]?.id;
  const nextId = pages[index + 1]?.id;

  function commitDrop() {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      reorderPage(dragIdx, overIdx);
    }
    setDragIdx(null);
    setOverIdx(null);
  }

  return (
    <>
      <GlassPanel className="page-nav" aria-label="Pages">
        <button
          type="button"
          className="page-nav__btn"
          onClick={() => prevId && setActivePage(prevId)}
          disabled={!prevId}
          aria-label="Previous page"
        >
          ‹
        </button>
        <button
          ref={labelRef}
          type="button"
          className="page-nav__label"
          onClick={() => setTrayOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={trayOpen}
        >
          {pages[index]?.title ?? "Page"} · {index + 1}/{pages.length}
        </button>
        <button
          type="button"
          className="page-nav__btn"
          onClick={() => nextId && setActivePage(nextId)}
          disabled={!nextId}
          aria-label="Next page"
        >
          ›
        </button>
        <button
          type="button"
          className="page-nav__btn"
          onClick={() => setActivePage(addPage())}
          aria-label="Add page"
          title="Add page"
        >
          ＋
        </button>
      </GlassPanel>

      <Popover
        open={trayOpen}
        onClose={() => setTrayOpen(false)}
        anchorRef={labelRef}
        placement="bottom"
      >
        <div className="page-tray">
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
                🗑
              </button>
            </div>
          ))}
        </div>
      </Popover>
    </>
  );
}
