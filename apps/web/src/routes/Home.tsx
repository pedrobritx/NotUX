import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, useTheme } from "@notux/ui";
import { useAuth } from "../features/auth/useAuth";
import {
  useLibraryStore,
  type BoardMeta,
  type FolderMeta,
} from "../features/library/libraryStore";
import { supabaseConfigured } from "../env";

function newBoardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

const RECENTS_LIMIT = 6;

export default function Home() {
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

        <AuthFooter />
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

function AuthFooter() {
  const [email, setEmail] = useState("");
  const [showMagicLink, setShowMagicLink] = useState(false);
  const { status, error, session, signInWithGoogle, sendMagicLink, signOut } =
    useAuth();

  if (!supabaseConfigured) {
    return (
      <p className="library__note">
        Running in local-only mode. Set <code>VITE_SUPABASE_URL</code> and{" "}
        <code>VITE_SUPABASE_ANON_KEY</code> to enable sync and sign-in.
      </p>
    );
  }

  if (session) {
    return (
      <div className="library__auth-row">
        <span>Signed in as {session.user.email}</span>
        <button className="lg-button" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="library__auth">
      <span>Sign in to keep your boards private &amp; sync across devices</span>
      <div className="library__auth-buttons">
        <button
          className="lg-button lg-button--google"
          onClick={() => void signInWithGoogle()}
        >
          <GoogleIcon /> Sign in with Google
        </button>
        {!showMagicLink && (
          <button
            className="lg-button"
            type="button"
            onClick={() => setShowMagicLink(true)}
          >
            Sign in with email
          </button>
        )}
      </div>
      {showMagicLink && (
        <form
          className="library__auth-buttons"
          onSubmit={(e) => {
            e.preventDefault();
            if (email) void sendMagicLink(email);
          }}
        >
          <input
            id="email"
            type="email"
            required
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
          />
          <button className="lg-button" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}
      {status === "sent" && (
        <p className="library__note">Check your email to finish signing in.</p>
      )}
      {status === "error" && error && <p className="library__error">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
