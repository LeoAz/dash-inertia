export type AppToastVariant = 'default' | 'destructive' | 'success'

export type AppToastPayload = {
  id?: string
  title?: string
  description?: string
  duration?: number
  variant?: AppToastVariant
}

/**
 * Imperative helper to trigger a toast from anywhere (no React import required).
 * ShopConfigLayout listens to the `app:toast` event and renders the UI.
 */
export function notify(payload: AppToastPayload): void {
  const detail: Required<AppToastPayload> = {
    id: payload.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title ?? '',
    description: payload.description ?? '',
    duration: payload.duration ?? 3500,
    variant: payload.variant ?? 'default',
  }
  const event = new CustomEvent('app:toast', { detail })
  window.dispatchEvent(event)
}
