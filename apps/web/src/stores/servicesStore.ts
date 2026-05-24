// Favorites for the Services hub. In-memory only — Week 2 wires this to
// persistent storage + a `users.preferences.serviceFavorites` field on the API.

import { create } from 'zustand';

interface ServicesState {
  favorites: ReadonlySet<string>;
  toggleFavorite: (tileId: string) => void;
  isFavorite: (tileId: string) => boolean;
}

export const useServicesStore = create<ServicesState>((set, get) => ({
  favorites: new Set(),
  toggleFavorite: (id) =>
    set((s) => {
      const next = new Set(s.favorites);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { favorites: next };
    }),
  isFavorite: (id) => get().favorites.has(id),
}));
