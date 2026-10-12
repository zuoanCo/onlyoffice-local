/**
 * `useOnlyOfficeLocal` - the headless React binding.
 *
 * Owns exactly one core editor for the lifetime of the component and keeps it
 * in sync with the options passed in. Returns imperative handles plus the
 * reactive loading/error state so callers can render their own chrome.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { OnlyOfficeLocalEditor } from '@onlyoffice-local/core'
import type {
  DocumentInput,
  OnlyOfficeConfig,
  SaveResult,
  UserInfo,
} from '@onlyoffice-local/core'

export interface UseOnlyOfficeLocalOptions {
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

export interface UseOnlyOfficeLocalResult {
  /** Attach to the element the editor should mount into. */
  containerRef: RefObject<HTMLDivElement>
  /** The underlying core editor, once mounted. */
  editor: OnlyOfficeLocalEditor | null
  loading: boolean
  error: Error | null
  modified: boolean
  /** Resolve once the first mount attempt has settled. */
  whenReady: () => Promise<void>
  save: (format?: string) => Promise<SaveResult | null>
  setDocument: (document: DocumentInput, hints?: { title?: string; fileType?: string }) => Promise<void>
  setMode: (mode: 'edit' | 'view') => Promise<void>
  setLang: (lang: string) => Promise<void>
  destroy: () => void
}

export function useOnlyOfficeLocal(
  options: UseOnlyOfficeLocalOptions,
): UseOnlyOfficeLocalResult {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<OnlyOfficeLocalEditor | null>(null)
  const [editor, setEditor] = useState<OnlyOfficeLocalEditor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [modified, setModified] = useState(false)

  // Keep the latest options in a ref so the mount effect does not need to be
  // re-run (and the editor rebuilt) on every render with a fresh object.
  const optionsRef = useRef(options)
  optionsRef.current = options

  const {
    document: initialDocument,
    baseUrl = '/',
    title,
    fileType,
    mode = 'edit',
    lang = 'en-US',
    user,
    width,
    height,
    config,
  } = options

  // A stable identity for the document, so inline literals do not remount the
  // editor on every render.
  const documentKey = useMemo(() => documentIdentity(initialDocument), [initialDocument])

  useEffect(() => {
    const host = containerRef.current
    if (!host) return

    const instance = new OnlyOfficeLocalEditor({
      container: host,
      document: optionsRef.current.document,
      title,
      fileType,
      baseUrl,
      lang,
      mode,
      user,
      width,
      height,
      config,
    })

    instance.on('documentReady', () => setLoading(false))
    instance.on('stateChange', setModified)
    instance.on('error', (err) => {
      setError(err)
      setLoading(false)
    })

    editorRef.current = instance
    setEditor(instance)
    void instance.whenReady()

    return () => {
      instance.destroy()
      editorRef.current = null
      setEditor(null)
    }
    // documentKey is the value that actually decides when to rebuild.
  }, [documentKey, baseUrl, mode, lang, title, fileType, width, height, config])

  const whenReady = useCallback(() => editorRef.current?.whenReady() ?? Promise.resolve(), [])
  const save = useCallback(
    (format?: string) => (editorRef.current ? editorRef.current.save(format) : Promise.resolve(null)),
    [],
  )
  const setDocument = useCallback(
    (doc: DocumentInput, hints?: { title?: string; fileType?: string }) =>
      editorRef.current?.setDocument(doc, hints) ?? Promise.resolve(),
    [],
  )
  const setMode = useCallback(
    (next: 'edit' | 'view') => editorRef.current?.setMode(next) ?? Promise.resolve(),
    [],
  )
  const setLang = useCallback(
    (next: string) => editorRef.current?.setLang(next) ?? Promise.resolve(),
    [],
  )
  const destroy = useCallback(() => editorRef.current?.destroy(), [])

  return {
    containerRef,
    editor,
    loading,
    error,
    modified,
    whenReady,
    save,
    setDocument,
    setMode,
    setLang,
    destroy,
  }
}

/**
 * A comparable identity for a document input.
 *
 * React re-renders constantly, and `document: file` in the caller would be a
 * new object each time; keying the mount effect on this prevents remounting
 * the editor on every keystroke somewhere else in the tree.
 */
function documentIdentity(input: DocumentInput): string {
  if (typeof input === 'string') return 'url:' + input
  if (input instanceof ArrayBuffer) return 'bytes:' + byteLength(input)
  if (typeof File !== 'undefined' && input instanceof File) {
    return 'file:' + input.name + ':' + input.size + ':' + input.lastModified
  }
  if (input instanceof Blob) return 'blob:' + input.size + ':' + input.type
  return 'bytes:' + byteLength(input)
}

function byteLength(input: ArrayBuffer | Uint8Array): number {
  return input instanceof Uint8Array ? input.byteLength : input.byteLength
}
