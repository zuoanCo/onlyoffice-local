/**
 * Vanilla JS entry point.
 *
 * There is no framework here on purpose: `@onlyoffice-local/core` is already
 * plain TypeScript, so this package exists to give plain-JS consumers a single
 * installable name, one convenient factory, and a download helper.
 */
import { OnlyOfficeLocalEditor } from '@onlyoffice-local/core';
import type { DocumentInput, OnlyOfficeConfig, SaveResult, Unsubscribe, UserInfo } from '@onlyoffice-local/core';
export interface CreateEditorOptions {
    container: HTMLElement | string;
    document: DocumentInput;
    baseUrl?: string;
    title?: string;
    fileType?: string;
    mode?: 'edit' | 'view';
    lang?: string;
    user?: UserInfo;
    width?: string;
    height?: string;
    config?: OnlyOfficeConfig;
}
export interface OnlyOfficeLocalHandle {
    /** The underlying editor, for anything this wrapper does not surface. */
    readonly editor: OnlyOfficeLocalEditor;
    /** Resolves once the first mount attempt has settled. */
    whenReady(): Promise<void>;
    save(format?: string): Promise<SaveResult>;
    setDocument(document: DocumentInput, hints?: {
        title?: string;
        fileType?: string;
    }): Promise<void>;
    setMode(mode: 'edit' | 'view'): Promise<void>;
    setLang(lang: string): Promise<void>;
    destroy(): void;
}
export interface CreateEditorResult extends OnlyOfficeLocalHandle {
    /** Subscribe to an editor event; returns an unsubscribe function. */
    on: OnlyOfficeLocalEditor['on'];
    off: OnlyOfficeLocalEditor['off'];
    once: OnlyOfficeLocalEditor['once'];
}
/**
 * Mount an editor into `container`.
 *
 * Returns synchronously - the editor mounts in the background - so callers can
 * subscribe to events without racing the first `ready`.
 */
export declare function createOnlyOfficeLocal(options: CreateEditorOptions): CreateEditorResult;
/**
 * Trigger a browser download for the bytes returned by `save()`.
 *
 * Kept here rather than in the core so the core stays free of any policy
 * about what a host application should do with a file.
 */
export declare function downloadSaveResult(result: SaveResult, doc?: Document): void;
export { OnlyOfficeLocalEditor };
export type { DocumentInput, OnlyOfficeConfig, SaveResult, Unsubscribe, UserInfo, };
//# sourceMappingURL=index.d.ts.map