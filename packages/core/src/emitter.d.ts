import type { Unsubscribe } from './types.js';
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
export declare class Emitter<Events> {
    private readonly listeners;
    on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): Unsubscribe;
    once<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): Unsubscribe;
    off<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void;
    emit<K extends keyof Events>(event: K, payload: Events[K]): void;
    listenerCount<K extends keyof Events>(event: K): number;
    clear(): void;
}
export type { Unsubscribe };
//# sourceMappingURL=emitter.d.ts.map