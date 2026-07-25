/**
 * Tiny fetch-on-key hook. There is no data library in this build, and every
 * screen needs the same three states, so this keeps them consistent.
 *
 * `key` is the identity of the request: change it and the request re-runs; pass
 * `null` while the inputs are not ready yet (e.g. before the patient id lands)
 * and nothing is fetched.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export function useAsync<T>(key: string | null, load: () => Promise<T>): AsyncState<T> {
  // The loader closes over fresh props each render; only `key` decides re-fetch.
  const loadRef = useRef(load);
  loadRef.current = load;

  const [state, setState] = useState<Omit<AsyncState<T>, "reload">>({
    data: null,
    error: null,
    loading: key !== null,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (key === null) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    loadRef.current().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      },
      (cause: unknown) => {
        if (cancelled) return;
        const message = cause instanceof ApiError ? cause.message : GENERIC_ERROR;
        setState({ data: null, error: message, loading: false });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}
