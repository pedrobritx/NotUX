import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, useTheme } from "@notux/ui";
import { useSession } from "../features/auth/SessionProvider";
import {
  useLibraryStore,
  type BoardMeta,
  type FolderMeta,
} from "../features/library/libraryStore";

function newBoardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

const RECENTS_LIMIT = 6;

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();

  const boards = useLibraryStore((s) => s.boards);
  const folders = useLibraryStore((s) => s.folders);
  const touchBoard = useLibraryStore((s) => s.touchBoard);
  const createFolder = useLibraryStore((s) => s.createFolder);

  const [query, setQuery] = useState("");
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  const all = useMemo(
    () => Object.values(boards).sort((a, b) => b.lastOpenedAt - a.lastOpenedAt),
    [boards],
  );

  const searching = query.trim().length > 0;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all.filter((b) => b.title.toLowerCase().includes(q));
  }, [all, query]);

  const favorites = all.filter((b) => b.starred);
  const recents = all.slice(0, RECENTS_LIMIT);
  const rootBoards = all.filter((b) => b.folderId === null);
  const openFolder = folders.find((f) => f.id === openFolderId) ?? null;
  const folderBoards = openFolder
    ? all.filter((b) => b.folderId === openFolder.id)
    : [];

  function onCreateBoard() {
    const id = newBoardId();
    touchBoard(id);
    if (openFolder) useLibraryStore.getState().moveBoard(id, openFolder.id);
    navigate(`/board/${id}`);
  }

  function onCreateFolder() {
    const id = createFolder("New folder");
    setOpenFolderId(id);
  }

  const hasLibrary = all.length > 0 || folders.length > 0;

  return (
    <main className="library">
      <header className="library__bar">
        <div className="library__brand">
          {openFolder ? (
            <button
              type="button"
              className="library__back"
              onClick={() => setOpenFolderId(null)}
              aria-label="Back to all boards"
            >
              <Icon name="chevron-left" size={16} />
            </button>
          ) : (
            <span className="library__logo" aria-hidden>
              N
            </span>
          )}
          <h1 className="library__title">
            {openFolder ? openFolder.name : "NotUX"}
          </h1>
        </div>

        <div className="library__search">
          <Icon name="search" size={15} className="library__search-icon" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards"
            aria-label="Search boards"
          />
          {searching && (
            <button
              type="button"
              className="library__search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <Icon name="close" size={13} />
            </button>
          )}
        </div>

        <div className="library__actions">
          <button
            type="button"
            className="library__icon-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
          </button>
          {!openFolder && (
            <button
              type="button"
              className="library__icon-btn"
              onClick={onCreateFolder}
              title="New folder"
              aria-label="New folder"
            >
              <Icon name="folder" size={17} />
            </button>
          )}
          <button className="lg-button lg-button--primary library__new" onClick={onCreateBoard}>
            <Icon name="plus" size={15} />
            <span>New board</span>
          </button>
          <AccountMenu />
        </div>
      </header>

      <div className="library__scroll">
        {searching ? (
          <Section title={`Results for “${query.trim()}”`}>
            {matches.length === 0 ? (
              <p className="library__empty">No boards match your search.</p>
            ) : (
              <div className="library__grid">
                {matches.map((b) => (
                  <BoardCard key={b.id} board={b} folders={folders} />
                ))}
              </div>
            )}
          </Section>
        ) : openFolder ? (
          <Section title="">
            {folderBoards.length === 0 ? (
              <p className="library__empty">
                This folder is empty. Create a board here, or drag boards onto the
                folder from the workspace.
              </p>
            ) : (
              <div className="library__grid">
                {folderBoards.map((b) => (
                  <BoardCard key={b.id} board={b} folders={folders} />
                ))}
              </div>
            )}
            <FolderActions folder={openFolder} onDeleted={() => setOpenFolderId(null)} />
          </Section>
        ) : !hasLibrary ? (
          <EmptyState onCreate={onCreateBoard} />
        ) : (
          <>
            {favorites.length > 0 && (
              <Section title="Favorites" icon="star">
                <div className="library__grid">
                  {favorites.map((b) => (
                    <BoardCard key={b.id} board={b} folders={folders} />
                  ))}
                </div>
              </Section>
            )}

            {recents.length > 0 && (
              <Section title="Recents" icon="clock">
                <div className="library__grid">
                  {recents.map((b) => (
                    <BoardCard key={b.id} board={b} folders={folders} />
                  ))}
                </div>
              </Section>
            )}

            {folders.length > 0 && (
              <Section title="Folders" icon="folder">
                <div className="library__grid">
                  {folders.map((f) => (
                    <FolderCard
                      key={f.id}
                      folder={f}
                      count={all.filter((b) => b.folderId === f.id).length}
                      onOpen={() => setOpenFolderId(f.id)}
                    />
                  ))}
                </div>
              </Section>
            )}

            {rootBoards.length > 0 && (
              <Section title="Boards" icon="board">
                <div className="library__grid">
                  {rootBoards.map((b) => (
                    <BoardCard key={b.id} board={b} folders={folders} />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: Parameters<typeof Icon>[0]["name"];
  children: React.ReactNode;
}) {
  return (
    <section className="library__section">
      {title && (
        <h2 className="library__section-title">
          {icon && <Icon name={icon} size={14} />}
          <span>{title}</span>
        </h2>
      )}
      {children}
    </section>
  );
}

function BoardCard({
  board,
  folders,
}: {
  board: BoardMeta;
  folders: FolderMeta[];
}) {
  const navigate = useNavigate();
  const renameBoard = useLibraryStore((s) => s.renameBoard);
  const toggleStar = useLibraryStore((s) => s.toggleStar);
  const moveBoard = useLibraryStore((s) => s.moveBoard);
  const removeBoard = useLibraryStore((s) => s.removeBoard);
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="board-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-notux-board", board.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => {
        if (!renaming && !menuOpen) navigate(`/board/${board.id}`);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !renaming) navigate(`/board/${board.id}`);
      }}
      aria-label={`Open ${board.title}`}
    >
      <div className="board-card__preview" aria-hidden>
        <Icon name="board" size={28} />
      </div>
      <div className="board-card__meta">
        {renaming ? (
          <input
            className="board-card__rename"
            defaultValue={board.title}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setRenaming(false);
            }}
            onBlur={(e) => {
              renameBoard(board.id, e.target.value);
              setRenaming(false);
            }}
            aria-label="Board title"
          />
        ) : (
          <span className="board-card__title" title={board.title}>
            {board.title}
          </span>
        )}
        <span className="board-card__time">
          {new Date(board.lastOpenedAt).toLocaleDateString()}
        </span>
      </div>
      <div className="board-card__tools" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={
            "board-card__tool" + (board.starred ? " board-card__tool--starred" : "")
          }
          onClick={() => toggleStar(board.id)}
          title={board.starred ? "Remove from favorites" : "Add to favorites"}
          aria-label={board.starred ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={board.starred}
        >
          <Icon name="star" size={14} />
        </button>
        <button
          type="button"
          className="board-card__tool"
          onClick={() => setMenuOpen(!menuOpen)}
          title="More"
          aria-label="Board options"
          aria-expanded={menuOpen}
        >
          <Icon name="ellipsis" size={14} />
        </button>
        {menuOpen && (
          <div className="board-card__menu" onMouseLeave={() => setMenuOpen(false)}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setRenaming(true);
              }}
            >
              <Icon name="rename" size={13} /> Rename
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={board.folderId === f.id}
                onClick={() => {
                  moveBoard(board.id, f.id);
                  setMenuOpen(false);
                }}
              >
                <Icon name="folder" size={13} /> Move to {f.name}
              </button>
            ))}
            {board.folderId !== null && (
              <button
                type="button"
                onClick={() => {
                  moveBoard(board.id, null);
                  setMenuOpen(false);
                }}
              >
                <Icon name="board" size={13} /> Move to workspace
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                removeBoard(board.id);
                setMenuOpen(false);
              }}
            >
              <Icon name="trash" size={13} /> Remove from library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderCard({
  folder,
  count,
  onOpen,
}: {
  folder: FolderMeta;
  count: number;
  onOpen(): void;
}) {
  const moveBoard = useLibraryStore((s) => s.moveBoard);
  const [over, setOver] = useState(false);

  return (
    <button
      type="button"
      className={"folder-card" + (over ? " folder-card--over" : "")}
      onClick={onOpen}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-notux-board")) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("application/x-notux-board");
        if (id) moveBoard(id, folder.id);
        setOver(false);
      }}
      aria-label={`Open folder ${folder.name}`}
    >
      <span className="folder-card__icon">
        <Icon name="folder" size={26} />
      </span>
      <span className="folder-card__meta">
        <span className="folder-card__name">{folder.name}</span>
        <span className="folder-card__count">
          {count} {count === 1 ? "board" : "boards"}
        </span>
      </span>
    </button>
  );
}

