import type { Unsubscribe } from './types.js'

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
export class Emitter<Events> {
  private readonly listeners = new Map<keyof Events, Set<(payload: never) => void>>()

  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): Unsubscribe {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    const wrapped = handler as (payload: never) => void
    set.add(wrapped)
    return () => {
      set!.delete(wrapped)
    }
  }

  once<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): Unsubscribe {
    const off = this.on(event, (payload: Events[K]) => {
      off()
      handler(payload)
    })
    return off
  }

  off<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): void {
    this.listeners.get(event)?.delete(handler as (payload: never) => void)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    // Copy first: a handler is allowed to unsubscribe itself mid-emit.
    for (const handler of Array.from(set)) {
      try {
        ;(handler as (value: Events[K]) => void)(payload)
      } catch (err) {
        // One bad listener must not stop the editor's own internals.
        console.error('[onlyoffice-local] listener for "' + String(event) + '" threw:', err)
      }
    }
  }

  listenerCount<K extends keyof Events>(event: K): number {
    return this.listeners.get(event)?.size ?? 0
  }

  clear(): void {
    this.listeners.clear()
  }
}

export type { Unsubscribe }
