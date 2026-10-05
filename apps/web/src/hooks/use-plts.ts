"use client"

import * as React from "react"

interface QueryState<T> {
  data: T | undefined
  loading: boolean
  error: Error | undefined
  updatedAt: number | undefined
}

/**
 * Minimal polling query: runs `fetcher` on mount and whenever `key`
 * changes, then every `refreshMs` if given. Keeps the previous data while
 * a new request is in flight so charts don't flash.
 */
export function usePltsQuery<T>(key: string, fetcher: () => Promise<T>, refreshMs?: number): QueryState<T> {
  const [state, setState] = React.useState<QueryState<T>>({
    data: undefined,
    loading: true,
    error: undefined,
    updatedAt: undefined,
  })
  const fetcherRef = React.useRef(fetcher)
  React.useEffect(() => {
    fetcherRef.current = fetcher
  })

  React.useEffect(() => {
    let alive = true
    const run = () => {
      fetcherRef
        .current()
        .then((data) => alive && setState({ data, loading: false, error: undefined, updatedAt: Date.now() }))
        .catch((error: Error) => alive && setState((s) => ({ ...s, loading: false, error })))
    }
    run()
    const id = refreshMs ? setInterval(run, refreshMs) : undefined
    return () => {
      alive = false
      if (id) clearInterval(id)
    }
  }, [key, refreshMs])

  return state
}

/** Ticks every `ms`; returns `undefined` until mounted to keep SSR stable. */
export function useNow(ms = 1000): number | undefined {
  const [now, setNow] = React.useState<number>()
  React.useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, ms)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [ms])
  return now
}
