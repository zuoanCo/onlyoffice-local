# onlyoffice-local

Open and edit **DOCX, XLSX and PPTX entirely in the browser**. No document server,
no uploads, no conversion service.

One framework-agnostic core, thin adapters for the stacks people actually use.

```
@onlyoffice-local/core       zero-dependency TypeScript SDK
@onlyoffice-local/vanilla    no framework at all
@onlyoffice-local/vue        Vue 2.7+ and Vue 3, one build
@onlyoffice-local/react      React 18+, component + hook
@onlyoffice-local/angular    Angular 17+, standalone component + service
```

## Why it works without a server

The editor is the **OnlyOffice 9.x offline build** - a static asset tree served
from your own origin. Documents are handed to it as `Blob` URLs, so the file
never leaves the tab, and the edited bytes come back through a `postMessage`
file-stream hook rather than a callback URL.

The only deployment requirement is the vendor build itself (~700 MB):

```
/vendor/web-apps/apps/api/documents/api.js   <- DocsAPI entry point
/vendor/sdkjs/                                 <- editor kernel
/vendor/web-apps/                              <- editor UI
```

### Serve the vendor build gzip-encoded

`x2t.wasm` alone is ~62 MB uncompressed and `X2TConverter` aborts after 60 s.
Pre-build `.gz` sidecars and turn on `gzip_static on;` - ~13 MB gzipped it
initialises in time. This is the single most common way to get a blank editor.

## Install

```bash
npm i @onlyoffice-local/vue        # or /react, /angular, /vanilla
```

## Use it

### Vanilla

```ts
import { createOnlyOfficeLocal, downloadSaveResult } from '@onlyoffice-local/vanilla';

const handle = createOnlyOfficeLocal({
  container: document.querySelector('#stage'),
  document: file,        // File | Blob | ArrayBuffer | http(s)/blob:/data: URL
  baseUrl: '/',
  mode: 'edit',
  lang: 'en-US',
});

handle.on('documentReady', () => console.log('ready to edit'));
handle.on('stateChange', (modified) => console.log('unsaved:', modified));

const result = await handle.save();
if (result) downloadSaveResult(result);
```

### Vue 2.7+ and Vue 3

The same build works on both major versions.

```ts
import { createApp } from 'vue';
import OnlyOfficeLocal from '@onlyoffice-local/vue';
import '@onlyoffice-local/vue/style.css';

createApp(App).use(OnlyOfficeLocal, {
  defaultBaseUrl: '/',
  defaultLang: 'en-US',
}).mount('#app');
```

```vue
<template>
  <OnlyOfficeLocal
    ref="editor"
    :document="file"
    :mode="mode"
    @document-ready="onReady"
    @state-change="modified = $event"
  />
</template>

<script setup>
import { ref } from 'vue';
const editor = ref(null);
const file = ref(null);
const mode = ref('edit');
const modified = ref(false);

async function save() {
  const result = await editor.value.save();
  // result.buffer is an ArrayBuffer, result.fileName / result.fileType are set
}
</script>
```

### React

```tsx
import { useRef } from 'react';
import { OnlyOfficeLocal, type OnlyOfficeLocalHandle } from '@onlyoffice-local/react';
import '@onlyoffice-local/react/style.css';

export function DocEditor({ file }: { file: File }) {
  const ref = useRef<OnlyOfficeLocalHandle>(null);
  return <OnlyOfficeLocal ref={ref} document={file} />;
}
```

Prefer headless? `useOnlyOfficeLocal({ document })` returns `containerRef`,
`loading`, `error`, `modified` and the imperative handles.

### Angular

```ts
import { Component, signal } from '@angular/core';
import { OnlyOfficeLocalComponent } from '@onlyoffice-local/angular';
import '@onlyoffice-local/angular/style.css';

@Component({
  standalone: true,
  imports: [OnlyOfficeLocalComponent],
  template: `<oo-editor [editor]="cfg()" (stateChange)="modified.set($event)" />`,
})
export class DocEditor {
  readonly cfg = signal({ document: this.file, baseUrl: '/', mode: 'edit' as const });
  readonly modified = signal(false);
}
```

`OnlyOfficeLocalService` is there when you want to drive the editor by hand.

## Core API

`@onlyoffice-local/core` is plain TypeScript with no framework imports, so it can
be used directly anywhere - including in a Web Worker host or a custom renderer.

```ts
import { OnlyOfficeLocalEditor } from '@onlyoffice-local/core';

const editor = new OnlyOfficeLocalEditor({ container, document: file, baseUrl: '/' });

editor.on('ready', () => {});          // iframe up
editor.on('documentReady', () => {});  // document interactive
editor.on('stateChange', (modified) => {});
editor.on('requestClose', () => {});
editor.on('metaChange', (title) => {});
editor.on('error', (err) => {});

await editor.save();        // -> { buffer, fileName, fileType }
await editor.save('pdf');
await editor.setDocument(nextFile);
await editor.setMode('view');
await editor.setLang('zh-CN');
editor.destroy();
```

Every `on` returns an unsubscribe function.

## Repository layout

```
packages/core      the SDK - zero dependencies
packages/vanilla   no-framework entry point + download helper
packages/vue       Vue 2.7 / Vue 3 component and plugin
packages/react     React component + useOnlyOfficeLocal hook
packages/angular   Angular standalone component + service
apps/playground    vite demo; npm run demo
```

## Development

```bash
npm install
npm run build      # all packages -> dist/{esm,cjs,types}
npm test           # 51 tests
npm run typecheck
npm run demo       # playground on http://127.0.0.1:5180
```

The playground needs the vendor build at `apps/playground/public/vendor/`:

```bash
# from the upstream release zip, copy html/vendor/ here
```

## License

MIT
