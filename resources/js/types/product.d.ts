export type ProductId = number;

export interface Product {
  id: ProductId;
  shop_id: number | null;
  name: string;
  quantity: number;
  description: string | null;
  /** Decimal string with 2 precision coming from backend */
  price: string;
  created_at: string | null; // ISO string
  updated_at: string | null; // ISO string
}

export interface ProductPageProps {
  products: {
    data: Product[];
    links?: unknown;
    meta?: unknown;
  };
  shop: { id: number | string; name: string };
}
