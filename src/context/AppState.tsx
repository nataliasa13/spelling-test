import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { isSameWeekContent } from '../lib/weekContent'
import { invalidatePiperOnLangChange } from '../lib/speech'

type AppState = {
  week: WeekPack | null
  progress: AppProgress
  practiceLang: SpellingLang | null
  childName: string | null
  setWeek: (pack: WeekPack, resetStars: boolean) => void
  setProgress: (p: AppProgress) => void
  setPracticeLang: (lang: SpellingLang | null) => void
  setChildName: (name: string) => void
  refresh: () => void
}

const Ctx = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [week, setWeekState] = useState<WeekPack | null>(() => loadWeek())
  const [progress, setProgressState] = useState<AppProgress>(() => loadProgress())
  const [practiceLang, setPracticeLangState] = useState<SpellingLang | null>(() =>
    loadPracticeLang(),
  )
  const [childName, setChildNameState] = useState<string | null>(() => loadChildName())

  useEffect(() => {
    const migrated = loadProgress()
    saveProgress(migrated)
    setProgressState(migrated)
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

  /** week.json publicado (GitHub Pages) manda si es más reciente que la semana local. */
  useEffect(() => {
    const syncPublishedWeek = async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}week.json`, { cache: 'no-cache' })
        if (!res.ok) return
        const pack = (await res.json()) as WeekPack
        if (pack.classId !== schoolConfig.classId) return
        if (!Array.isArray(pack.english) || !Array.isArray(pack.spanish)) return
        if (getLanguagesWithWords(pack).length === 0) return
        const published = Date.parse(pack.publishedAt)
        if (Number.isNaN(published)) return

        const current = loadWeek()
        if (current && Date.parse(current.publishedAt) >= published) return
        if (current && isSameWeekContent(current, pack)) {
          setWeek(pack, false)
          return
        }
        setWeek(pack, true)
      } catch {
        /* offline: se queda la semana guardada */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncPublishedWeek()
    }
    void syncPublishedWeek()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [setWeek])

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

  const value = useMemo(
    () => ({
      week,
      progress,
      practiceLang,
      childName,
      setWeek,
      setProgress,
      setPracticeLang,
      setChildName,
      refresh,
    }),
    [
      week,
      progress,
      practiceLang,
      childName,
      setWeek,
      setProgress,
      setPracticeLang,
      setChildName,
      refresh,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('AppStateProvider missing')
  return ctx
}
