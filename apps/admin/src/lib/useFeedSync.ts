// Opens the live feed WS once at app mount and wires events into the
// feedStore. The hub sends a `snapshot` on connect (used to hydrate the
// store) followed by `feed.item.created` / `feed.item.deleted` events as
// they happen on any client. Reconnect + backoff are handled by
// `subscribeFeed`.

import { useEffect } from 'react';

import { isMockMode, subscribeFeed } from '@/lib/api';
import { useFeedStore } from '@/stores/feedStore';

export function useFeedSync(): void {
  useEffect(() => {
    if (isMockMode) return;
    const sub = subscribeFeed((event) => {
      const store = useFeedStore.getState();
      if (event.type === 'snapshot') {
        store.setItems(event.items);
        store.setConnected(true);
      } else if (event.type === 'feed.item.created') {
        store.receiveItem(event.item);
      } else if (event.type === 'feed.item.deleted') {
        store.receiveDelete(event.id);
      }
    });
    return () => {
      sub.close();
      useFeedStore.getState().setConnected(false);
    };
  }, []);
}
