import LoadingSpinner from '../../../components/ui/LoadingSpinner';

/**
 * Placeholder rendered while the (lazy loaded) recharts bundle is fetched.
 */
export function DashboardChartsLoading() {
  return (
    <div className="dashboard-charts-loading" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner />
    </div>
  );
}

export default DashboardChartsLoading;
