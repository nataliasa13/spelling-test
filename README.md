# Spellings Test

## Publicar las palabras de la semana

1. En GitHub, abre `public/week.json` y edítalo (icono del lápiz).
2. Cambia `weekLabel`, `english`, `spanish` y **pon `publishedAt` a la fecha/hora actual** (ISO, p. ej. `2026-10-19T08:00:00Z`).
   La app solo aplica la semana publicada si su `publishedAt` es más reciente que la que tiene cada dispositivo.
3. Commit a `main`. El workflow `Deploy to GitHub Pages` despliega en 1–2 minutos.

Las familias reciben las palabras al abrir la app (o al volver a la pestaña); sin red se queda la última semana guardada.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
