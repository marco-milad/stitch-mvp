// Service Requests live-data hook bundle.
//   - `useServiceRequests` — TanStack Query for GET /admin/requests, kept
//     warm by the same-window WS that pushes `request.updated` events.
//   - `useDispatchRequest` / `useResolveRequest` — mutations that POST and
//     then invalidate the query so the row flips instantly.
//
// We let the WS event do the heavy lifting for cross-tab sync; the mutation
// response also patches the cache locally so the operator's own tab feels
// responsive even if the WS lags.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  dispatchRequest,
  listRequests,
  resolveRequest,
  subscribeRequestsStream,
  type RequestsList,
} from '@/lib/api';
import type { ServiceRequest } from '@/lib/types';

export const REQUESTS_KEY = ['admin', 'requests'] as const;

export interface DispatchVars {
  requestId: string;
  technicianId: string;
}

export interface UseServiceRequestsResult {
  data: RequestsList | undefined;
  isLoading: boolean;
  isLive: boolean;
}

export function useServiceRequests(): UseServiceRequestsResult {
  const qc = useQueryClient();
  const [isLive, setIsLive] = useState(false);

  const q = useQuery<RequestsList>({
    queryKey: REQUESTS_KEY,
    queryFn: listRequests,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    const sub = subscribeRequestsStream((event) => {
      if (event.type === 'snapshot') {
        qc.setQueryData<RequestsList>(REQUESTS_KEY, {
          items: event.items,
          technicians: event.technicians,
        });
      } else if (event.type === 'request.updated') {
        // Patch the matching row in-place; falls back to invalidate if
        // we don't have a cache yet.
        qc.setQueryData<RequestsList | undefined>(REQUESTS_KEY, (prev) => {
          if (!prev) return prev;
          const replaced = prev.items.some((r) => r.id === event.item.id);
          const items = replaced
            ? prev.items.map((r) => (r.id === event.item.id ? event.item : r))
            : [event.item, ...prev.items];
          return { ...prev, items };
        });
      }
    }, setIsLive);
    return () => sub.close();
  }, [qc]);

  return {
    data: q.data,
    isLoading: q.isLoading,
    isLive,
  };
}

function patchCache(qc: ReturnType<typeof useQueryClient>, updated: ServiceRequest) {
  qc.setQueryData<RequestsList | undefined>(REQUESTS_KEY, (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      items: prev.items.map((r) => (r.id === updated.id ? updated : r)),
    };
  });
}

export function useDispatchRequest(): UseMutationResult<ServiceRequest, Error, DispatchVars> {
  const qc = useQueryClient();
  return useMutation<ServiceRequest, Error, DispatchVars>({
    mutationFn: ({ requestId, technicianId }) => dispatchRequest(requestId, technicianId),
    onSuccess: (updated) => {
      patchCache(qc, updated);
    },
  });
}

export function useResolveRequest(): UseMutationResult<ServiceRequest, Error, string> {
  const qc = useQueryClient();
  return useMutation<ServiceRequest, Error, string>({
    mutationFn: (requestId) => resolveRequest(requestId),
    onSuccess: (updated) => {
      patchCache(qc, updated);
    },
  });
}
