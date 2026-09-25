"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Loads ERP data on the client.
 *
 * The repositories are localStorage-backed, so reading them during SSR would
 * return the seed while the browser holds a different set — loading after mount
 * keeps server and client markup identical and gives every table a real loading
 * state.
 */
export function useCollection<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Callers pass `deps` because the loader closure is recreated each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await run());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    run()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Gagal memuat data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [run]);

  return { data, loading, error, reload };
}
