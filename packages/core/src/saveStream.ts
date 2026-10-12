/**
 * Getting the edited bytes back out of the editor.
 *
 * The offline build's own "Download as" writes the file through
 * `AscCommon.DownloadFileFromBytes`. That call lives inside the editor iframe,
 * so the core reaches in and wraps it: the wrapped function always postMessages
 * a copy of the bytes to the host page, and only skips the browser's own
 * download when the host asked for an *imperative* save.
 *
 * That distinction matters. When the user picks "Download as" from the editor's
 * file menu, the browser download should still happen - `OO_FILE_STREAM_ONLY`
 * is only set for the duration of `editor.save()`.
 */

const STREAM_TYPE = 'onlyoffice-file-stream'
const SAVE_TIMEOUT_MS = 60000
const HOOK_RETRY_MS = 200
const HOOK_MAX_ATTEMPTS = 50

type DownloadFn = (data: ArrayBuffer | Uint8Array, fileName: string, mime?: string) => void

interface HookFrame extends Window {
  AscCommon?: { DownloadFileFromBytes?: DownloadFn }
  OO_FILE_STREAM_ONLY?: boolean
}

export function findEditorFrame(container: HTMLElement): HTMLIFrameElement | null {
  return container.querySelector('iframe')
}

function setStreamFlag(frame: HTMLIFrameElement | null, value: boolean): void {
  if (value) window.OO_FILE_STREAM_ONLY = true
  else delete window.OO_FILE_STREAM_ONLY
  if (!frame || !frame.contentWindow) return
  try {
    const win = frame.contentWindow as HookFrame
    if (value) win.OO_FILE_STREAM_ONLY = true
    else delete win.OO_FILE_STREAM_ONLY
  } catch {
    /* cross-origin frame; the host-page flag is enough for same-origin use */
  }
}

/**
 * Wrap DownloadFileFromBytes inside the editor iframe so it reports every
 * download to the host. Safe to call repeatedly.
 */
export function hookDownloadInFrame(frame: HTMLIFrameElement | null): boolean {
  if (!frame) return false
  try {
    const win = frame.contentWindow as HookFrame | null
    if (!win || !win.AscCommon || typeof win.AscCommon.DownloadFileFromBytes !== 'function') {
      return false
    }

    const original = win.AscCommon.DownloadFileFromBytes
    if ((original as DownloadFn & { __ooHooked?: boolean }).__ooHooked) return true

    const hooked: DownloadFn & { __ooHooked?: boolean } = function (data, fileName, mime) {
      let buffer: ArrayBuffer
      if (data instanceof ArrayBuffer) {
        buffer = data.slice(0)
      } else {
        const copy = new Uint8Array(data.byteLength)
        copy.set(data)
        buffer = copy.buffer
      }

      const ext = String(fileName || '').split('.').pop() || ''
      const payload = {
        type: STREAM_TYPE,
        fileName,
        fileType: ext.toLowerCase(),
        buffer,
      }

      try {
        win.parent.postMessage(payload, '*', [buffer])
      } catch {
        win.parent.postMessage({ ...payload, buffer: buffer.slice(0) }, '*')
      }

      // Only swallow the browser download during an imperative save().
      if (win.OO_FILE_STREAM_ONLY === true || window.OO_FILE_STREAM_ONLY === true) return
      original.call(win.AscCommon!, data, fileName, mime)
    }

    hooked.__ooHooked = true
    win.AscCommon.DownloadFileFromBytes = hooked
    return true
  } catch {
    return false
  }
}

/**
 * Poll until the iframe exposes `AscCommon`, then hook it. Call this once the
 * document is ready. Returns a stop function.
 */
export function prepareSaveStream(container: HTMLElement): () => void {
  let attempts = 0
  const timer = window.setInterval(() => {
    attempts += 1
    hookDownloadInFrame(findEditorFrame(container))
    if (attempts > HOOK_MAX_ATTEMPTS) window.clearInterval(timer)
  }, HOOK_RETRY_MS)

  return () => window.clearInterval(timer)
}

/** Open stream capture before an imperative save(); returns the close function. */
export function beginFileStreamCapture(container: HTMLElement): () => void {
  const frame = findEditorFrame(container)
  hookDownloadInFrame(frame)
  setStreamFlag(frame, true)
  return () => setStreamFlag(findEditorFrame(container), false)
}

export interface FileStreamPayload {
  type: typeof STREAM_TYPE
  fileName: string
  fileType: string
  buffer: ArrayBuffer
}

export function waitForFileStream(timeoutMs = SAVE_TIMEOUT_MS): Promise<{
  buffer: ArrayBuffer
  fileName: string
  fileType: string
}> {
  return new Promise((resolve, reject) => {
    function cleanup(): void {
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }

    function onMessage(event: MessageEvent): void {
      const data = event.data as FileStreamPayload | null
      if (!data || data.type !== STREAM_TYPE) return
      if (!data.buffer) {
        cleanup()
        reject(new Error('File stream arrived without a buffer'))
        return
      }
      cleanup()
      resolve({ buffer: data.buffer, fileName: String(data.fileName || ''), fileType: String(data.fileType || '') })
    }

    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('Timed out after ' + timeoutMs + 'ms waiting for the editor file stream'))
    }, timeoutMs)

    window.addEventListener('message', onMessage)
  })
}

export { STREAM_TYPE, SAVE_TIMEOUT_MS }
