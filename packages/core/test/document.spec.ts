import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveDocument } from '../src/document.js'

describe('resolveDocument', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('creates and marks a Blob URL for in-memory input', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const doc = await resolveDocument(bytes, { title: 'a.docx', fileType: 'docx' })
    expect(doc.url).toMatch(/^blob:/)
    expect(doc.owned).toBe(true)
    expect(doc.title).toBe('a.docx')
    expect(doc.fileType).toBe('docx')
  })

  it('infers the title and type from a File', async () => {
    const file = new File([new Uint8Array([1])], 'quarterly.xlsx')
    const doc = await resolveDocument(file)
    expect(doc.title).toBe('quarterly.xlsx')
    expect(doc.fileType).toBe('xlsx')
  })

  it('passes blob: and data: URLs through without taking ownership', async () => {
    const blob = await resolveDocument('blob:already-here')
    expect(blob.owned).toBe(false)
    expect(blob.url).toBe('blob:already-here')

    const data = await resolveDocument('data:text/plain;base64,QQ==')
    expect(data.owned).toBe(false)
  })

  it('fetches a remote URL into a Blob URL so nothing leaves the tab again', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([1, 2]), { status: 200 }),
    )
    const doc = await resolveDocument('https://x.test/report.docx')
    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(doc.url).toMatch(/^blob:/)
    expect(doc.owned).toBe(true)
    expect(doc.title).toBe('report.docx')
  })

  it('falls back to the original URL when the fetch is blocked by CORS', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('CORS'))
    const doc = await resolveDocument('https://x.test/report.docx')
    expect(doc.owned).toBe(false)
    expect(doc.url).toBe('https://x.test/report.docx')
  })

  it('falls back when the server answers with an error status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }))
    const doc = await resolveDocument('https://x.test/missing.docx')
    expect(doc.url).toBe('https://x.test/missing.docx')
    expect(doc.owned).toBe(false)
  })

  it('rejects a bare filename instead of opening an empty editor', async () => {
    await expect(resolveDocument('report.docx')).rejects.toThrow(/Unsupported document/)
  })
})
