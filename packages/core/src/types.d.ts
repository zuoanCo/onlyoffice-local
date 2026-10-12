/**
 * Public type surface for @onlyoffice-local/core.
 *
 * Nothing here references a UI framework on purpose: the core is plain
 * TypeScript so the same code can back the Vue, React, Angular and vanilla
 * adapters without duplicating the document/save plumbing.
 */
export type DocumentType = 'word' | 'cell' | 'slide' | 'pdf';
/**
 * Anything the editor knows how to open.
 *
 *  - `string`  an http(s), `blob:` or `data:` URL (remote URLs are fetched and
 *              turned into a Blob URL when the server allows CORS)
 *  - `Blob` / `File`  read straight from memory or a file picker
 *  - `ArrayBuffer` / `Uint8Array`  raw bytes
 */
export type DocumentInput = string | Blob | File | ArrayBuffer | Uint8Array;
export interface UserInfo {
    id?: string;
    name?: string;
}
export interface EditorPermissions {
    edit?: boolean;
    download?: boolean;
    print?: boolean;
    review?: boolean;
}
export interface OnlyOfficeDocumentConfig {
    fileType?: string;
    key?: string;
    title?: string;
    url?: string;
    permissions?: EditorPermissions;
    isForm?: boolean;
    [key: string]: unknown;
}
export interface OnlyOfficeEditorConfig {
    lang?: string;
    mode?: 'edit' | 'view';
    user?: UserInfo;
    customization?: Record<string, unknown>;
    [key: string]: unknown;
}
/**
 * Escape hatch. Anything set here is deep-merged over the config the core
 * builds, so framework adapters do not each need their own merge logic.
 */
export interface OnlyOfficeConfig {
    document?: OnlyOfficeDocumentConfig;
    editorConfig?: OnlyOfficeEditorConfig;
    width?: string | number;
    height?: string | number;
    type?: DocumentType;
    events?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface OnlyOfficeLocalOptions {
    /** Same origin as the page; points at the root of the vendor build. Defaults to `/`. */
    baseUrl?: string;
    document: DocumentInput;
    /** Required when `document` has no filename (ArrayBuffer, anonymous Blob). */
    title?: string;
    /** Extension without the dot, e.g. `docx`. Inferred from the filename when possible. */
    fileType?: string;
    mode?: 'edit' | 'view';
    lang?: string;
    user?: UserInfo;
    width?: string;
    height?: string;
    config?: OnlyOfficeConfig;
    /** Extra DOM id for the mount node. Generated when omitted. */
    placeholderId?: string;
}
export interface SaveResult {
    /** Edited bytes. Copy or transfer this before the buffer is detached. */
    buffer: ArrayBuffer;
    fileName: string;
    fileType: string;
}
/** The exact config object handed to `DocsAPI.DocEditor`. */
export interface DocsApiConfig {
    documentType: DocumentType;
    document: {
        url?: string;
        title: string;
        fileType: string;
        key: string;
        isForm?: boolean;
        permissions: {
            edit: boolean;
            download: boolean;
            print: boolean;
        };
        [key: string]: unknown;
    };
    editorConfig: {
        mode: string;
        lang: string;
        user: {
            id: string;
            name: string;
        };
        [key: string]: unknown;
    };
    width: string;
    height: string;
    events: Record<string, unknown>;
    [key: string]: unknown;
}
export interface EditorEvents {
    /** DocsAPI fired `onAppReady`. The iframe exists but the document may still be loading. */
    ready: void;
    /** The document has been converted and is interactive. */
    documentReady: void;
    /** Boolean: whether the document currently has unsaved changes. */
    stateChange: boolean;
    /** The user asked to close the editor. */
    requestClose: void;
    /** The document title changed. */
    metaChange: string;
    error: Error;
    /** Emitted once, after teardown. */
    destroy: void;
}
export type EditorEventName = keyof EditorEvents;
export type Unsubscribe = () => void;
/** The subset of the editor instance the core relies on. */
export interface DocsApiInstance {
    destroyEditor: () => void;
    downloadAs: (format?: string) => void;
    setMetaData?: (meta: {
        title: string;
    }) => void;
    [key: string]: unknown;
}
/** Shape of `window.DocsAPI` once the vendor build's api.js has executed. */
export interface DocsApiGlobal {
    DocEditor: new (placeholderId: string, config: Record<string, unknown>) => DocsApiInstance;
    [key: string]: unknown;
}
//# sourceMappingURL=types.d.ts.map