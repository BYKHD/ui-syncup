import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// useSyncExternalStore rather than useEffect + setState. matchMedia is an external
// mutable source, and this is the API React provides for reading one: it drops the
// extra render the effect version cost on every mount, removes the brief `undefined`
// state, and stays hydration-safe (React uses the server snapshot for the hydrating
// render, then re-reads on the client).
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

// The server has no viewport; desktop-first matches the previous behaviour, which
// returned false until the mount effect ran.
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
