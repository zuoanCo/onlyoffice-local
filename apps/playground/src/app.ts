/**
 * Playground shell.
 *
 * Deliberately framework-free: it uses the vanilla adapter, so the demo proves
 * the core works without pulling in a UI framework at all. The tabs above the
 * editor show how the same thing looks in each supported framework.
 */
import { createOnlyOfficeLocal, downloadSaveResult } from '@onlyoffice-local/vanilla'
import type { CreateEditorResult } from '@onlyoffice-local/vanilla'
import { SNIPPETS, type Framework } from './snippets.js'

const SAMPLES = [
  { id: 'docx', label: 'DOCX', file: 'sample.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { id: 'xlsx', label: 'XLSX', file: 'sample.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'pptx', label: 'PPTX', file: 'sample.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
] as const

export function mount(root: HTMLElement): void {
  root.innerHTML = `
    <header class="topbar">
      <h1>onlyoffice-local</h1>
      <p>One zero-dependency core &middot; Vue 2 &amp; 3 &middot; React &middot; Angular &middot; vanilla JS</p>
      <p class="tagline">Edit DOCX, XLSX and PPTX entirely in the browser. No document server, no uploads.
        This page itself is built with the vanilla adapter &mdash; no framework loaded.</p>
    </header>

    <nav class="snips" role="tablist">
      ${SNIPPETS.map((s, i) => `<button role="tab" data-fw="${s.id}" aria-selected="${i === 0}">${s.label}</button>`).join('')}
    </nav>

    <section class="snip">
      <p class="snip__install"><code></code><button class="copy">Copy install</button></p>
      <pre><code></code></pre>
    </section>

    <section class="console">
      <div class="console__bar">
        <div class="tabs">
          ${SAMPLES.map((s, i) => `<button data-sample="${s.id}" aria-selected="${i === 0}">${s.label}</button>`).join('')}
        </div>
        <label class="btn">Open your file<input type="file" accept=".docx,.xlsx,.pptx" hidden /></label>
        <span class="spacer"></span>
        <span class="status" data-state="idle"><i></i><span>Idle</span></span>
      </div>
      <div class="stage"><div class="oo-editor__stage" id="stage"></div>
        <div class="overlay"><p>Pick a document to start.</p></div>
      </div>
      <div class="console__foot">
        <button class="btn" id="save">Save file</button>
        <button class="btn" id="pdf">Export PDF</button>
      </div>
    </section>
  `

  const stage = root.querySelector<HTMLElement>('#stage')!
  const overlay = root.querySelector<HTMLElement>('.overlay')!
  const status = root.querySelector<HTMLElement>('.status')!
  const statusText = status.querySelector('span')!
  const saveBtn = root.querySelector<HTMLButtonElement>('#save')!
  const pdfBtn = root.querySelector<HTMLButtonElement>('#pdf')!
  const fileInput = root.querySelector<HTMLInputElement>('input[type=file]')!

  let handle: CreateEditorResult | null = null
  let current = 'sample.docx'

  function setStatus(state: string, text: string): void {
    status.dataset.state = state
    statusText.textContent = text
  }

  function showOverlay(text: string, isError = false): void {
    overlay.innerHTML = `<p>${text}</p>`
    overlay.classList.toggle('overlay--error', isError)
    overlay.hidden = false
  }

  async function open(sampleFile: string, fileName?: string, blob?: Blob): Promise<void> {
    current = sampleFile
    showOverlay('Loading the OnlyOffice kernel…')
    setStatus('loading', 'Loading')

    let payload: Blob
    if (blob) {
      payload = blob
    } else {
      // Fetch the sample into memory first. The core deliberately refuses a
      // bare relative path - it only accepts http(s)/blob:/data: URLs, a File,
      // a Blob or raw bytes - so resolve it here and hand over a File.
      const url = new URL(`samples/${sampleFile}`, window.location.href).href
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} fetching ${url}`)
      payload = await res.blob()
    }

    handle?.destroy()
    handle = createOnlyOfficeLocal({
      container: stage,
      document: new File([payload], fileName ?? sampleFile, { type: payload.type }),
      title: fileName ?? sampleFile,
      // DocsAPI assets are served from the domain root, not from this sub-path.
      baseUrl: new URL('/', window.location.href).href.replace(/\/$/, ''),
      mode: 'edit',
      lang: 'en-US',
    })

    handle.on('documentReady', () => {
      overlay.hidden = true
      setStatus('ready', 'Ready')
    })
    handle.on('stateChange', (modified) => setStatus(modified ? 'modified' : 'ready', modified ? 'Unsaved edits' : 'Ready'))
    handle.on('error', (err) => {
      showOverlay(err.message, true)
      setStatus('error', 'Failed')
    })
  }

  root.querySelectorAll<HTMLButtonElement>('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-sample]').forEach((b) => b.setAttribute('aria-selected', 'false'))
      btn.setAttribute('aria-selected', 'true')
      const sample = SAMPLES.find((s) => s.id === btn.dataset.sample)!
      void open(sample.file).catch((err: Error) => {
        showOverlay(err.message, true)
        setStatus('error', 'Failed')
      })
    })
  })

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) {
      void open(file.name, file.name, file).catch((err: Error) => {
        showOverlay(err.message, true)
        setStatus('error', 'Failed')
      })
    }
  })

  saveBtn.addEventListener('click', () => {
    if (!handle) return
    saveBtn.disabled = true
    setStatus('saving', 'Saving')
    void handle
      .save()
      .then((result) => {
        if (result) downloadSaveResult(result)
        setStatus('ready', 'Ready')
      })
      .catch((err: Error) => {
        showOverlay(err.message, true)
        setStatus('error', 'Failed')
      })
      .finally(() => {
        saveBtn.disabled = false
      })
  })

  pdfBtn.addEventListener('click', () => {
    if (!handle) return
    setStatus('saving', 'Exporting')
    void handle.save('pdf').then((result) => {
      if (result) downloadSaveResult(result)
      setStatus('ready', 'Ready')
    })
  })

  // ---- snippet tabs ----
  const installEl = root.querySelector<HTMLElement>('.snip__install code')!
  const codeEl = root.querySelector<HTMLElement>('.snip pre code')!
  const copyBtn = root.querySelector<HTMLButtonElement>('.copy')!
  let active: Framework = 'vanilla'

  function renderSnippet(): void {
    const snippet = SNIPPETS.find((s) => s.id === active)!
    installEl.textContent = snippet.install
    codeEl.textContent = snippet.code
    copyBtn.textContent = 'Copy install'
  }

  root.querySelectorAll<HTMLButtonElement>('[data-fw]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('[data-fw]').forEach((b) => b.setAttribute('aria-selected', 'false'))
      btn.setAttribute('aria-selected', 'true')
      active = btn.dataset.fw as Framework
      renderSnippet()
    })
  })

  copyBtn.addEventListener('click', async () => {
    const snippet = SNIPPETS.find((s) => s.id === active)!
    try {
      await navigator.clipboard.writeText(snippet.install)
      copyBtn.textContent = 'Copied'
      setTimeout(() => (copyBtn.textContent = 'Copy install'), 1500)
    } catch {
      copyBtn.textContent = 'Press Ctrl+C'
    }
  })

  renderSnippet()
  void current
}
