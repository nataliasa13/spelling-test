/** Ruta absoluta respetando `import.meta.env.BASE_URL` (GitHub Pages). */
export function resolveAppPath(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const segment = path.replace(/^\//, '')
  if (base === '/') return `/${segment}`
  return `${base.replace(/\/$/, '')}/${segment}`
}
