/**
 * Idempotent loader for the self-hosted OnlyOffice 9.x DocsAPI entry point.
 *
 * Architecture inherited from onlyoffice-web-local v2.0.0 (oo-offline): the
 * whole editor kernel is a static asset tree, so "installing" the library is
 * really "serve `vendor/` from your own origin". There is no conversion
 * service to configure.
 *
 * Local modification vs upstream: a failed load is fully unwound so that a
 * later attempt retries. The vendor build is large and is often still being
 * copied when the first request lands, and browsers do not re-fire `load` for
 * a <script> whose load already failed.
 */

const inflight = new Map<string, Promise<void>>()

export function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl) return '/'
  return baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'
}

export function apiScriptUrl(baseUrl: string | undefined): string {
  return normalizeBaseUrl(baseUrl) + 'vendor/web-apps/apps/api/documents/api.js'
}

export function loadApi(baseUrl: string | undefined): Promise<void> {
  const base = normalizeBaseUrl(baseUrl)

  if (typeof window !== 'undefined' && window.DocsAPI) return Promise.resolve()

  const existing = inflight.get(base)
  if (existing) return existing

  const src = apiScriptUrl(base)
  const pending = new Promise<void>((resolve, reject) => {
    const found = document.querySelector<HTMLScriptElement>('script[data-oo-api="' + src + '"]')

    // A <script> that already ran or already failed cannot be restarted by
    // re-assigning .src, so it is removed from the document on every failure.
    const drop = () => {
      if (script.parentNode) script.parentNode.removeChild(script)
    }

    const script = found ?? document.createElement('script')

    script.src = src
    script.async = true
    script.dataset.ooApi = src
    script.onload = () => {
      if (!window.DocsAPI) {
        drop()
        reject(new Error('DocsAPI did not mount; check baseUrl and the vendor build path'))
        return
      }
      resolve()
    }
    script.onerror = () => {
      drop()
      reject(new Error('Failed to load ' + src + '. Is the vendor build served from ' + base + '?'))
    }

    if (!script.isConnected) document.head.appendChild(script)
    else if (window.DocsAPI) resolve()
  })

  // Cache only in-flight / successful loads. Rejections are evicted so a retry
  // after the assets become reachable issues a fresh request.
  const tracked = pending.catch((err: unknown) => {
    inflight.delete(base)
    throw err instanceof Error ? err : new Error(String(err))
  })

  inflight.set(base, tracked)
  return tracked
}

/** Test seam: forget cached loads so each spec starts from a clean slate. */
export function __resetApiCache(): void {
  inflight.clear()
}
