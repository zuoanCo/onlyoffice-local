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
export declare function normalizeBaseUrl(baseUrl: string | undefined): string;
export declare function apiScriptUrl(baseUrl: string | undefined): string;
export declare function loadApi(baseUrl: string | undefined): Promise<void>;
/** Test seam: forget cached loads so each spec starts from a clean slate. */
export declare function __resetApiCache(): void;
//# sourceMappingURL=loadApi.d.ts.map