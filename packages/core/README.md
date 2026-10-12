# @onlyoffice-local/core

Framework-agnostic core for local OnlyOffice editing. Zero dependencies.

```bash
npm i @onlyoffice-local/core
```

```ts
import { OnlyOfficeLocalEditor } from '@onlyoffice-local/core';

const editor = new OnlyOfficeLocalEditor({
  container: document.querySelector('#stage')!,
  document: file,        // File | Blob | ArrayBuffer | http(s)/blob:/data: URL
  baseUrl: '/',          // root of the self-hosted vendor build
  mode: 'edit',
  lang: 'en-US',
});

editor.on('documentReady', () => console.log('ready'));
const { buffer, fileName } = await editor.save();
editor.destroy();
```

You need to host the OnlyOffice 9.x offline build (~700 MB) yourself, with
`<baseUrl>/vendor/...` pointing at it. Serve it gzip-encoded - `x2t.wasm` is
~62 MB raw and `X2TConverter` times out at 60 s.

If you are using a UI framework, install the matching adapter instead:
[`@onlyoffice-local/vue`](../vue), [`react`](../react),
[`angular`](../angular), [`vanilla`](../vanilla).
