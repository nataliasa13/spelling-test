import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppProgress, SpellingLang, WeekPack } from '../types'
import { getLanguagesWithWords, resolvePracticeLangForWeek } from '../config/languages'
import { schoolConfig } from '../config/school'
import {
  isNewSpellingWeek,
  reconcileProgressForWeek,
} from '../lib/progress'
import {
  loadChildName,
  loadPracticeLang,
  loadProgress,
  loadWeek,
  resetProgressForNewWeek,
  saveChildName,
  savePracticeLang,
  saveProgress,
  saveWeek,
} from '../lib/storage'
import {
  clearImportParam,
  isSameWeekContent,
  readPackFromUrl,
} from '../lib/sharePack'
import { invalidatePiperOnLangChange } from '../lib/speech'

type AppState = {
  week: WeekPack | null
  progress: AppProgress
  pendingImport: WeekPack | null
  practiceLang: SpellingLang | null
  childName: string | null
  setWeek: (pack: WeekPack, resetStars: boolean) => void
  setProgress: (p: AppProgress) => void
  setPracticeLang: (lang: SpellingLang | null) => void
  setChildName: (name: string) => void
  refresh: () => void
  dismissImport: () => void
  applyPendingImport: (resetStars: boolean) => void
}

const Ctx = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [week, setWeekState] = useState<WeekPack | null>(() => loadWeek())
  const [progress, setProgressState] = useState<AppProgress>(() => loadProgress())
  const [pendingImport, setPendingImport] = useState<WeekPack | null>(() =>
    readPackFromUrl(),
  )
  const [practiceLang, setPracticeLangState] = useState<SpellingLang | null>(() =>
    loadPracticeLang(),
  )
  const [childName, setChildNameState] = useState<string | null>(() => loadChildName())

  useEffect(() => {
    const migrated = loadProgress()
    saveProgress(migrated)
    setProgressState(migrated)
  }, [])

  useEffect(() => {
    if (loadWeek()) return
    if (readPackFromUrl()) return
    void (async () => {
      try {
        const res = await fetch('/week.json')
        if (!res.ok) return
        const pack = (await res.json()) as WeekPack
        if (pack.classId !== schoolConfig.classId) return
        if (!Array.isArray(pack.english) || !Array.isArray(pack.spanish)) return
        if (getLanguagesWithWords(pack).length === 0) return
        if (loadWeek()) return
        saveWeek(pack)
        setWeekState(pack)
      } catch {
        /* sin week embebida */
      }
    })()
  }, [])

  const refresh = useCallback(() => {
    setWeekState(loadWeek())
    setProgressState(loadProgress())
  }, [])

  const setWeek = useCallback((pack: WeekPack, resetStars: boolean) => {
    const previous = loadWeek()
    if (resetStars) {
      resetProgressForNewWeek()
    } else {
      const next = reconcileProgressForWeek(loadProgress(), pack, {
        prune: true,
        resetMistakes: isNewSpellingWeek(previous, pack),
      })
      saveProgress(next)
    }
    saveWeek(pack)
    setWeekState(pack)
    setProgressState(loadProgress())
  }, [])

  useLayoutEffect(() => {
    if (!pendingImport) return
    const current = loadWeek()
    if (current && isSameWeekContent(current, pendingImport)) {
      setPendingImport(null)
      clearImportParam()
      if (current.weekLabel.trim() !== pendingImport.weekLabel.trim()) {
        setWeek(pendingImport, false)
      }
      return
    }
    setWeek(pendingImport, true)
    setPendingImport(null)
    clearImportParam()
  }, [pendingImport, setWeek])

  const setProgress = useCallback((p: AppProgress) => {
    saveProgress(p)
    setProgressState(p)
  }, [])

  const setPracticeLang = useCallback((lang: SpellingLang | null) => {
    savePracticeLang(lang)
    invalidatePiperOnLangChange()
    setPracticeLangState(lang)
  }, [])

  const setChildName = useCallback((name: string) => {
    saveChildName(name)
    setChildNameState(loadChildName())
  }, [])

  useEffect(() => {
    if (!week) return
    const resolved = resolvePracticeLangForWeek(week, practiceLang)
    if (resolved && resolved !== practiceLang) setPracticeLang(resolved)
  }, [week, practiceLang, setPracticeLang])

  const dismissImport = useCallback(() => {
    setPendingImport(null)
    clearImportParam()
  }, [])

  const applyPendingImport = useCallback(
    (resetStars: boolean) => {
      if (!pendingImport) return
      setWeek(pendingImport, resetStars)
      setPendingImport(null)
      clearImportParam()
    },
    [pendingImport, setWeek],
  )

  const value = useMemo(
    () => ({
      week,
      progress,
      pendingImport,
      practiceLang,
      childName,
      setWeek,
      setProgress,
      setPracticeLang,
      setChildName,
      refresh,
      dismissImport,
      applyPendingImport,
    }),
    [
      week,
      progress,
      pendingImport,
      practiceLang,
      childName,
      setWeek,
      setProgress,
      setPracticeLang,
      setChildName,
      refresh,
      dismissImport,
      applyPendingImport,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('AppStateProvider missing')
  return ctx
}
