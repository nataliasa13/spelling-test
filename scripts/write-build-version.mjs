import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function gitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

const build =
  process.env.GITHUB_SHA?.slice(0, 7) ?? gitShortSha() ?? `t${Date.now().toString(36)}`

const payload = {
  build,
  builtAt: new Date().toISOString(),
}

const out = path.join(root, 'public/version.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, `${JSON.stringify(payload)}\n`, 'utf8')

console.log(`[build-version] ${build}`)
