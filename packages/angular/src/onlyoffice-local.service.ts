import { Injectable } from '@angular/core'
import { OnlyOfficeLocalEditor } from '@onlyoffice-local/core'
import type {
  DocumentInput,
  OnlyOfficeConfig,
  OnlyOfficeLocalOptions,
  SaveResult,
  UserInfo,
} from '@onlyoffice-local/core'

/**
 * Injectable wrapper around the core editor.
 *
 * Useful when the editor is driven imperatively - a directive, a store, or a
 * component that mounts it by hand. Most templates should use
 * `<oo-editor>` instead.
 *
 * Provided in root by the standalone component's `providers` array only when
 * you want a shared instance; inject it directly otherwise.
 */
@Injectable()
export class OnlyOfficeLocalService {
  private instances = new Set<OnlyOfficeLocalEditor>()

  /**
   * Mount an editor into `container`.
   *
   * The returned editor is tracked so `destroyAll()` can clean up on route
   * changes; pass `{ autoRegister: false }` to opt out.
   */
  create(
    container: HTMLElement,
    options: Omit<OnlyOfficeLocalOptions, 'container'> & { autoRegister?: boolean },
  ): OnlyOfficeLocalEditor {
    const { autoRegister = true, ...rest } = options
    const editor = new OnlyOfficeLocalEditor({ ...rest, container })
    if (autoRegister) this.instances.add(editor)
    return editor
  }

  save(editor: OnlyOfficeLocalEditor, format?: string): Promise<SaveResult> {
    return editor.save(format)
  }

  /** Tear down every editor this service created. */
  destroyAll(): void {
    for (const editor of this.instances) editor.destroy()
    this.instances.clear()
  }
}

export type { DocumentInput, OnlyOfficeConfig, OnlyOfficeLocalOptions, SaveResult, UserInfo }
