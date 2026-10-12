# @onlyoffice-local/vanilla

No framework - a plain DOM element.

```bash
npm i @onlyoffice-local/vanilla
```

Part of the [onlyoffice-local](../../README.md) monorepo. It re-exports
`@onlyoffice-local/core` types plus `downloadSaveResult()` so you do not have to
write the Blob-URL-and-anchor dance yourself.

You still need to host the OnlyOffice 9.x offline build (~700 MB) from your own
origin under `<baseUrl>/vendor/`. See the [core readme](../core/README.md) for
the details, including the gzip requirement.
