/** Identificador de la lista en `week.json` y assets de marca de la app. */
export const appConfig = {
  productName: 'Spellings Test',
  /** Debe coincidir con `classId` en public/week.json. */
  classId: 'default',
  iconSrc: `${import.meta.env.BASE_URL}favicon.svg`,
} as const
