import './StatusBadge.css';

export type OrderStatus = 'pending' | 'approved' | 'canceled';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusMap = {
  pending: { label: 'Pendiente', className: 'badge-pending' },
  approved: { label: 'Aprobado', className: 'badge-approved' },
  canceled: { label: 'Cancelado', className: 'badge-canceled' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = statusMap[status];

  return (
    <span className={`badge status-badge ${className}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

export default StatusBadge;
