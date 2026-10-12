import type { DocumentType, OnlyOfficeConfig, DocsApiConfig } from './types.js';
export declare function normalizeExtension(ext: string | undefined): string;
export declare function detectDocumentType(fileType: string | undefined): DocumentType;
export declare function mimeOf(fileType: string | undefined): string;
export declare function bufferToBlob(data: ArrayBuffer | Uint8Array | Blob, fileType?: string): Blob;
export declare function bufferToBlobUrl(data: ArrayBuffer | Uint8Array | Blob, fileType?: string): string;
/**
 * Pull a usable filename out of a URL, falling back to a sane default.
 *
 * Absolute URLs are parsed so a bare origin such as `https://x.test/` does not
 * report the hostname as the filename; relative paths are split by hand.
 */
export declare function fileNameFromUrl(url: string): string;
/**
 * Deep-merge `source` over `target`, returning a new object.
 *
 * Only plain objects are merged; arrays and scalars are replaced wholesale,
 * which is what callers expect for things like `customization` flags.
 */
export declare function deepMerge<T extends Record<string, unknown>>(target: T, source?: Record<string, unknown>): T;
export interface BuildDocsConfigInput {
    documentType: DocumentType;
    title: string;
    fileType: string;
    url?: string;
    key?: string;
    mode?: string;
    lang?: string;
    user?: {
        id?: string;
        name?: string;
    };
    width?: string;
    height?: string;
    events: Record<string, unknown>;
    config?: OnlyOfficeConfig;
}
export declare function buildDocsConfig(input: BuildDocsConfigInput): DocsApiConfig;
//# sourceMappingURL=normalize.d.ts.map