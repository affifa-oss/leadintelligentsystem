import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Keeps a filter value in the URL (?key=value) so filtered views survive refresh and can be linked. */
export function useQueryState(key: string, fallback = ''): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? fallback
  const set = useCallback(
    (v: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (!v || v === fallback) next.delete(key)
          else next.set(key, v)
          return next
        },
        { replace: true },
      ),
    [key, fallback, setParams],
  )
  return [value, set]
}
