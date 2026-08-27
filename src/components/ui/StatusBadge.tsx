import './StatusBadge.css';

export type OrderStatus = 'pending' | 'approved' | 'canceled';

interface StatusBadgeProps {
  status?: OrderStatus | string | null;
}

const statusMap: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'badge-pending' },
  approved: { label: 'Aprobado', className: 'badge-approved' },
  canceled: { label: 'Cancelado', className: 'badge-canceled' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const safeStatus = (status && status in statusMap ? status : 'pending') as OrderStatus;
  const { label, className } = statusMap[safeStatus];

  return (
    <span className={`badge status-badge ${className}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

export default StatusBadge;
