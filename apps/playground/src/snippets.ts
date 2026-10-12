/** The same integration shown once per framework, for the docs tabs. */
export type Framework = 'vanilla' | 'vue' | 'react' | 'angular'

export interface Snippet {
  id: Framework
  label: string
  install: string
  code: string
}

export const SNIPPETS: Snippet[] = [
  {
    id: 'vanilla',
    label: 'Vanilla',
    install: 'npm i @onlyoffice-local/vanilla',
    code: `import { createOnlyOfficeLocal, downloadSaveResult } from '@onlyoffice-local/vanilla';

const handle = createOnlyOfficeLocal({
  container: document.querySelector('#stage'),
  document: file,            // File | Blob | ArrayBuffer | http(s)/blob:/data: URL
  baseUrl: '/',              // root of the self-hosted vendor build
  mode: 'edit',
  lang: 'en-US',
});

handle.on('documentReady', () => console.log('ready to edit'));
handle.on('stateChange', (modified) => console.log('unsaved:', modified));

document.querySelector('#save').addEventListener('click', async () => {
  const result = await handle.save();
  if (result) downloadSaveResult(result);
});`,
  },
  {
    id: 'vue',
    label: 'Vue 2 & Vue 3',
    install: 'npm i @onlyoffice-local/vue',
    code: `import { createApp } from 'vue';
import OnlyOfficeLocal from '@onlyoffice-local/vue';
import '@onlyoffice-local/vue/style.css';

createApp(App).use(OnlyOfficeLocal, {
  defaultBaseUrl: '/',
  defaultLang: 'en-US',
}).mount('#app');

// App.vue - identical on Vue 2.7+ and Vue 3
<template>
  <OnlyOfficeLocal
    ref="editor"
    :document="file"
    :mode="mode"
    :lang="lang"
    @document-ready="onReady"
    @state-change="modified = $event"
    @error="onError"
  />
</template>

<script setup>
const editor = ref(null);
const file = ref(null);
const modified = ref(false);

async function save() {
  const result = await editor.value.save();
  if (result) downloadSaveResult(result);
}
</script>`,
  },
  {
    id: 'react',
    label: 'React',
    install: 'npm i @onlyoffice-local/react',
    code: `import { useRef, useState } from 'react';
import { OnlyOfficeLocal } from '@onlyoffice-local/react';
import type { OnlyOfficeLocalHandle } from '@onlyoffice-local/react';
import '@onlyoffice-local/react/style.css';

export function DocEditor({ file }) {
  const ref = useRef<OnlyOfficeLocalHandle>(null);
  const [modified, setModified] = useState(false);

  async function save() {
    const result = await ref.current?.save();
    if (result) downloadSaveResult(result);
  }

  return <OnlyOfficeLocal ref={ref} document={file} onModified={setModified} />;
}

// Headless alternative:
// const { containerRef, save, loading, error } = useOnlyOfficeLocal({ document: file });`,
  },
  {
    id: 'angular',
    label: 'Angular',
    install: 'npm i @onlyoffice-local/angular',
    code: `import { Component, signal } from '@angular/core';
import { OnlyOfficeLocalComponent } from '@onlyoffice-local/angular';
import '@onlyoffice-local/angular/style.css';

@Component({
  standalone: true,
  imports: [OnlyOfficeLocalComponent],
  template: \`
    <oo-editor
      [editor]="cfg()"
      (documentReady)="onReady()"
      (stateChange)="modified.set($event)"
    />
  \`,
})
export class DocEditor {
  readonly cfg = signal({
    document: this.file,
    baseUrl: '/',
    mode: 'edit' as const,
    lang: 'en-US',
  });
  readonly modified = signal(false);
}

// Imperative alternative: inject OnlyOfficeLocalService and call service.create(el, opts).`,
  },
]
