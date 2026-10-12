const CELL = new Set(['xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm', 'ods', 'fods', 'csv']);
const SLIDE = new Set([
    'ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm', 'odp', 'fodp', 'pps', 'ppsx',
]);
const PDF = new Set(['pdf', 'oxps', 'xps', 'djvu']);
export function normalizeExtension(ext) {
    return String(ext || '').toLowerCase().replace(/^\./, '');
}
export function detectDocumentType(fileType) {
    const ext = normalizeExtension(fileType);
    if (CELL.has(ext))
        return 'cell';
    if (SLIDE.has(ext))
        return 'slide';
    if (PDF.has(ext))
        return 'pdf';
    return 'word';
}
/** Stable-ish key so the editor can recognise a document it already has open. */
function hashCode(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return hash;
}
export function mimeOf(fileType) {
    switch (normalizeExtension(fileType)) {
        case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'doc':
            return 'application/msword';
        case 'xlsx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'xls':
            return 'application/vnd.ms-excel';
        case 'pptx':
            return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        case 'ppt':
            return 'application/vnd.ms-powerpoint';
        case 'pdf':
            return 'application/pdf';
        default:
            return 'application/octet-stream';
    }
}
export function bufferToBlob(data, fileType) {
    if (data instanceof Blob)
        return data;
    const view = data instanceof Uint8Array ? data : new Uint8Array(data);
    return new Blob([view.slice()], { type: mimeOf(fileType) });
}
export function bufferToBlobUrl(data, fileType) {
    return URL.createObjectURL(bufferToBlob(data, fileType));
}
/**
 * Pull a usable filename out of a URL, falling back to a sane default.
 *
 * Absolute URLs are parsed so a bare origin such as `https://x.test/` does not
 * report the hostname as the filename; relative paths are split by hand.
 */
export function fileNameFromUrl(url) {
    var _a, _b;
    const withoutQuery = (_a = url.split(/[?#]/)[0]) !== null && _a !== void 0 ? _a : '';
    let pathname = withoutQuery;
    try {
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(withoutQuery)) {
            pathname = new URL(withoutQuery).pathname;
        }
    }
    catch {
        /* not parseable as a URL; fall back to manual splitting */
    }
    const segment = (_b = pathname.split('/').filter(Boolean).pop()) !== null && _b !== void 0 ? _b : '';
    return segment || 'document.docx';
}
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Deep-merge `source` over `target`, returning a new object.
 *
 * Only plain objects are merged; arrays and scalars are replaced wholesale,
 * which is what callers expect for things like `customization` flags.
 */
export function deepMerge(target, source) {
    if (!source)
        return { ...target };
    const out = { ...target };
    for (const [key, value] of Object.entries(source)) {
        if (value === undefined)
            continue;
        const current = out[key];
        if (isPlainObject(current) && isPlainObject(value)) {
            out[key] = deepMerge(current, value);
        }
        else {
            out[key] = value;
        }
    }
    return out;
}
export function buildDocsConfig(input) {
    const fileType = normalizeExtension(input.fileType) || 'docx';
    const title = input.title || 'doc.' + fileType;
    const editable = (input.mode || 'edit') !== 'view';
    const document = {
        // The offline build no longer requires a URL, but a Blob URL keeps the
        // editor's own converters happy. It is always present for real documents.
        url: input.url,
        title,
        fileType,
        key: input.key || 'doc-' + Math.abs(hashCode((input.url || '') + '|' + title)),
        permissions: { edit: editable, download: true, print: true },
    };
    const base = {
        documentType: input.documentType,
        document,
        editorConfig: {
            mode: input.mode || 'edit',
            lang: input.lang || 'en-US',
            user: {
                id: (input.user && input.user.id) || 'local-user',
                name: (input.user && input.user.name) || 'Local User',
            },
        },
        width: input.width || '100%',
        height: input.height || '100%',
        events: input.events,
    };
    // The caller-supplied escape hatch wins, but `events` stays ours: letting it
    // be replaced would silently break the save-stream hook.
    const merged = deepMerge(base, input.config);
    merged.events = input.events;
    return merged;
}
//# sourceMappingURL=normalize.js.map