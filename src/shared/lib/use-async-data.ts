import { useCallback, useEffect, useState } from "react";

interface AsyncDataState<TData> {
  data: TData | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useAsyncData<TData>(
  load: () => Promise<TData>,
  deps: readonly unknown[] = [],
): AsyncDataState<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setData(await load());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
