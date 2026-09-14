import { useCallback, useEffect, useState } from 'react'

// Tiny fetch hook: data, loading, error, reload. No cache lib needed at this size.
export function useData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    setLoading(true)
    fetcher().then(d => { setData(d); setError(null) }).catch(e => setError(e.message)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(reload, [reload])
  return { data, error, loading, reload }
}
