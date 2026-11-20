import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTopProducts } from '../../../api/analytics';
import { useAsync } from '../../../hooks/useAsync';
import { ADMIN_ROUTES } from '../../../lib/routes';
import { formatPrice } from '../../../constants';
import { rankTopProducts } from '../../../utils/topProducts';
import { getCategoryIcon } from '../../../components/ui/CategoryIcons';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ChartPillGroup, { type ChartPillOption } from './ChartPillGroup';
import type { TopProductsPeriod, TopProductsSort } from '../../../types';

const SORT_OPTIONS: ChartPillOption<TopProductsSort>[] = [
  { value: 'units', label: 'Unidades (#)' },
  { value: 'revenue', label: 'Ingresos ($)' },
];

const PERIOD_OPTIONS: ChartPillOption<TopProductsPeriod>[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'Todo' },
];

function getRankClassName(badgeRank: string): string {
  if (badgeRank.startsWith('🥇')) return 'tp-rank-gold';
  if (badgeRank.startsWith('🥈')) return 'tp-rank-silver';
  if (badgeRank.startsWith('🥉')) return 'tp-rank-bronze';
  return '';
}

function getStockClassName(qtyAvailable: number, inStock: boolean): string {
  if (qtyAvailable === 0 || !inStock) return 'tp-stock-out';
  if (qtyAvailable <= 3) return 'tp-stock-low';
  return 'tp-stock-ok';
}

function getStockLabel(qtyAvailable: number, inStock: boolean): string {
  if (qtyAvailable === 0 || !inStock) return 'Agotado (0)';
  return `${qtyAvailable} en stock`;
}

interface TopProductsCardProps {
  auth?: { getToken?: () => Promise<string | null> };
}

export function TopProductsCard({ auth }: TopProductsCardProps) {
  const [sort, setSort] = useState<TopProductsSort>('units');
  const [period, setPeriod] = useState<TopProductsPeriod>('all');

  const { data, isLoading, isError, retry } = useAsync(
    () => fetchTopProducts({ sort, period, limit: 5 }, auth),
    [sort, period, auth],
  );

  const ranked = useMemo(() => rankTopProducts(data ?? []), [data]);

  const subtitle =
    sort === 'units'
      ? 'Más vendidos en pedidos aprobados'
      : 'Mayor ingreso en pedidos aprobados';

  return (
    <section className="dashboard-section card top-products-card animate-slideUp">
      <div className="section-header">
        <div className="section-header-title-wrap">
          <h2 className="section-title">Productos Destacados</h2>
          <span className="section-subtitle text-muted">{subtitle}</span>
        </div>
        <Link to={ADMIN_ROUTES.products} className="section-link-action">
          Ver catálogo &rarr;
        </Link>
      </div>

      <div className="tp-controls">
        <ChartPillGroup
          ariaLabel="Criterio de ranking"
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
        />
        <ChartPillGroup
          ariaLabel="Período de ranking"
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {isLoading ? (
        <div className="tp-status-box">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="empty-top-products tp-error-state" role="alert">
          <p>No pudimos cargar el ranking de productos.</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={retry}>
            Reintentar
          </button>
        </div>
      ) : ranked.length === 0 ? (
        <div className="empty-top-products text-muted">
          {period === 'all'
            ? 'Aún no hay ventas aprobadas para mostrar un ranking.'
            : 'No hay ventas aprobadas en este período.'}
        </div>
      ) : (
        <div className="top-products-list">
          {ranked.map((item) => (
            <div key={item.product_id} className="top-product-item">
              <div className="tp-left">
                <span className={`tp-rank font-display ${getRankClassName(item.badgeRank)}`}>
                  {item.badgeRank}
                </span>
                <div className="tp-thumb">
                  {item.product_image_url ? (
                    <img src={item.product_image_url} alt={item.product_name} />
                  ) : (
                    <span className="tp-thumb-letter font-display">
                      {item.product_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="tp-info">
                  <span className="tp-name">{item.product_name}</span>
                  <div className="tp-meta">
                    <span className="tp-category-chip">
                      {getCategoryIcon(item.category)}
                      {item.category}
                    </span>
                    <span className="tp-sold-tag">
                      {item.units_sold} {item.units_sold === 1 ? 'vendido' : 'vendidos'}
                    </span>
                    <span className="tp-revenue-tag">{formatPrice(item.total_revenue)}</span>
                  </div>
                </div>
              </div>

              <div className="tp-right">
                <div className="tp-pricing">
                  <span className="tp-price font-display">{formatPrice(item.product_price)}</span>
                  <span className={`tp-stock-badge ${getStockClassName(item.qty_available, item.in_stock)}`}>
                    {getStockLabel(item.qty_available, item.in_stock)}
                  </span>
                </div>
                <Link
                  to={`${ADMIN_ROUTES.products}?edit=${item.product_id}`}
                  className="btn btn-outline btn-sm tp-edit-btn"
                  aria-label={`Editar ${item.product_name}`}
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-footer">
        <Link to={ADMIN_ROUTES.products} className="btn btn-outline btn-block">
          Gestionar productos
        </Link>
      </div>
    </section>
  );
}

export default TopProductsCard;
