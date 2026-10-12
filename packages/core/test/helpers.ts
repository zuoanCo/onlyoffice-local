import { vi } from 'vitest'

/** Minimal stand-in for the DocsAPI surface the core actually touches. */
export interface FakeDocEditor extends EventTarget {
  downloadAs: ReturnType<typeof vi.fn>
  destroyEditor: ReturnType<typeof vi.fn>
}

export interface FakeDocsApi {
  DocEditor: ReturnType<typeof vi.fn>
  instances: FakeDocEditor[]
}

/**
 * Install a fake `window.DocsAPI`.
 *
 * Because loadApi() short-circuits when DocsAPI is already present, this lets
 * the editor tests exercise mounting, events and save() without fetching the
 * ~700 MB vendor build.
 */
export function installFakeDocsApi(): FakeDocsApi {
  const instances: FakeDocEditor[] = []

  const DocEditor = vi.fn(function (this: FakeDocEditor, _id: string, config: Record<string, unknown>) {
    const events = (config.events || {}) as Record<string, (arg?: unknown) => void>
    Object.assign(this, {
      downloadAs: vi.fn(),
      destroyEditor: vi.fn(),
    })
    instances.push(this as FakeDocEditor)
    // DocsAPI reports onAppReady asynchronously.
    queueMicrotask(() => events.onAppReady?.())
    ;(this as FakeDocEditor & { __events: typeof events }).__events = events
  })

  const api: FakeDocsApi = { DocEditor: DocEditor as never, instances }
  ;(window as unknown as { DocsAPI: unknown }).DocsAPI = api
  return api
}

export function eventsOf(instance: FakeDocEditor): Record<string, (arg?: unknown) => void> {
  return (instance as FakeDocEditor & { __events: Record<string, (arg?: unknown) => void> }).__events
}

export function makeContainer(): HTMLElement {
  const el = document.createElement('div')
  el.style.width = '800px'
  el.style.height = '600px'
  document.body.appendChild(el)
  return el
}

/**
 * Deliver an editor file-stream the way the real iframe would.
 *
 * Dispatching on `window` directly keeps the spec deterministic: jsdom's
 * cross-frame postMessage plumbing is not something the core's contract
 * depends on.
 */
export function emitFileStream(fileName: string, fileType: string, bytes: number[]): void {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: {
        type: 'onlyoffice-file-stream',
        fileName,
        fileType,
        buffer: new Uint8Array(bytes).buffer,
      },
    }),
  )
}

/** Let queued microtasks (save() runs its work through a promise chain) settle. */
export async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
