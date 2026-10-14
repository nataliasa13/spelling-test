/** Hugging Face URLs used internally by @mintplex-labs/piper-tts-web */
export const PIPER_HF_BASE =
  'https://huggingface.co/diffusionstudio/piper-voices/resolve/main'

const CDN_PIPER = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize'
const CDN_ONNX_PREFIX = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/'

let fetchPatched = false

function assetBase(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base : `${base}/`
}

function absoluteAsset(relativeFromPublic: string): string {
  const rel = relativeFromPublic.replace(/^\//, '')
  if (typeof window === 'undefined') {
    return `${assetBase()}${rel}`
  }
  return new URL(rel, `${window.location.origin}${assetBase()}`).href
}

function localVoiceUrl(hfUrl: string): string | null {
  if (!hfUrl.startsWith(PIPER_HF_BASE)) return null
  const rel = hfUrl.slice(PIPER_HF_BASE.length).replace(/^\//, '')
  return absoluteAsset(`piper-voices/${rel}`)
}

function localOnnxUrl(url: string): string | null {
  if (!url.startsWith(CDN_ONNX_PREFIX) && !url.includes('/piper-wasm/onnx/')) return null
  const file = url.slice(url.lastIndexOf('/') + 1).replace(/\?.*$/, '')
  if (!file.startsWith('ort-')) return null
  return absoluteAsset(`piper-wasm/onnx/${file}`)
}

async function fetchLocalOnly(orig: typeof fetch, localUrl: string, init?: RequestInit): Promise<Response> {
  const res = await orig(localUrl, init)
  if (!res.ok) {
    throw new Error(`Offline asset missing or unreadable: ${localUrl} (${res.status})`)
  }
  if (localUrl.includes('.json')) {
    const text = await res.text()
    const head = text.trimStart().slice(0, 20).toLowerCase()
    if (head.startsWith('<!doctype') || head.startsWith('<html')) {
      throw new Error(`Voice config returned HTML instead of JSON: ${localUrl}`)
    }
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return res
}

/** Solo assets locales en public/ — sin Hugging Face ni CDN en runtime. */
export function installPiperLocalFetch(): void {
  if (fetchPatched || typeof window === 'undefined') return
  fetchPatched = true

  const orig = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : input.href

    const localVoice = localVoiceUrl(url)
    if (localVoice) return fetchLocalOnly(orig, localVoice, init)

    const localOnnx = localOnnxUrl(url)
    if (localOnnx) return fetchLocalOnly(orig, localOnnx, init)

    if (url === `${CDN_PIPER}.wasm`) {
      return fetchLocalOnly(orig, absoluteAsset('piper-wasm/piper_phonemize.wasm'), init)
    }
    if (url === `${CDN_PIPER}.data`) {
      return fetchLocalOnly(orig, absoluteAsset('piper-wasm/piper_phonemize.data'), init)
    }

    return orig(input, init)
  }
}

export function piperWasmPaths(): {
  onnxWasm: string
  piperData: string
  piperWasm: string
} {
  return {
    onnxWasm: absoluteAsset('piper-wasm/onnx/'),
    piperData: absoluteAsset('piper-wasm/piper_phonemize.data'),
    piperWasm: absoluteAsset('piper-wasm/piper_phonemize.wasm'),
  }
}

type PiperTts = typeof import('@mintplex-labs/piper-tts-web')

/** Library singleton only supports one model; reset before loading another voice. */
export function resetPiperSingleton(tts: PiperTts): void {
  const ctor = tts.TtsSession as unknown as { _instance: unknown }
  ctor._instance = null
}
