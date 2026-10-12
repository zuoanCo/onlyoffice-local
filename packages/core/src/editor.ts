import { Emitter } from './emitter.js'
import { resolveDocument, type ResolvedDocument } from './document.js'
import { loadApi, normalizeBaseUrl } from './loadApi.js'
import { buildDocsConfig, detectDocumentType } from './normalize.js'
import {
  beginFileStreamCapture,
  findEditorFrame,
  hookDownloadInFrame,
  prepareSaveStream,
  waitForFileStream,
} from './saveStream.js'
import type {
  DocsApiConfig,
  DocsApiInstance,
  EditorEventName,
  EditorEvents,
  OnlyOfficeLocalOptions,
  SaveResult,
  Unsubscribe,
} from './types.js'

let mountSeq = 0

function resolveContainer(container: HTMLElement | string): HTMLElement {
  if (typeof container === 'string') {
    const el = document.getElementById(container)
    if (!el) throw new Error('No element with id "' + container + '"')
    return el
  }
  if (!container || typeof container.appendChild !== 'function') {
    throw new Error('container must be an HTMLElement or an element id')
  }
  return container
}

/**
 * A mounted OnlyOffice editor bound to one container.
 *
 * Instances are single-use in the sense that DocsAPI cannot be reconfigured
 * after construction, so `setMode`, `setLang` and `setDocument` transparently
 * tear the iframe down and build a fresh one. The object identity, listeners
 * and promise-based API stay stable across those swaps.
 */
export class OnlyOfficeLocalEditor {
  private readonly host: HTMLElement
  private readonly emitter = new Emitter<EditorEvents>()
  private readonly baseUrl: string

  private options: OnlyOfficeLocalOptions
  private doc: ResolvedDocument | null = null
  private mountNode: HTMLDivElement | null = null
  private docEditor: DocsApiInstance | null = null
  private stopPrepare: (() => void) | null = null

  /** Blob URLs this instance created and is therefore responsible for. */
  private ownedUrls: string[] = []
  private saveChain: Promise<unknown> = Promise.resolve()
  private building: Promise<void> = Promise.resolve()
  private lastConfig: DocsApiConfig | null = null
  private destroyed = false

  constructor(options: OnlyOfficeLocalOptions & { container: HTMLElement | string }) {
    const { container, ...rest } = options
    this.host = resolveContainer(container)
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.options = { ...rest, baseUrl: this.baseUrl }

    if (!this.host.style.position) this.host.style.position = 'relative'

    this.building = this.build().catch((err: unknown) => {
      this.emitError(err)
    })
  }

  /** Resolves when the first mount attempt has settled (success or error). */
  whenReady(): Promise<void> {
    return this.building
  }

  /** The config object most recently handed to DocsAPI. Useful when debugging. */
  get config(): DocsApiConfig | null {
    return this.lastConfig
  }

  /** Escape hatch to the raw DocsAPI instance. */
  getDocEditor(): unknown {
    return this.docEditor
  }

  // ------------------------------------------------------------- events ---

  on<K extends EditorEventName>(event: K, handler: (payload: EditorEvents[K]) => void): Unsubscribe {
    return this.emitter.on(event, handler)
  }

  once<K extends EditorEventName>(event: K, handler: (payload: EditorEvents[K]) => void): Unsubscribe {
    return this.emitter.once(event, handler)
  }

  off<K extends EditorEventName>(event: K, handler: (payload: EditorEvents[K]) => void): void {
    this.emitter.off(event, handler)
  }

  // -------------------------------------------------------------- build ---

