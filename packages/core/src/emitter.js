/**
 * Minimal typed event emitter.
 *
 * Hand-rolled rather than pulled from npm because the core ships with zero
 * dependencies, and because every consumer would otherwise get a second copy
 * of a shared emitter in their bundle.
 *
 * Generic over the event map so the core can reuse it for internal signals if
 * that ever becomes useful, while adapters only ever see `EditorEvents`.
 */
export class Emitter {
    constructor() {
        this.listeners = new Map();
    }
    on(event, handler) {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        const wrapped = handler;
        set.add(wrapped);
        return () => {
            set.delete(wrapped);
        };
    }
    once(event, handler) {
        const off = this.on(event, (payload) => {
            off();
            handler(payload);
        });
        return off;
    }
    off(event, handler) {
        var _a;
        (_a = this.listeners.get(event)) === null || _a === void 0 ? void 0 : _a.delete(handler);
    }
    emit(event, payload) {
        const set = this.listeners.get(event);
        if (!set)
            return;
        // Copy first: a handler is allowed to unsubscribe itself mid-emit.
        for (const handler of Array.from(set)) {
            try {
                ;
                handler(payload);
            }
            catch (err) {
                // One bad listener must not stop the editor's own internals.
                console.error('[onlyoffice-local] listener for "' + String(event) + '" threw:', err);
            }
        }
    }
    listenerCount(event) {
        var _a, _b;
        return (_b = (_a = this.listeners.get(event)) === null || _a === void 0 ? void 0 : _a.size) !== null && _b !== void 0 ? _b : 0;
    }
    clear() {
        this.listeners.clear();
    }
}
//# sourceMappingURL=emitter.js.map