import type { DocsApiGlobal } from './types.js';
export { OnlyOfficeLocalEditor } from './editor.js';
export { Emitter } from './emitter.js';
export { loadApi, normalizeBaseUrl, apiScriptUrl, __resetApiCache } from './loadApi.js';
export { buildDocsConfig, bufferToBlob, bufferToBlobUrl, deepMerge, detectDocumentType, fileNameFromUrl, mimeOf, normalizeExtension, } from './normalize.js';
export { resolveDocument, type ResolvedDocument } from './document.js';
export { STREAM_TYPE, SAVE_TIMEOUT_MS, beginFileStreamCapture, findEditorFrame, hookDownloadInFrame, prepareSaveStream, waitForFileStream, type FileStreamPayload, } from './saveStream.js';
export type { DocsApiConfig, DocsApiGlobal, DocsApiInstance, DocumentInput, DocumentType, EditorEventName, EditorEvents, EditorPermissions, OnlyOfficeConfig, OnlyOfficeDocumentConfig, OnlyOfficeEditorConfig, OnlyOfficeLocalOptions, SaveResult, Unsubscribe, UserInfo, } from './types.js';
/**
 * Ambient declaration for the self-hosted OnlyOffice offline build.
 *
 * This lives in `index.ts` rather than in `types.ts` because index is the one
 * file every consumer is guaranteed to load, so the augmentation is always
 * present in their program.
 */
declare global {
    interface Window {
        /** Present once the vendor build's api.js has executed. */
        DocsAPI?: DocsApiGlobal;
        /**
         * Set by the core for the duration of an imperative save() so the editor's
         * own browser download is suppressed and only the postMessage stream is
         * emitted.
         */
        OO_FILE_STREAM_ONLY?: boolean;
    }
}
//# sourceMappingURL=index.d.ts.map