  private async build(): Promise<void> {
    if (this.destroyed) return

    const resolved = await resolveDocument(this.options.document, {
      title: this.options.title,
      fileType: this.options.fileType,
    })

    if (this.destroyed) {
      if (resolved.owned) URL.revokeObjectURL(resolved.url!)
      return
    }

    if (resolved.owned) this.ownedUrls.push(resolved.url!)
    this.doc = resolved

    await loadApi(this.baseUrl)
    if (this.destroyed) return

    const docsApi = window.DocsAPI
    if (!docsApi) throw new Error('DocsAPI is not available after loading ' + this.baseUrl)

    this.teardownIframe()

    const mountId = this.options.placeholderId || 'oo-editor-' + ++mountSeq
    const mount = document.createElement('div')
    mount.id = mountId
    mount.style.width = '100%'
    mount.style.height = '100%'
    this.host.appendChild(mount)
    this.mountNode = mount

    const config = buildDocsConfig({
      documentType: detectDocumentType(resolved.fileType),
      title: resolved.title,
      fileType: resolved.fileType,
      url: resolved.url,
      mode: this.options.mode,
      lang: this.options.lang,
      user: this.options.user,
      width: this.options.width,
      height: this.options.height,
      config: this.options.config,
      events: {
        onAppReady: () => this.emitter.emit('ready', undefined),
        onDocumentReady: () => {
          this.stopPrepare = prepareSaveStream(this.host)
          this.emitter.emit('documentReady', undefined)
        },
        onDocumentStateChange: (event: { data?: boolean }) => {
          this.emitter.emit('stateChange', !!(event && event.data))
        },
        onRequestClose: () => this.emitter.emit('requestClose', undefined),
        onMetaChange: (event: { data?: { title?: string } }) => {
          const title = event && event.data && event.data.title
          if (title) this.emitter.emit('metaChange', title)
        },
        onError: (event: { data?: unknown }) => {
          this.emitError(new Error('Editor error: ' + JSON.stringify(event && event.data)))
        },
        // The offline save path runs through the file-stream hook, so the
        // default callback URL round-trip is deliberately not used.
        onDownloadAs: () => {},
      },
    })
    this.lastConfig = config

    this.docEditor = new docsApi.DocEditor(mountId, config as unknown as Record<string, unknown>)
  }

  /** Replace the document. Any Blob URL the old document owned is revoked. */
  async setDocument(document: OnlyOfficeLocalOptions['document'], hints?: { title?: string; fileType?: string }): Promise<void> {
    this.assertAlive()
    this.options = {
      ...this.options,
      document,
      ...(hints?.title ? { title: hints.title } : {}),
      ...(hints?.fileType ? { fileType: hints.fileType } : {}),
    }
    await this.rebuild()
  }

  /** Switch between edit and view mode. */
  async setMode(mode: 'edit' | 'view'): Promise<void> {
    this.assertAlive()
    if (this.options.mode === mode) return
    this.options = { ...this.options, mode }
    await this.rebuild()
  }

  /** Switch the editor chrome language (e.g. `en-US`, `zh-CN`). */
  async setLang(lang: string): Promise<void> {
    this.assertAlive()
    if (this.options.lang === lang) return
    this.options = { ...this.options, lang }
    await this.rebuild()
  }

  /** Force a fresh DocsAPI build, e.g. after mutating `config` in place. */
  async rebuild(): Promise<void> {
    this.assertAlive()
    this.teardownIframe()
    this.releaseDocument()
    this.building = this.build().catch((err: unknown) => this.emitError(err))
    return this.building
  }

  // --------------------------------------------------------------- save ---

  /**
   * Ask the editor to write the current document out and resolve with its
   * bytes. Pass a format (`'pdf'`, `'docx'`, ...) to convert on the way out.
   *
   * Calls are serialised: the editor's download path is a single global
   * postMessage channel, so overlapping saves would cross their responses.
   */
  save(format?: string): Promise<SaveResult> {
    this.assertAlive()
    if (!this.docEditor) return Promise.reject(new Error('Editor is not ready yet'))

    const run = async (): Promise<SaveResult> => {
      const frame = findEditorFrame(this.host)
      hookDownloadInFrame(frame)
      const endCapture = beginFileStreamCapture(this.host)
      const pending = waitForFileStream()
      try {
        if (format) this.docEditor!.downloadAs(format)
        else this.docEditor!.downloadAs()
        return await pending
      } finally {
        endCapture()
      }
    }

    const result = this.saveChain.then(run, run)
    this.saveChain = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  // ------------------------------------------------------------ teardown ---

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true

    this.teardownIframe()
    this.releaseDocument()
    this.emitter.emit('destroy', undefined)
    this.emitter.clear()
    this.host.innerHTML = ''
  }

  get isDestroyed(): boolean {
    return this.destroyed
  }

  private teardownIframe(): void {
    this.stopPrepare?.()
    this.stopPrepare = null
    try {
      this.docEditor?.destroyEditor()
    } catch {
      /* the iframe may already be gone */
    }
    this.docEditor = null
    this.mountNode = null
    this.host.innerHTML = ''
  }

  private releaseDocument(): void {
    for (const url of this.ownedUrls) {
      try {
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    }
    this.ownedUrls = []
    this.doc = null
  }

  private assertAlive(): void {
    if (this.destroyed) throw new Error('This editor has been destroyed')
  }

  private emitError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err))
    // Nothing listening is the normal case for optional error reporting.
    if (this.emitter.listenerCount('error') === 0) {
      console.error('[onlyoffice-local]', error)
    }
    this.emitter.emit('error', error)
  }
}
