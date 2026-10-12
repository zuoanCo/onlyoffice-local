import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { OnlyOfficeLocalEditor } from '@onlyoffice-local/core'
import type { DocumentInput, OnlyOfficeConfig, SaveResult, UserInfo } from '@onlyoffice-local/core'

export interface OnlyOfficeLocalEditorConfig {
  document: DocumentInput
  baseUrl?: string
  title?: string
  fileType?: string
  mode?: 'edit' | 'view'
  lang?: string
  user?: UserInfo
  width?: string
  height?: string
  config?: OnlyOfficeConfig
}

/**
 * `<oo-editor>` - standalone Angular component.
 *
 * Standalone (no NgModule needed) and takes a single `editor` input object so
 * the change-detection story stays simple: a new object identity remounts,
 * field-level changes are applied through the core's setters.
 */
@Component({
  selector: 'oo-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="oo-editor" [style.height]="editor.height || '100%'">
      <div class="oo-editor__stage" #stage></div>
      @if (error) {
        <div class="oo-editor__overlay oo-editor__overlay--error">{{ error.message }}</div>
      } @else if (loading) {
        <div class="oo-editor__overlay">Loading editor...</div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class OnlyOfficeLocalComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) editor!: OnlyOfficeLocalEditorConfig

  @Input() loadingText = 'Loading editor...'

  @Output() ready = new EventEmitter<void>()
  @Output() documentReady = new EventEmitter<void>()
  @Output() stateChange = new EventEmitter<boolean>()
  @Output() requestClose = new EventEmitter<void>()
  @Output() metaChange = new EventEmitter<string>()
  @Output() errorEvent = new EventEmitter<Error>()

  @ViewChild('stage', { static: true }) stage!: ElementRef<HTMLElement>

  loading = true
  error: Error | null = null

  private instance: OnlyOfficeLocalEditor | null = null
  private lastDocument: DocumentInput | null = null
  private readonly zone = inject(NgZone)

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['editor'] || !this.stage) return

    // A different document means DocsAPI has to build a fresh iframe.
    if (this.lastDocument !== this.editor.document) {
      this.mount()
      return
    }
    if (!this.instance) {
      this.mount()
      return
    }
    if (changes['editor'].currentValue?.mode !== changes['editor'].previousValue?.mode) {
      void this.instance.setMode(this.editor.mode ?? 'edit')
    }
    if (changes['editor'].currentValue?.lang !== changes['editor'].previousValue?.lang) {
      void this.instance.setLang(this.editor.lang ?? 'en-US')
    }
  }

  ngOnDestroy(): void {
    this.instance?.destroy()
    this.instance = null
  }

  /** Imperative save; resolves with the edited bytes. */
  save(format?: string): Promise<SaveResult | null> {
    return this.instance ? this.instance.save(format) : Promise.resolve(null)
  }

  /** The underlying core editor, for anything the component does not surface. */
  getEditor(): OnlyOfficeLocalEditor | null {
    return this.instance
  }

  private mount(): void {
    this.instance?.destroy()
    const cfg = this.editor
    this.lastDocument = cfg.document
    this.loading = true
    this.error = null

    const instance = new OnlyOfficeLocalEditor({
      container: this.stage.nativeElement,
      document: cfg.document,
      baseUrl: cfg.baseUrl ?? '/',
      title: cfg.title,
      fileType: cfg.fileType,
      mode: cfg.mode ?? 'edit',
      lang: cfg.lang ?? 'en-US',
      user: cfg.user,
      width: cfg.width,
      height: cfg.height,
      config: cfg.config,
    })

    // DocsAPI fires its callbacks from outside Angular's knowledge; re-enter
    // the zone so bindings actually update.
    this.zone.run(() => instance.on('ready', () => this.ready.emit()))
    this.zone.run(() => instance.on('documentReady', () => {
      this.loading = false
      this.documentReady.emit()
    }))
    this.zone.run(() => instance.on('stateChange', (m: boolean) => this.stateChange.emit(m)))
    this.zone.run(() => instance.on('requestClose', () => this.requestClose.emit()))
    this.zone.run(() => instance.on('metaChange', (t: string) => this.metaChange.emit(t)))
    this.zone.run(() => instance.on('error', (err: Error) => {
      this.error = err
      this.loading = false
      this.errorEvent.emit(err)
    }))

    this.instance = instance
    void instance.whenReady()
  }
}
