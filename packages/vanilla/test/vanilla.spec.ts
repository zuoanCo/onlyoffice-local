import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOnlyOfficeLocal, downloadSaveResult } from '../src/index.js'

function fakeDocsApi(): { instances: { destroyEditor: () => void }[] } {
  const instances: { destroyEditor: () => void }[] = []
  class DocEditor {
    destroyEditor = vi.fn()
    downloadAs = vi.fn()
    constructor(_id: string, config: Record<string, unknown>) {
      instances.push(this as never)
      const events = (config.events || {}) as Record<string, () => void>
      queueMicrotask(() => events.onAppReady?.())
    }
  }
  ;(window as unknown as { DocsAPI: unknown }).DocsAPI = { DocEditor }
  return { instances }
}

describe('createOnlyOfficeLocal', () => {
  let container: HTMLElement

  beforeEach(() => {
    ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = () => 'blob:vanilla-test'
    ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = () => {}
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    delete (window as unknown as { DocsAPI?: unknown }).DocsAPI
    vi.restoreAllMocks()
  })

  it('returns synchronously so listeners can attach before ready fires', async () => {
    const api = fakeDocsApi()
    const handle = createOnlyOfficeLocal({ container, document: 'blob:x', title: 'a.docx' })

    let readySeen = false
    handle.on('ready', () => {
      readySeen = true
    })

    await handle.whenReady()
    expect(readySeen).toBe(true)
    expect(api.instances).toHaveLength(1)
    handle.destroy()
  })

  it('tears the editor down through the handle', async () => {
    fakeDocsApi()
    const handle = createOnlyOfficeLocal({ container, document: 'blob:x' })
    await handle.whenReady()
    handle.destroy()
    expect(handle.editor.isDestroyed).toBe(true)
    expect(container.innerHTML).toBe('')
  })
})

describe('downloadSaveResult', () => {
  it('clicks a generated anchor with the right filename', () => {
    ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = () => 'blob:download'
    ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = () => {}
    let clicked: HTMLAnchorElement | null = null
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked = this
    })

    downloadSaveResult({ buffer: new Uint8Array([1, 2, 3]).buffer, fileName: 'out.pdf', fileType: 'pdf' })

    expect(clicked).not.toBeNull()
    expect(clicked!.download).toBe('out.pdf')
    expect(clicked!.href).toContain('blob:')
  })
})
