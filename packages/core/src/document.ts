import { bufferToBlobUrl, fileNameFromUrl, normalizeExtension } from './normalize.js'
import type { DocumentInput } from './types.js'

export interface ResolvedDocument {
  /** Blob URL handed to DocsAPI, or the original URL when we could not fetch it. */
  url?: string
  title: string
  fileType: string
  /**
   * True when `url` is a Blob URL this module created. The editor revokes it
   * on `setDocument()` / `destroy()`; anything else is left alone.
   */
  owned: boolean
}

function extensionOf(name: string): string {
  const ext = name.split('.').pop() ?? ''
  return normalizeExtension(ext)
}

function nameOf(input: DocumentInput): string {
  if (typeof input === 'string') return fileNameFromUrl(input)
  if (typeof File !== 'undefined' && input instanceof File) return input.name
  return ''
}

/**
 * Turn any supported input into something DocsAPI can open.
 *
 * Remote URLs are fetched and converted to a Blob URL when the server permits
 * it. That fetch is what keeps the "nothing is uploaded, and nothing leaves
 * the page" promise honest: the document ends up in memory in this tab.
 * A CORS failure is not fatal - the original URL is passed through so a
 * server that does allow the editor to read it still works.
 */
export async function resolveDocument(
  input: DocumentInput,
  hints?: { title?: string; fileType?: string },
): Promise<ResolvedDocument> {
  const fromName = nameOf(input)
  const title = hints?.title || fromName || 'document'
  const fileType = normalizeExtension(hints?.fileType) || extensionOf(fromName) || 'docx'

  if (typeof input === 'string') {
    const raw = input.trim()
    if (raw.startsWith('blob:') || raw.startsWith('data:')) {
      return { url: raw, title, fileType, owned: false }
    }
    if (/^https?:/i.test(raw)) {
      try {
        const res = await fetch(raw)
        if (res.ok) {
          const blob = await res.blob()
          const url = bufferToBlobUrl(blob, fileType)
          return { url, title, fileType, owned: true }
        }
      } catch {
        // Fall through to passing the URL through unchanged.
      }
      return { url: raw, title, fileType, owned: false }
    }
    // A bare name is not a URL; DocsAPI cannot open it, so fail loudly rather
    // than rendering an empty editor with no explanation.
    throw new Error(
      'Unsupported document: "' + raw + '". Pass a File, Blob, ArrayBuffer, or an http(s)/blob:/data: URL.',
    )
  }

  const url = bufferToBlobUrl(input, fileType)
  return { url, title, fileType, owned: true }
}
