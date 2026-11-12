interface OrderDetailNotFoundProps {
  onBack: () => void;
}

/** Not-found branch of the admin order detail page — the order does not exist. */
export function OrderDetailNotFound({ onBack }: OrderDetailNotFoundProps) {
  return (
    <div className="page product-not-found">
      <h2 className="page-title">Pedido no encontrado</h2>
      <button className="btn btn-primary mt-md" onClick={onBack}>
        Volver a pedidos
      </button>
    </div>
  );
}

export default OrderDetailNotFound;