function FolderActions({
  folder,
  onDeleted,
}: {
  folder: FolderMeta;
  onDeleted(): void;
}) {
  const renameFolder = useLibraryStore((s) => s.renameFolder);
  const deleteFolder = useLibraryStore((s) => s.deleteFolder);
  return (
    <div className="library__folder-actions">
      <input
        key={folder.id + folder.name}
        className="library__folder-rename"
        defaultValue={folder.name}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        onBlur={(e) => renameFolder(folder.id, e.target.value)}
        aria-label="Folder name"
      />
      <button
        type="button"
        className="lg-button"
        onClick={() => {
          deleteFolder(folder.id);
          onDeleted();
        }}
      >
        Delete folder
      </button>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate(): void }) {
  return (
    <div className="library__hero">
      <h2>A collaborative infinite whiteboard for teaching.</h2>
      <p>
        Draw, annotate PDFs, and teach live — your boards appear here as you
        create them.
      </p>
      <button className="lg-button lg-button--primary" onClick={onCreate}>
        Create your first board
      </button>
    </div>
  );
}

function AccountMenu() {
  const navigate = useNavigate();
  const { session, configured, signOut } = useSession();
  const [open, setOpen] = useState(false);

  const email = session?.user.email ?? null;
  const meta = (session?.user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  const name = meta.full_name ?? meta.name ?? (email ? email.split("@")[0] : null);
  const initial = (name ?? "?").charAt(0).toUpperCase();

  // Signed out (guest or local mode): a direct "Sign in" affordance.
  if (!session) {
    if (!configured) return null;
    return (
      <button
        type="button"
        className="lg-button library__signin"
        onClick={() => navigate("/login")}
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="account">
      <button
        type="button"
        className="account__button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={email ?? "Account"}
      >
        {meta.avatar_url ? (
          <img className="account__avatar" src={meta.avatar_url} alt="" />
        ) : (
          <span className="account__avatar account__avatar--initial">{initial}</span>
        )}
      </button>
      {open && (
        <div className="account__menu" role="menu" onMouseLeave={() => setOpen(false)}>
          <div className="account__id">
            <span className="account__name">{name}</span>
            {email && <span className="account__email">{email}</span>}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut().then(() => navigate("/"));
            }}
          >
            <Icon name="lock" size={13} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
