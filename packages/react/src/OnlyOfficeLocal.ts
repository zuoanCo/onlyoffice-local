/**
 * `<OnlyOfficeLocal>` - the batteries-included React component.
 *
 * Built with `createElement` rather than JSX so the published package carries
 * no JSX runtime dependency and the type definitions stay plain `.d.ts`.
 */
import { createElement, forwardRef, useImperativeHandle } from 'react'
import type { ReactNode } from 'react'
import { useOnlyOfficeLocal } from './useOnlyOfficeLocal.js'
import type { UseOnlyOfficeLocalOptions } from './useOnlyOfficeLocal.js'
import type { SaveResult } from '@onlyoffice-local/core'

export interface OnlyOfficeLocalProps extends UseOnlyOfficeLocalOptions {
  className?: string
  style?: React.CSSProperties
  /** Rendered while the editor kernel boots. */
  loadingFallback?: ReactNode
  /** Rendered when mounting or conversion fails. */
  errorFallback?: (error: Error) => ReactNode
}

export interface OnlyOfficeLocalHandle {
  save: (format?: string) => Promise<SaveResult | null>
  whenReady: () => Promise<void>
  setDocument: (document: UseOnlyOfficeLocalOptions['document'], hints?: { title?: string; fileType?: string }) => Promise<void>
  setMode: (mode: 'edit' | 'view') => Promise<void>
  setLang: (lang: string) => Promise<void>
  destroy: () => void
}

export const OnlyOfficeLocal = forwardRef<OnlyOfficeLocalHandle, OnlyOfficeLocalProps>(
  function OnlyOfficeLocal(props, ref) {
    const { className, style, loadingFallback, errorFallback, ...options } = props
    const { containerRef, loading, error, save, whenReady, setDocument, setMode, setLang, destroy } =
      useOnlyOfficeLocal(options)

    useImperativeHandle(ref, () => ({ save, whenReady, setDocument, setMode, setLang, destroy }), [
      save,
      whenReady,
      setDocument,
      setMode,
      setLang,
      destroy,
    ])

    const children: ReactNode[] = [
      createElement('div', { key: 'stage', className: 'oo-editor__stage', ref: containerRef }),
    ]

    if (error) {
      children.push(
        createElement(
          'div',
          { key: 'error', className: 'oo-editor__overlay oo-editor__overlay--error' },
          errorFallback ? errorFallback(error) : createElement('p', null, error.message),
        ),
      )
    } else if (loading) {
      children.push(
        createElement(
          'div',
          { key: 'loading', className: 'oo-editor__overlay' },
          loadingFallback ?? 'Loading editor...',
        ),
      )
    }

    return createElement(
      'div',
      {
        className: ['oo-editor', className].filter(Boolean).join(' '),
        style: { height: props.height ?? '100%', ...style },
      },
      children,
    )
  },
)
