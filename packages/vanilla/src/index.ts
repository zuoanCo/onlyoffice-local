/**
 * Vanilla JS entry point.
 *
 * There is no framework here on purpose: `@onlyoffice-local/core` is already
 * plain TypeScript, so this package exists to give plain-JS consumers a single
 * installable name, one convenient factory, and a download helper.
 */

import { OnlyOfficeLocalEditor } from '@onlyoffice-local/core'
import type {
  DocumentInput,
  OnlyOfficeConfig,
  SaveResult,
  Unsubscribe,
  UserInfo,
} from '@onlyoffice-local/core'

export interface CreateEditorOptions {
  container: HTMLElement | string
  document: DocumentInput
  baseUrl?: string
  title?: string
  fileType?: string
  mode?: 'edit' | 'view'
  lang?: string
  user?: UserInfo
  width?: string
  height?: string
  config?: OnlyOfficeConfig
}

export interface OnlyOfficeLocalHandle {
  /** The underlying editor, for anything this wrapper does not surface. */
  readonly editor: OnlyOfficeLocalEditor
  /** Resolves once the first mount attempt has settled. */
  whenReady(): Promise<void>
  save(format?: string): Promise<SaveResult>
  setDocument(document: DocumentInput, hints?: { title?: string; fileType?: string }): Promise<void>
  setMode(mode: 'edit' | 'view'): Promise<void>
  setLang(lang: string): Promise<void>
  destroy(): void
}

export interface CreateEditorResult extends OnlyOfficeLocalHandle {
  /** Subscribe to an editor event; returns an unsubscribe function. */
  on: OnlyOfficeLocalEditor['on']
  off: OnlyOfficeLocalEditor['off']
  once: OnlyOfficeLocalEditor['once']
}

/**
 * Mount an editor into `container`.
 *
 * Returns synchronously - the editor mounts in the background - so callers can
 * subscribe to events without racing the first `ready`.
 */
export function createOnlyOfficeLocal(options: CreateEditorOptions): CreateEditorResult {
  const editor = new OnlyOfficeLocalEditor(options)
  return {
    editor,
    whenReady: () => editor.whenReady(),
    save: (format?: string) => editor.save(format),
    setDocument: (document, hints) => editor.setDocument(document, hints),
    setMode: (mode) => editor.setMode(mode),
    setLang: (lang) => editor.setLang(lang),
    destroy: () => editor.destroy(),
    on: (event, handler) => editor.on(event, handler),
    off: (event, handler) => editor.off(event, handler),
    once: (event, handler) => editor.once(event, handler),
  }
}

/**
 * Trigger a browser download for the bytes returned by `save()`.
 *
 * Kept here rather than in the core so the core stays free of any policy
 * about what a host application should do with a file.
 */
export function downloadSaveResult(
  result: SaveResult,
  doc: Document = globalThis.document,
): void {
  const bytes = new Uint8Array(result.buffer)
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: blobTypeFor(result.fileType),
  })
  const url = URL.createObjectURL(blob)
  const anchor = doc.createElement('a')
  anchor.href = url
  anchor.download = result.fileName || 'document'
  doc.body.appendChild(anchor)
  anchor.click()
  doc.body.removeChild(anchor)
  // Give the browser a moment to start the transfer before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function blobTypeFor(fileType: string): string {
  switch (String(fileType).toLowerCase()) {
    case 'pdf':
      return 'application/pdf'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default:
      return 'application/octet-stream'
  }
}

export { OnlyOfficeLocalEditor }
export type {
  DocumentInput,
  OnlyOfficeConfig,
  SaveResult,
  Unsubscribe,
  UserInfo,
}
