import type { DocumentInput } from './types.js';
export interface ResolvedDocument {
    /** Blob URL handed to DocsAPI, or the original URL when we could not fetch it. */
    url?: string;
    title: string;
    fileType: string;
    /**
     * True when `url` is a Blob URL this module created. The editor revokes it
     * on `setDocument()` / `destroy()`; anything else is left alone.
     */
    owned: boolean;
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
export declare function resolveDocument(input: DocumentInput, hints?: {
    title?: string;
    fileType?: string;
}): Promise<ResolvedDocument>;
//# sourceMappingURL=document.d.ts.map