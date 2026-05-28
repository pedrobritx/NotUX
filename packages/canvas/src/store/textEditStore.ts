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
}

interface TextEditStoreState {
  session: TextEditSession | null;
  begin(s: TextEditSession): void;
  end(): void;
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
}));
