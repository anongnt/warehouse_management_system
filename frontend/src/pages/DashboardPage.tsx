import { useDashboard } from '../hooks/useDashboard';
import KpiCards from '../components/dashboard/KpiCards';
import CategoryChart from '../components/dashboard/CategoryChart';
import LowStockTable from '../components/dashboard/LowStockTable';
import RecentProductsTable from '../components/dashboard/RecentProductsTable';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { summary, categories, lowStockProducts, recentProducts, loading, errors, retry } =
    useDashboard();
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'สวัสดีตอนเช้า';
    if (hour < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 shadow-2xl">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-blue-600 to-cyan-500" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,0,0,0.1)_0%,transparent_60%)]" />
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 blur-xl" />
        <div className="absolute top-6 right-12 w-3 h-3 bg-white/30 rounded-full animate-pulse" />
        <div className="absolute top-16 right-32 w-2 h-2 bg-white/20 rounded-full animate-pulse delay-300" />
        <div className="absolute bottom-8 right-24 w-2 h-2 bg-white/25 rounded-full animate-pulse delay-700" />

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">{today}</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {getGreeting()}, {user?.firstName || 'ผู้ใช้'} <span className="inline-block animate-bounce">👋</span>
            </h1>
            <p className="mt-2 text-blue-100/80 text-sm max-w-md">
              ภาพรวมระบบจัดการคลังสินค้าของคุณวันนี้ ตรวจสอบข้อมูลสำคัญได้ที่นี่
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-white/90 font-medium">ระบบทำงานปกติ</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiCards
        data={summary}
        loading={loading.summary}
        error={errors.summary}
        onRetry={() => retry('summary')}
      />

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart
          data={categories}
          loading={loading.categories}
          error={errors.categories}
          onRetry={() => retry('categories')}
        />
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
