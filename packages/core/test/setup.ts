/**
 * jsdom implements neither URL.createObjectURL nor revokeObjectURL, and the
 * core leans on Blob URLs for every in-memory document. Provide a tiny in-memory
 * stand-in so the tests exercise the real code path.
 */
const store = new Map<string, Blob>()
let seq = 0

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = ((obj: Blob | MediaSource): string => {
    const id = 'blob:onlyoffice-test/' + ++seq
    store.set(id, obj as Blob)
    return id
  }) as typeof URL.createObjectURL
}

if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = ((id: string): void => {
    store.delete(id)
  }) as typeof URL.revokeObjectURL
}

export {}
