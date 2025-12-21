import type { PageProps } from '@inertiajs/core'

export type SaleId = number | string

export interface SaleRow {
  id: SaleId
    shop_id: number | string
  receipt_number?: string | null
  customer_name?: string | null
  hairdresser_name?: string | null
  creator_name?: string | null
  payment_method?: 'orange_money' | 'caisse'
  /** Decimal number sent as number or string */
  total_amount: number | string
  /** ISO date string */
  sale_date: string
  /** True if a promotion is attached to the sale */
  promotion_applied?: boolean
  /** Promotion label (name or computed value) */
  promotion_label?: string | null
  /** Details of items included in the sale */
  details?: Array<{
    type: 'product' | 'service'
    name: string
    quantity?: number
    unit_price?: number
    line_subtotal?: number
    price?: number
  }>
}

export type Paginator<T> = {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number | null
  to?: number | null
  path?: string
  first_page_url?: string
  last_page_url?: string
  next_page_url?: string | null
  prev_page_url?: string | null
}

export interface SalesPageProps extends PageProps {
  sales: Paginator<SaleRow>
  filters: {
    q?: string | null
    sort?: 'receipt_number' | 'sale_date' | 'customer_name' | 'hairdresser_name' | 'total_amount' | null
    dir?: 'asc' | 'desc' | null
    perPage?: number | null
    date_from?: string | null
    date_to?: string | null
  }
  shop: { id: number | string; name?: string }
  can_filter_by_date?: boolean
  products: Array<{ id: number; name: string; price: number }>
  services: Array<{ id: number; name: string; price: number }>
  hairdressers: Array<{ id: number; name: string }>
  promotions: Array<{
    id: number
    name: string
    percentage: number
    amount: number
    applicable_to_products: boolean
    applicable_to_services: boolean
    active: boolean
    starts_at?: string | null
    ends_at?: string | null
    days_of_week?: number[] | null
  }>
}
