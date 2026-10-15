import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type PracticeBackContextValue = {
  handler: (() => void) | null
  setHandler: (handler: (() => void) | null) => void
}

const PracticeBackContext = createContext<PracticeBackContextValue | null>(null)

export function PracticeBackProvider({ children }: { children: ReactNode }) {
  const [handler, setHandlerState] = useState<(() => void) | null>(null)
  const setHandler = useCallback((next: (() => void) | null) => {
    setHandlerState(() => next)
  }, [])
  const value = useMemo(() => ({ handler, setHandler }), [handler, setHandler])
  return (
    <PracticeBackContext.Provider value={value}>{children}</PracticeBackContext.Provider>
  )
}

export function usePracticeBack() {
  return useContext(PracticeBackContext)
}
