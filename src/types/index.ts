// ─── Product ───────────────────────────────────────────────
export interface Product {
  product_id: number;
  product_name: string;
  product_price: string;        // numeric strings from PG
  product_description: string;
  qty_available: number;
  in_stock: boolean;
  category: string;             // category slug or display name
  product_image?: string;       // image URL/path once product photos are supported
}

// ─── Orders ────────────────────────────────────────────────
export interface OrderSummary {
  order_id: number;
  name: string;
  last_name: string;
  cedula?: string;              // "V-12345678" | "E-…" | "J-…" (optional until backend ships it)
  tlf_num: string;
  total_amount: string;
  status: 'pending' | 'approved' | 'canceled';
  item_count: number;
  created_at: string;
}

export interface OrderItem {
  product_name: string;
  product_qty: number;
  product_price: string;
  product_total: string;        // qty × unit price (computed server-side)
}

export interface OrderDetail {
  order_id: number;
  status: 'pending' | 'approved' | 'canceled';
  client: { name: string; last_name: string; cedula?: string; tlf_num: string };
  delivery_type: string;        // DELIVERY_TYPES slug (e.g. "envio_nacional")
  payment_method: string;       // PAYMENT_METHODS slug (e.g. "pago_movil")
  total_amount: string;
  created_at: string;
  items: OrderItem[];
}

// ─── Cart (client-side only) ───────────────────────────────
export interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Checkout payload ──────────────────────────────────────
export interface CheckoutPayload {
  client_info: {
    name: string;
    last_name: string;
    cedula?: string;
    country_code: string;
    tlf_num: string;
  };
  delivery_type: string;
  payment_method: string;
  items: { product_id: number; product_qty: number }[];
}

// ─── API envelope ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean | string;  // backend sometimes sends string "true"/"false"
  data?: T;
  row?: T;                    // create product quirk
  updated_row?: T;            // update product quirk
  message?: string;
}
