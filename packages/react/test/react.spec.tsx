import { act, render, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnlyOfficeLocal, type OnlyOfficeLocalHandle } from '../src/index.js'

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

describe('<OnlyOfficeLocal>', () => {
  let built: { config: Record<string, unknown> }[]

  beforeEach(() => {
    ;(URL as unknown as { createObjectURL: unknown }).createObjectURL = () => 'blob:react-test'
    ;(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = () => {}
    built = fakeDocsApi()
  })

  afterEach(() => {
    delete (window as unknown as { DocsAPI?: unknown }).DocsAPI
    vi.restoreAllMocks()
  })

  it('mounts an editor into the stage element', async () => {
    render(<OnlyOfficeLocal document="blob:x" />)
    await waitFor(() => expect(built).toHaveLength(1))
  })

  it('shows the loading overlay until the document is ready', async () => {
    const { container } = render(<OnlyOfficeLocal document="blob:x" loadingFallback="booting" />)
    expect(container.textContent).toContain('booting')

    await waitFor(() => expect(built).toHaveLength(1))
    await act(async () => {
      const events = built[0]!.config.events as Record<string, () => void>
      events.onDocumentReady?.()
    })
    await waitFor(() => expect(container.textContent).not.toContain('booting'))
  })

  it('forwards lang and mode into the editor config', async () => {
    render(<OnlyOfficeLocal document="blob:x" lang="zh-CN" mode="view" />)
    await waitFor(() => expect(built).toHaveLength(1))
    const config = built[0]!.config as any
    expect(config.editorConfig.lang).toBe('zh-CN')
    expect(config.document.permissions.edit).toBe(false)
  })

  it('exposes save() through a ref', async () => {
    const ref = createRef<OnlyOfficeLocalHandle>()
    render(<OnlyOfficeLocal ref={ref} document="blob:x" />)
    await waitFor(() => expect(built).toHaveLength(1))
    expect(typeof ref.current?.save).toBe('function')
    expect(typeof ref.current?.whenReady).toBe('function')
  })

  it('renders the error fallback when the editor fails', async () => {
    const { container } = render(
      <OnlyOfficeLocal
        document="blob:x"
        errorFallback={(err: Error) => <span>failed: {err.message}</span>}
      />,
    )
    await waitFor(() => expect(built).toHaveLength(1))

    await act(async () => {
      const events = built[0]!.config.events as Record<string, (arg?: unknown) => void>
      events.onError?.({ data: { code: 1 } })
    })
    await waitFor(() => expect(container.textContent).toContain('failed:'))
  })

  it('unmounts without leaking a second editor', async () => {
    const { unmount } = render(<OnlyOfficeLocal document="blob:x" />)
    await waitFor(() => expect(built).toHaveLength(1))
    unmount()
    // Nothing else should have been constructed.
    expect(built).toHaveLength(1)
  })
})
