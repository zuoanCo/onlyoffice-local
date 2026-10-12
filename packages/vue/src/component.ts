/**
 * `<OnlyOfficeLocal>` for Vue 2.7 and Vue 3.
 *
 * Written with `defineComponent` + a render function rather than an SFC
 * template so a single build serves both major versions: `h` and `setup()` have
 * the same shape in 2.7's Composition API and in Vue 3, and Vue 2 simply
 * ignores the `emits` option.
 *
 * The component owns exactly one core editor and swaps its document rather
 * than re-creating the component, so `ref` identity and listeners survive a
 * document change.
 */
import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type App,
  type PropType,
  type VNode,
} from 'vue'
import { OnlyOfficeLocalEditor } from '@onlyoffice-local/core'
import type {
  DocumentInput,
  OnlyOfficeConfig,
  SaveResult,
  UserInfo,
} from '@onlyoffice-local/core'

/** Options shared by every `<OnlyOfficeLocal>` in the app. */
export interface OnlyOfficeLocalGlobalOptions {
  defaultBaseUrl?: string
  defaultLang?: string
  defaultMode?: 'edit' | 'view'
  globalConfig?: OnlyOfficeConfig
}

const OPTIONS_KEY = Symbol('onlyofficeLocalOptions')

export type OnlyOfficeLocalEmits = {
  (e: 'ready'): void
  (e: 'document-ready'): void
  (e: 'state-change', modified: boolean): void
  (e: 'request-close'): void
  (e: 'meta-change', title: string): void
  (e: 'error', error: Error): void
  (e: 'destroy'): void
}

export const OnlyOfficeLocal = defineComponent({
  name: 'OnlyOfficeLocal',
  props: {
    /** File, Blob, ArrayBuffer, or an http(s)/blob:/data: URL. */
    document: { type: [String, Blob, ArrayBuffer, Object] as PropType<DocumentInput>, required: true },
    /** Root of the self-hosted vendor build. Falls back to the global option. */
    baseUrl: { type: String, default: undefined },
    title: { type: String, default: undefined },
    fileType: { type: String, default: undefined },
    mode: { type: String as PropType<'edit' | 'view'>, default: undefined },
    lang: { type: String, default: undefined },
    user: { type: Object as PropType<UserInfo>, default: undefined },
    width: { type: String, default: undefined },
    height: { type: String, default: undefined },
    config: { type: Object as PropType<OnlyOfficeConfig>, default: undefined },
  },
  emits: [
    'ready',
    'document-ready',
    'state-change',
    'request-close',
    'meta-change',
    'error',
    'destroy',
  ] as unknown as string[],
  setup(props, { emit, expose, slots }) {
    const globalOptions = inject<OnlyOfficeLocalGlobalOptions>(OPTIONS_KEY, {})

    const host = ref<HTMLElement | null>(null)
    const stage = ref<HTMLElement | null>(null)
    const editor = shallowRef<OnlyOfficeLocalEditor | null>(null)
    const loading = ref(true)
    const error = ref<Error | null>(null)

    function resolveOptions() {
      return {
        baseUrl: props.baseUrl ?? globalOptions.defaultBaseUrl ?? '/',
        lang: props.lang ?? globalOptions.defaultLang ?? 'en-US',
        mode: props.mode ?? globalOptions.defaultMode ?? ('edit' as const),
        config: mergeConfigs(globalOptions.globalConfig, props.config),
      }
    }

    /** Create (or re-create) the editor for the current props. */
    function mountEditor(): void {
      if (!stage.value) return
      editor.value?.destroy()

      const resolved = resolveOptions()
      const instance = new OnlyOfficeLocalEditor({
        container: stage.value,
        document: props.document,
        title: props.title,
        fileType: props.fileType,
        width: props.width,
        height: props.height,
        user: props.user,
        baseUrl: resolved.baseUrl,
        lang: resolved.lang,
        mode: resolved.mode,
        config: resolved.config,
      })

      instance.on('ready', () => emit('ready'))
      instance.on('documentReady', () => {
        loading.value = false
        emit('document-ready')
      })
      instance.on('stateChange', (modified) => emit('state-change', modified))
      instance.on('requestClose', () => emit('request-close'))
      instance.on('metaChange', (title) => emit('meta-change', title))
      instance.on('destroy', () => emit('destroy'))
      instance.on('error', (err) => {
        error.value = err
        loading.value = false
        emit('error', err)
      })

      editor.value = instance
      void instance.whenReady()
    }

    onMounted(mountEditor)
    onBeforeUnmount(() => editor.value?.destroy())

    // Changing the document means a new DocsAPI build; the rest of the props
    // are re-applied through the core's own setters where possible.
    watch(
      () => props.document,
      () => mountEditor(),
    )

    watch(
      () => props.mode,
      (next, prev) => {
        if (!next || next === prev || !editor.value) return
        void editor.value.setMode(next)
      },
    )

    watch(
      () => props.lang,
      (next, prev) => {
        if (!next || next === prev || !editor.value) return
        void editor.value.setLang(next)
      },
    )

    watch(
      () => props.config,
      () => mountEditor(),
      { deep: true },
    )

    expose({
      /** The underlying core editor. */
      get editor() {
        return editor.value
      },
      /** Resolves once the first mount attempt has settled. */
      whenReady: () => editor.value?.whenReady() ?? Promise.resolve(),
      /** Trigger a save and resolve with the edited bytes. */
      save: (format?: string): Promise<SaveResult | null> =>
        editor.value ? editor.value.save(format) : Promise.resolve(null),
      destroy: () => editor.value?.destroy(),
    })

    // A single root VNode, not an array: Vue 2's setup() cannot return a
    // fragment, so returning one would only work under Vue 3.
    return () => {
      const children: VNode[] = []

      children.push(
        // `slots.default?.()` yields VNode[] | undefined, both valid children;
        // a `| null` ternary would not type-check.
        h('div', { class: 'oo-editor__stage', ref: stage }, slots.default?.()),
      )

      if (error.value) {
        children.push(
          h(
            'div',
            { class: 'oo-editor__overlay oo-editor__overlay--error' },
            slots.error ? slots.error({ error: error.value }) : error.value.message,
          ),
        )
      } else if (loading.value) {
        children.push(
          h(
            'div',
            { class: 'oo-editor__overlay' },
            slots.loading ? slots.loading() : 'Loading editor...',
          ),
        )
      }

      return h(
        'div',
        { class: 'oo-editor', style: { height: props.height ?? '100%' } },
        children,
      )
    }
  },
})

function mergeConfigs(
  a: OnlyOfficeConfig | undefined,
  b: OnlyOfficeConfig | undefined,
): OnlyOfficeConfig | undefined {
  if (!a) return b
  if (!b) return a
  return {
    ...a,
    ...b,
    document: { ...a.document, ...b.document },
    editorConfig: { ...a.editorConfig, ...b.editorConfig },
  }
}

/** Vue plugin: registers `<OnlyOfficeLocal>` and shares global defaults. */
export const plugin = {
  install(app: App, options: OnlyOfficeLocalGlobalOptions = {}) {
    app.component('OnlyOfficeLocal', OnlyOfficeLocal)
    app.provide(OPTIONS_KEY, options)
  },
}

export default plugin
