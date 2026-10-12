import { describe, expect, it } from 'vitest'
import {
  buildDocsConfig,
  deepMerge,
  detectDocumentType,
  fileNameFromUrl,
  mimeOf,
  normalizeExtension,
} from '../src/normalize.js'

describe('normalizeExtension', () => {
  it('lowercases and drops a leading dot', () => {
    expect(normalizeExtension('.DOCX')).toBe('docx')
    expect(normalizeExtension('Xlsx')).toBe('xlsx')
    expect(normalizeExtension('')).toBe('')
    expect(normalizeExtension(undefined)).toBe('')
  })
})

describe('detectDocumentType', () => {
  it('maps the OOXML families OnlyOffice understands', () => {
    expect(detectDocumentType('docx')).toBe('word')
    expect(detectDocumentType('.XLSX')).toBe('cell')
    expect(detectDocumentType('pptx')).toBe('slide')
    expect(detectDocumentType('pdf')).toBe('pdf')
  })

  it('treats legacy and open formats correctly', () => {
    expect(detectDocumentType('doc')).toBe('word')
    expect(detectDocumentType('ods')).toBe('cell')
    expect(detectDocumentType('odp')).toBe('slide')
    expect(detectDocumentType('csv')).toBe('cell')
  })

  it('falls back to word for anything unknown', () => {
    expect(detectDocumentType('')).toBe('word')
    expect(detectDocumentType('nonsense')).toBe('word')
  })
})

describe('mimeOf', () => {
  it('returns the OOXML mime types', () => {
    expect(mimeOf('docx')).toContain('wordprocessingml.document')
    expect(mimeOf('xlsx')).toContain('spreadsheetml.sheet')
    expect(mimeOf('pptx')).toContain('presentationml.presentation')
    expect(mimeOf('pdf')).toBe('application/pdf')
    expect(mimeOf('zip')).toBe('application/octet-stream')
  })
})

describe('fileNameFromUrl', () => {
  it('ignores query strings and fragments', () => {
    expect(fileNameFromUrl('https://x.test/a/report.docx?v=2')).toBe('report.docx')
    expect(fileNameFromUrl('https://x.test/a/report.pptx#slide=3')).toBe('report.pptx')
  })

  it('falls back rather than returning an empty string', () => {
    expect(fileNameFromUrl('https://x.test/')).toBe('document.docx')
    expect(fileNameFromUrl('')).toBe('document.docx')
  })
})

describe('deepMerge', () => {
  it('merges nested objects without mutating the target', () => {
    const target = { a: 1, nested: { x: 1, y: 2 } }
    const result = deepMerge(target, { nested: { y: 9, z: 3 } })
    expect(result).toEqual({ a: 1, nested: { x: 1, y: 9, z: 3 } })
    expect(target.nested).toEqual({ x: 1, y: 2 })
  })

  it('replaces arrays wholesale instead of merging by index', () => {
    expect(deepMerge({ list: [1, 2, 3] }, { list: [9] })).toEqual({ list: [9] })
  })

  it('ignores undefined values so callers can pass optional keys through', () => {
    expect(deepMerge({ a: 1 }, { a: undefined })).toEqual({ a: 1 })
  })
})

describe('buildDocsConfig', () => {
  const base = {
    documentType: 'word' as const,
    title: 'Report',
    fileType: 'docx',
    url: 'blob:abc',
    events: { onAppReady: () => {} },
  }

  it('derives permissions from the mode', () => {
    expect(buildDocsConfig({ ...base, mode: 'edit' }).document.permissions.edit).toBe(true)
    expect(buildDocsConfig({ ...base, mode: 'view' }).document.permissions.edit).toBe(false)
  })

  it('lets the escape hatch override fields but never the event map', () => {
    const config = buildDocsConfig({
      ...base,
      lang: 'en-US',
      config: {
        editorConfig: { lang: 'zh-CN', customization: { autosave: true } },
        events: { onAppReady: 'hijacked' },
      } as never,
    })
    expect(config.editorConfig.lang).toBe('zh-CN')
    expect(config.editorConfig.customization).toEqual({ autosave: true })
    // The save-stream hook depends on the event map staying ours, so the
    // caller's `events` must be discarded wholesale rather than merged.
    expect(config.events).toBe(base.events)
    expect(typeof config.events.onAppReady).toBe('function')
  })

  it('defaults the user identity so the editor does not complain', () => {
    const config = buildDocsConfig(base)
    expect(config.editorConfig.user).toEqual({ id: 'local-user', name: 'Local User' })
  })
})
