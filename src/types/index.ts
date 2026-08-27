// ─── Product ───────────────────────────────────────────────
export interface Product {
  product_id: number;
  product_name: string;
  product_price: string;        // numeric strings from PG
  product_description: string;
  qty_available: number;
  in_stock: boolean;
  category: string;             // category slug or display name
  product_image_url?: string | null; // absolute/relative URL from the API (/images/<key>); null = no photo
}

// ─── Orders ────────────────────────────────────────────────
export interface ClientInfo {
  name: string;
  last_name: string;
  country_code?: string;
  tlf_num: string;
  cedula: string; // Mandatory (was previously optional)
}

// Order response model
export interface OrderListItem {
  order_id: number;
  name: string;
  last_name: string;
  tlf_num: string; // Order contact phone snapshot
  cedula?: string; // string on current backends; optional for backward compatibility
  total_amount: string;
  status: 'pending' | 'approved' | 'canceled';
  item_count: number;
  created_at: string;
  // Present on newer backends — powers the delivery/payment chips (C10)
  delivery_type?: string;
  payment_method?: string;
}

export type OrderSummary = OrderListItem;

export interface OrderItem {
  product_name: string;
  product_qty: number;
  product_price: string;
  product_total: string;        // qty × unit price (computed server-side)
}

export interface OrderDetail {
  order_id: number;
  order_token?: string;
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

// ─── Create order payload ──────────────────────────────────
export interface CreateOrderPayload {
  client_info: ClientInfo;
  delivery_type: 'envio_nacional' | 'delivery' | 'retiro_tienda' | string;
  payment_method: 'pago_movil' | 'binance' | 'zelle' | 'paypal' | 'cash' | string;
  items: Array<{
    product_id: number;
    product_qty: number;
  }>;
}

export type CheckoutPayload = CreateOrderPayload;

// ─── Order creation response (POST /orders 201) ───────────
export interface CreatedOrderItem {
  id: number;
  name: string;
  ordered_qty: number;
  price: string;
}

export interface CreatedOrder {
  order_id: number;
  order_token?: string; // Unguessable UUID
  status?: 'pending' | 'approved' | 'canceled';
  delivery_type: string;
  payment_method: string;
  total_amount: string;
  contact_phone?: string;
  items: CreatedOrderItem[];
}

// ─── Approve response (PATCH /orders/:id/approve) ─────────
export interface ApproveResult {
  order_id: number;
  status: 'approved';
}

// ─── API envelope ──────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean | string;  // always boolean today; union kept as legacy tolerance
  data?: T;
  row?: T;                    // create product quirk
  updated_row?: T;            // update product quirk
  message?: string;
}
