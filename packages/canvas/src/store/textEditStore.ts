import { create } from "zustand";

export interface TextEditSession {
  // If editing an existing YText, this is its id.
  editingId: string | null;
  worldX: number;
  worldY: number;
  width: number;
  initial: string;
  font: string;
  size: number;
  color: string;
  // Alignment of the shape being edited, so the textarea matches the render.
  align?: "left" | "center" | "right";
  // Block-level formatting for the text editor toolbar.
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  // Editing mode — "text" shows the standard textarea overlay, "sticky" shows
  // the inline sticky editor with matching background color.
  mode?: "text" | "sticky";
  // Sticky-specific fields (only when mode === "sticky").
  stickyColor?: string;
  stickyW?: number;
  stickyH?: number;
}

interface TextEditStoreState {
  session: TextEditSession | null;
  begin(s: TextEditSession): void;
  end(): void;
  // Toggle / set formatting fields mid-edit.
  setFormat(patch: Partial<Pick<TextEditSession, "bold" | "italic" | "underline" | "align" | "font" | "size">>): void;
}

// Open/close handshake between the TextTool/SelectTool and the HTML overlay
// that hosts the editable <textarea> over the Konva stage.
export const useTextEditStore = create<TextEditStoreState>((set) => ({
  session: null,
  begin(s) {
    set({ session: s });
  },
  end() {
    set({ session: null });
  },
  setFormat(patch) {
    set((state) => {
      if (!state.session) return state;
      return { session: { ...state.session, ...patch } };
    });
  },
}));
