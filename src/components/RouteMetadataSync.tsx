import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { updateDocumentMetadata } from '../utils/routeMetadata';

export function RouteMetadataSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    updateDocumentMetadata(pathname);
  }, [pathname]);

  return null;
}

export default RouteMetadataSync;
