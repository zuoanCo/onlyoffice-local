import type { DocsApiConfig, EditorEventName, EditorEvents, OnlyOfficeLocalOptions, SaveResult, Unsubscribe } from './types.js';
/**
 * A mounted OnlyOffice editor bound to one container.
 *
 * Instances are single-use in the sense that DocsAPI cannot be reconfigured
 * after construction, so `setMode`, `setLang` and `setDocument` transparently
 * tear the iframe down and build a fresh one. The object identity, listeners
 * and promise-based API stay stable across those swaps.
 */
export declare class OnlyOfficeLocalEditor {
    private readonly host;
    private readonly emitter;
    private readonly baseUrl;
    private options;
    private doc;
    private mountNode;
    private docEditor;
    private stopPrepare;
    /** Blob URLs this instance created and is therefore responsible for. */
    private ownedUrls;
    private saveChain;
    private building;
    private lastConfig;
    private destroyed;
    constructor(options: OnlyOfficeLocalOptions & {
        container: HTMLElement | string;
    });
    /** Resolves when the first mount attempt has settled (success or error). */
    whenReady(): Promise<void>;
    /** The config object most recently handed to DocsAPI. Useful when debugging. */
    get config(): DocsApiConfig | null;
    /** Escape hatch to the raw DocsAPI instance. */
    getDocEditor(): unknown;
    on<K extends EditorEventName>(event: K, handler: (payload: EditorEvents[K]) => void): Unsubscribe;
    once<K extends EditorEventName>(event: K, handler: (payload: EditorEvents[K]) => void): Unsubscribe;
    off<K extends EditorEventName>(event: K, handler: (payload: EditorEvents[K]) => void): void;
    private build;
    /** Replace the document. Any Blob URL the old document owned is revoked. */
    setDocument(document: OnlyOfficeLocalOptions['document'], hints?: {
        title?: string;
        fileType?: string;
    }): Promise<void>;
    /** Switch between edit and view mode. */
    setMode(mode: 'edit' | 'view'): Promise<void>;
    /** Switch the editor chrome language (e.g. `en-US`, `zh-CN`). */
    setLang(lang: string): Promise<void>;
    /** Force a fresh DocsAPI build, e.g. after mutating `config` in place. */
    rebuild(): Promise<void>;
    /**
     * Ask the editor to write the current document out and resolve with its
     * bytes. Pass a format (`'pdf'`, `'docx'`, ...) to convert on the way out.
     *
     * Calls are serialised: the editor's download path is a single global
     * postMessage channel, so overlapping saves would cross their responses.
     */
    save(format?: string): Promise<SaveResult>;
    destroy(): void;
    get isDestroyed(): boolean;
    private teardownIframe;
    private releaseDocument;
    private assertAlive;
    private emitError;
}
//# sourceMappingURL=editor.d.ts.map