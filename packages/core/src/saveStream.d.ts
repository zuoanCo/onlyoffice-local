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
declare const STREAM_TYPE = "onlyoffice-file-stream";
declare const SAVE_TIMEOUT_MS = 60000;
export declare function findEditorFrame(container: HTMLElement): HTMLIFrameElement | null;
/**
 * Wrap DownloadFileFromBytes inside the editor iframe so it reports every
 * download to the host. Safe to call repeatedly.
 */
export declare function hookDownloadInFrame(frame: HTMLIFrameElement | null): boolean;
/**
 * Poll until the iframe exposes `AscCommon`, then hook it. Call this once the
 * document is ready. Returns a stop function.
 */
export declare function prepareSaveStream(container: HTMLElement): () => void;
/** Open stream capture before an imperative save(); returns the close function. */
export declare function beginFileStreamCapture(container: HTMLElement): () => void;
export interface FileStreamPayload {
    type: typeof STREAM_TYPE;
    fileName: string;
    fileType: string;
    buffer: ArrayBuffer;
}
export declare function waitForFileStream(timeoutMs?: number): Promise<{
    buffer: ArrayBuffer;
    fileName: string;
    fileType: string;
}>;
export { STREAM_TYPE, SAVE_TIMEOUT_MS };
//# sourceMappingURL=saveStream.d.ts.map