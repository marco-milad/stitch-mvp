// Opens the gate-stream WS, hydrates the buffer from `snapshot`, and pushes
// each `scan` event into the store. Reconnect/backoff is handled by
// `subscribeGateStream`.

import { useEffect } from 'react';

import { subscribeGateStream } from '@/lib/api';
import { useGateStreamStore } from '@/stores/gateStreamStore';

export function useGateStream(): void {
  useEffect(() => {
    const store = useGateStreamStore.getState();
    const sub = subscribeGateStream(
      (event) => {
        if (event.type === 'snapshot') {
          useGateStreamStore.getState().setSnapshot(event.events);
        } else if (event.type === 'scan') {
          useGateStreamStore.getState().pushEvent(event.event);
        }
      },
      (open) => useGateStreamStore.getState().setConnected(open),
    );
    return () => {
      sub.close();
      store.setConnected(false);
    };
  }, []);
}
