import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnlyOfficeLocalEditor } from '../src/editor.js'
import { __resetApiCache } from '../src/loadApi.js'
import {
  emitFileStream,
  eventsOf,
  flush,
  installFakeDocsApi,
  makeContainer,
  type FakeDocsApi,
} from './helpers.js'

describe('OnlyOfficeLocalEditor', () => {
  let api: FakeDocsApi
  let container: HTMLElement

  beforeEach(() => {
    __resetApiCache()
    api = installFakeDocsApi()
    container = makeContainer()
  })

  afterEach(() => {
    container.remove()
    delete (window as unknown as { DocsAPI?: unknown }).DocsAPI
    delete window.OO_FILE_STREAM_ONLY
    vi.restoreAllMocks()
  })

  it('mounts a DocsAPI instance into the container', async () => {
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:x', title: 'a.docx' })
    await editor.whenReady()

    expect(api.DocEditor).toHaveBeenCalledOnce()
    expect(container.querySelector('iframe') ?? container.querySelector('div[id^="oo-editor-"]')).toBeTruthy()
    editor.destroy()
  })

  it('emits ready, then documentReady, then state changes', async () => {
    const seen: string[] = []
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:x' })
    editor.on('ready', () => seen.push('ready'))
    editor.on('documentReady', () => seen.push('documentReady'))
    editor.on('stateChange', (modified) => seen.push('state:' + String(modified)))
    await editor.whenReady()

    eventsOf(api.instances[0]!).onDocumentReady?.()
    eventsOf(api.instances[0]!).onDocumentStateChange?.({ data: true })

    expect(seen).toEqual(['ready', 'documentReady', 'state:true'])
    editor.destroy()
  })

  it('surfaces editor errors through the error event', async () => {
    const errors: Error[] = []
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:x' })
    editor.on('error', (e) => errors.push(e))
    await editor.whenReady()

    eventsOf(api.instances[0]!).onError?.({ data: { code: 500 } })
    expect(errors).toHaveLength(1)
    expect(errors[0]!.message).toContain('500')
    editor.destroy()
  })

  it('resolves save() with the bytes the editor streams back', async () => {
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:x', title: 'a.docx' })
    await editor.whenReady()

    // The core reaches for an editor iframe; give it one so the capture
    // path has something to find.
    container.appendChild(document.createElement('iframe'))

    const pending = editor.save()
    // save() runs through a promise chain so concurrent calls serialise, which
    // means the listener is not attached synchronously.
    await flush()
    // downloadAs triggers the stream in the real build; simulate that here.
    emitFileStream('a.docx', 'docx', [1, 2, 3])
    const result = await pending

    expect(result.fileName).toBe('a.docx')
    expect(result.fileType).toBe('docx')
    expect(new Uint8Array(result.buffer)).toEqual(new Uint8Array([1, 2, 3]))
    editor.destroy()
  })

  it('passes a format through to downloadAs', async () => {
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:x' })
    await editor.whenReady()
    container.appendChild(document.createElement('iframe'))

    const pending = editor.save('pdf')
    await flush()
    expect(api.instances[0]!.downloadAs).toHaveBeenCalledWith('pdf')
    emitFileStream('a.pdf', 'pdf', [9])
    expect((await pending).fileType).toBe('pdf')
    editor.destroy()
  })

  it('remounts on setMode and keeps listeners attached', async () => {
    const modes: string[] = []
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:x', mode: 'edit' })
    editor.on('ready', () => modes.push(String(editor.config?.editorConfig.mode)))
    await editor.whenReady()

    await editor.setMode('view')
    await editor.whenReady()
    await editor.setMode('edit')
    await editor.whenReady()

    expect(api.DocEditor).toHaveBeenCalledTimes(3)
    expect(modes).toEqual(['edit', 'view', 'edit'])
    editor.destroy()
  })

  it('is a no-op when setMode or setLang is called with the current value', async () => {
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:x', mode: 'edit', lang: 'en-US' })
    await editor.whenReady()
    await editor.setMode('edit')
    await editor.setLang('en-US')
    expect(api.DocEditor).toHaveBeenCalledOnce()
    editor.destroy()
  })

  it('rebuilds when the document is replaced', async () => {
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:one', title: 'one.docx' })
    await editor.whenReady()
    await editor.setDocument('blob:two', { title: 'two.docx' })
    await editor.whenReady()
    expect(api.DocEditor).toHaveBeenCalledTimes(2)
    expect(editor.config?.document.title).toBe('two.docx')
    editor.destroy()
  })

  it('destroy() is idempotent and revokes Blob URLs it created', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    const editor = new OnlyOfficeLocalEditor({ container, document: new Uint8Array([1, 2]) })
    await editor.whenReady()

    editor.destroy()
    editor.destroy()
    expect(revoke).toHaveBeenCalled()
    expect(editor.isDestroyed).toBe(true)
    expect(container.innerHTML).toBe('')
  })

  it('refuses to save after destroy instead of hanging', async () => {
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:x' })
    await editor.whenReady()
    editor.destroy()
    expect(() => editor.save()).toThrow(/destroyed/)
  })

  it('keeps firing other listeners when one of them throws', async () => {
    const calls: string[] = []
    const editor = new OnlyOfficeLocalEditor({ container, document: 'blob:x' })
    editor.on('stateChange', () => {
      throw new Error('listener blew up')
    })
    editor.on('stateChange', () => calls.push('second'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await editor.whenReady()
    eventsOf(api.instances[0]!).onDocumentStateChange?.({ data: false })
    expect(calls).toEqual(['second'])
    editor.destroy()
  })
})
