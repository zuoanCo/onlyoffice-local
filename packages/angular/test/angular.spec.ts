import { Component, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnlyOfficeLocalComponent, OnlyOfficeLocalService } from '../src/index.js'
import type { OnlyOfficeLocalEditorConfig } from '../src/index.js'

function fakeDocsApi() {
  const built: { config: Record<string, unknown> }[] = []
  class DocEditor {
    destroyEditor = vi.fn()
    downloadAs = vi.fn()
    constructor(_id: string, config: Record<string, unknown>) {
      built.push({ config })
      const events = (config.events || {}) as Record<string, (arg?: unknown) => void>
      queueMicrotask(() => events.onAppReady?.())
    }
  }
  ;(window as unknown as { DocsAPI: unknown }).DocsAPI = { DocEditor }
  return built
}

function fire(config: Record<string, unknown>, name: string, arg?: unknown): void {
  const events = config.events as Record<string, (a?: unknown) => void>
  events[name]?.(arg)
}

describe('OnlyOfficeLocalService', () => {
  let host: HTMLElement

  beforeEach(() => {
    ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = () => 'blob:ng-test'
    ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = () => {}
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    host.remove()
    delete (window as unknown as { DocsAPI?: unknown }).DocsAPI
  })

  it('creates an editor bound to the container and tracks it', async () => {
    fakeDocsApi()
    const service = new OnlyOfficeLocalService()
    const editor = service.create(host, { document: 'blob:x', title: 'a.docx' })
    await editor.whenReady()

    expect(editor.isDestroyed).toBe(false)
    service.destroyAll()
    expect(editor.isDestroyed).toBe(true)
  })

  it('leaves unregistered editors alone', () => {
    fakeDocsApi()
    const service = new OnlyOfficeLocalService()
    const editor = service.create(host, { document: 'blob:x', autoRegister: false })
    service.destroyAll()
    expect(editor.isDestroyed).toBe(false)
  })
})

@Component({
  standalone: true,
  imports: [OnlyOfficeLocalComponent],
  template: `
    <oo-editor
      [editor]="cfg()"
      (documentReady)="readyFired = true"
      (stateChange)="modified = $event"
      (errorEvent)="lastError = $event"
    />
  `,
})
class HostComponent {
  cfg = signal<OnlyOfficeLocalEditorConfig>({ document: 'blob:x', title: 'a.docx' })
  readyFired = false
  modified: boolean | null = null
  lastError: Error | null = null
}

describe('<oo-editor>', () => {
  let built: { config: Record<string, unknown> }[]

  beforeEach(() => {
    ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = () => 'blob:ng-test'
    ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = () => {}
    built = fakeDocsApi()
  })

  afterEach(() => {
    delete (window as unknown as { DocsAPI?: unknown }).DocsAPI
    vi.restoreAllMocks()
  })

  it('mounts an editor and emits documentReady', async () => {
    const fixture = TestBed.createComponent(HostComponent)
    const host = fixture.componentInstance
    fixture.detectChanges()

    await vi.waitFor(() => expect(built).toHaveLength(1))
    fire(built[0]!.config, 'onDocumentReady')
    fixture.detectChanges()

    expect(host.readyFired).toBe(true)
    fixture.destroy()
  })

  it('forwards state changes and errors', async () => {
    const fixture = TestBed.createComponent(HostComponent)
    const host = fixture.componentInstance
    fixture.detectChanges()

    await vi.waitFor(() => expect(built).toHaveLength(1))
    fire(built[0]!.config, 'onDocumentStateChange', { data: true })
    fire(built[0]!.config, 'onError', { data: { code: 7 } })
    fixture.detectChanges()

    expect(host.modified).toBe(true)
    expect(host.lastError).toBeInstanceOf(Error)
    fixture.destroy()
  })

  it('rebuilds when a different document is supplied', async () => {
    const fixture = TestBed.createComponent(HostComponent)
    const host = fixture.componentInstance
    fixture.detectChanges()

    await vi.waitFor(() => expect(built).toHaveLength(1))
    host.cfg.set({ document: 'blob:y', title: 'b.xlsx' })
    fixture.detectChanges()

    await vi.waitFor(() => expect(built).toHaveLength(2))
    fixture.destroy()
  })
})
