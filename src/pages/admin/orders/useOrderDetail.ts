import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { fetchOrderDetail } from '../../../api/orders';
import { fetchAllProducts } from '../../../api/products';
import { useAsync } from '../../../hooks/useAsync';
import type { OrderDetail } from '../../../types';
import {
  buildCatalogImageMap,
  type AdminApiAuth,
  type CatalogImageMap,
} from './orderDetailHelpers';

export interface OrderDetailState {
  order: OrderDetail | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  retry: () => void;
  catalogImageMap: CatalogImageMap;
}

/**
 * Loads the admin order detail plus the live catalog (used to recover the
 * product photo of lines that arrive without one).
 */
export function useOrderDetail(auth?: AdminApiAuth): OrderDetailState {
  const { id } = useParams();

  const { data: order, isLoading, isError, error, retry } = useAsync(
    () => fetchOrderDetail(Number(id), auth),
    [id, auth],
  );
  const { data: catalogProducts } = useAsync(fetchAllProducts, []);

  const catalogImageMap = useMemo(
    () => buildCatalogImageMap(catalogProducts),
    [catalogProducts],
  );

  return { order, isLoading, isError, error, retry, catalogImageMap };
}

export default useOrderDetail;
