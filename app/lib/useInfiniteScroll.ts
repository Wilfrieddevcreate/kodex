"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions<T> {
  fetchUrl: string;
  pageSize?: number;
  initialData?: T[];
}

interface UseInfiniteScrollResult<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  sentinelRef: (node: HTMLElement | null) => void;
  reset: () => void;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useInfiniteScroll<T>({ fetchUrl, pageSize = 20 }: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initialLoadDone = useRef(false);

  const fetchItems = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const separator = fetchUrl.includes("?") ? "&" : "?";
      const res = await fetch(`${fetchUrl}${separator}skip=${pageNum * pageSize}&take=${pageSize}`);
      const data = await res.json();
      const newItems: T[] = data.items || data.data || [];

      if (pageNum === 0) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }

      setHasMore(newItems.length === pageSize);
    } catch (err) {
      console.error("Infinite scroll fetch error:", err);
    }
    setLoading(false);
  }, [fetchUrl, pageSize]);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchItems(0);
    }
  }, [fetchItems]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchItems(nextPage);
    }
  }, [loading, hasMore, page, fetchItems]);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore && !loading) {
            loadMore();
          }
        },
        { threshold: 0.1 }
      );

      observerRef.current.observe(node);
    },
    [hasMore, loading, loadMore]
  );

  const reset = useCallback(() => {
    setPage(0);
    setHasMore(true);
    initialLoadDone.current = false;
    fetchItems(0);
  }, [fetchItems]);

  return { items, loading, hasMore, loadMore, sentinelRef, reset, setItems };
}
