import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnlyOfficeLocal } from '../src/index.js'

function fakeDocsApi() {
  const built: { config: Record<string, unknown> }[] = []
  class DocEditor {
    destroyEditor = vi.fn()
    downloadAs = vi.fn()
    constructor(_id: string, config: Record<string, unknown>) {
      built.push({ config })
      const events = (config.events || {}) as Record<string, (arg?: unknown) => void>
      queueMicrotask(() => events.onAppReady?.())
    }
  }
  ;(window as unknown as { DocsAPI: unknown }).DocsAPI = { DocEditor }
  return built
}

/** The imperative handle the component exposes through `expose()`. */
interface TestVm {
  whenReady: () => Promise<void>
  save: (format?: string) => Promise<unknown>
  editor: unknown
}

/**
 * `wrapper.vm` is typed as the public instance, which does not know about the
 * keys handed to `expose()`. Reach them through this helper instead of
 scattering casts.
 */
function vm(wrapper: VueWrapper<unknown>): TestVm {
  return wrapper.vm as unknown as TestVm
}

describe('<OnlyOfficeLocal>', () => {
  let built: { config: Record<string, unknown> }[]

  beforeEach(() => {
    ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = () => 'blob:vue-test'
    ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = () => {}
    built = fakeDocsApi()
  })

  afterEach(() => {
    delete (window as unknown as { DocsAPI?: unknown }).DocsAPI
    vi.restoreAllMocks()
  })

  it('mounts DocsAPI and emits ready then document-ready', async () => {
    const wrapper = mount(OnlyOfficeLocal, {
      props: { document: 'blob:x', baseUrl: '/' },
    })

    await nextTick()
    await vm(wrapper).whenReady()
    await nextTick()

    expect(built).toHaveLength(1)
    const events = built[0]!.config.events as Record<string, () => void>
    events.onDocumentReady?.()
    await nextTick()

    expect(wrapper.emitted('ready')).toBeTruthy()
    expect(wrapper.emitted('document-ready')).toBeTruthy()
    wrapper.unmount()
  })

  it('passes lang and mode through to the editor config', async () => {
    const wrapper = mount(OnlyOfficeLocal, {
      props: { document: 'blob:x', lang: 'zh-CN', mode: 'view' },
    })
    await vm(wrapper).whenReady()

    const config = built[0]!.config as Record<string, any>
    expect(config.editorConfig.lang).toBe('zh-CN')
    expect(config.editorConfig.mode).toBe('view')
    expect(config.document.permissions.edit).toBe(false)
    wrapper.unmount()
  })

  it('rebuilds when the document prop changes', async () => {
    const wrapper = mount(OnlyOfficeLocal, {
      props: { document: 'blob:one', title: 'one.docx' },
    })
    await vm(wrapper).whenReady()

    await wrapper.setProps({ document: 'blob:two', title: 'two.docx' })
    await vm(wrapper).whenReady()

    expect(built).toHaveLength(2)
    wrapper.unmount()
  })

  it('applies a mode change without the component re-mounting its editor', async () => {
    const wrapper = mount(OnlyOfficeLocal, {
      props: { document: 'blob:x', mode: 'edit' },
    })
    await vm(wrapper).whenReady()
    const firstEditor = vm(wrapper).editor

    await wrapper.setProps({ mode: 'view' })
    await vm(wrapper).whenReady()

    // The component kept its core instance...
    expect(vm(wrapper).editor).toBe(firstEditor)
    // ...but DocsAPI itself cannot be reconfigured, so the core rebuilt the
    // iframe underneath - one extra DocEditor, pointed at the new mode.
    expect(built).toHaveLength(2)
    expect((built[1]!.config as any).editorConfig.mode).toBe('view')
    wrapper.unmount()
  })

  it('tears the editor down on unmount', async () => {
    const wrapper = mount(OnlyOfficeLocal, { props: { document: 'blob:x' } })
    await vm(wrapper).whenReady()
    expect(wrapper.find('.oo-editor').exists()).toBe(true)
    wrapper.unmount()
  })

  it('can be registered globally with shared defaults', async () => {
    const Host = defineComponent({
      setup: () => () =>
        h(OnlyOfficeLocal, { document: 'blob:x', baseUrl: '/vendor-root/' }),
    })
    const wrapper = mount(Host)
    // The editor is created in onMounted and resolves the document before it
    // reaches DocsAPI, so give it a few turns of the microtask queue.
    await vi.waitFor(() => expect(built.length).toBeGreaterThan(0))
    expect((built[0]!.config as any).editorConfig.lang).toBe('en-US')
    wrapper.unmount()
  })
})
