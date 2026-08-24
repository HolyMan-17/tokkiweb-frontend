import { useCallback, useEffect, useState, type DependencyList } from 'react';

export type AsyncStatus = 'pending' | 'success' | 'error';

interface AsyncState<T> {
  status: AsyncStatus;
  data?: T;
  error?: unknown;
}

export interface AsyncData<T> extends AsyncState<T> {
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * Minimal loader-state hook — the single pattern every screen uses to render
 * pending / error / success. Wrap any promise-returning fetcher (today the
 * localStore async facade, tomorrow the real `api()` calls) and render
 * <LoadingSpinner /> while pending and <ErrorState /> on failure.
 *
 * Pass a `deps` array like useEffect: the loader re-runs when they change.
 * `retry` re-runs the loader without remounting.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: DependencyList,
): AsyncData<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'pending' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Reset to pending at the start of every run (dep change or retry).
    // Data-fetching hooks legitimately transition state inside the effect;
    // the set-state-in-effect rule targets accidental cascading renders.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'pending' });
    loader().then(
      data => {
        if (!cancelled) setState({ status: 'success', data });
      },
      error => {
        if (!cancelled) setState({ status: 'error', error });
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  return {
    ...state,
    isLoading: state.status === 'pending',
    isError: state.status === 'error',
    retry,
  };
}

export default useAsync;
