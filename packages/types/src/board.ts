export interface Board {
  id: string;
  title: string;
  ownerId: string | null;
  isPublic: boolean;
  createdAt: string;
}
