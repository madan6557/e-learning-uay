import { useState, useEffect, useRef } from "react";
import { readCache } from "../readCache";
import { api } from "../services/api";

export function useApi<T = any>(path: string | null) {
  const cached = path ? readCache.peek<T>(path) : undefined;
  const [data, setData] = useState<T | null>(cached ?? null),
    [error, setError] = useState<Error | null>(null),
    [loading, setLoading] = useState(Boolean(path && cached === undefined)),
    [version, setVersion] = useState(0);

  const prevPathRef = useRef<string | null>(path);
  const dataRef = useRef<T | null>(data);
  dataRef.current = data;

  useEffect(() => {
    let active = true;
    setError(null);
    if (!path) {
      setLoading(false);
      return;
    }
    const pathChanged = prevPathRef.current !== path;
    prevPathRef.current = path;

    const cached = readCache.peek<T>(path);
    if (pathChanged) {
      setData(cached ?? null);
      setLoading(cached === undefined);
    } else {
      if (dataRef.current === null) {
        setData(cached ?? null);
        setLoading(cached === undefined);
      } else {
        setLoading(false);
      }
    }

    api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active)
          setError(Object.assign(e, { retry: () => setVersion((v) => v + 1) }));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return {
    data,
    setData,
    error,
    loading,
    reload: () => {
      if (path) readCache.evict(path);
      else readCache.clear();
      setVersion((v) => v + 1);
    },
  };
}
