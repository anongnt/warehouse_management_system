import { useDashboard } from '../hooks/useDashboard';
import KpiCards from '../components/dashboard/KpiCards';
import CategoryChart from '../components/dashboard/CategoryChart';
import LowStockTable from '../components/dashboard/LowStockTable';
import RecentProductsTable from '../components/dashboard/RecentProductsTable';

export default function DashboardPage() {
  const { summary, categories, lowStockProducts, recentProducts, loading, errors, retry } =
    useDashboard();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">แดชบอร์ด</h1>

      {/* KPI Cards */}
      <KpiCards
        data={summary}
        loading={loading.summary}
        error={errors.summary}
        onRetry={() => retry('summary')}
      />

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Chart */}
        <CategoryChart
          data={categories}
          loading={loading.categories}
          error={errors.categories}
          onRetry={() => retry('categories')}
        />

        {/* Low Stock Table */}
        <LowStockTable
          data={lowStockProducts}
          loading={loading.lowStock}
          error={errors.lowStock}
          onRetry={() => retry('lowStock')}
        />
      </div>

      {/* Recent Products Table */}
      <RecentProductsTable
        data={recentProducts}
        loading={loading.recent}
        error={errors.recent}
        onRetry={() => retry('recent')}
      />
    </div>
  );
}
