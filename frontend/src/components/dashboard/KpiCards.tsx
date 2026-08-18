import { DashboardSummary } from '../../types';
import ErrorMessage from './ErrorMessage';

interface KpiCardsProps {
  data: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function formatCurrency(value: number): string {
  return `฿${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function SkeletonCard() {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
          <div className="h-7 bg-gray-200 rounded w-28" />
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
      </div>
      <div className="mt-4 h-1.5 bg-gray-100 rounded-full w-full" />
    </div>
  );
}

export default function KpiCards({ data, loading, error, onRetry }: KpiCardsProps) {
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const cards = [
    {
      label: 'สินค้าทั้งหมด',
      value: (data?.totalProducts ?? 0).toLocaleString(),
      subtitle: 'รายการในระบบ',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      gradient: 'from-blue-500 to-blue-600',
      lightBg: 'bg-blue-50',
      accentColor: 'text-blue-600',
      barColor: 'bg-blue-500',
    },
    {
      label: 'มูลค่าคลังสินค้า',
      value: formatCurrency(data?.inventoryValue ?? 0),
      subtitle: 'มูลค่ารวม',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-600',
      lightBg: 'bg-emerald-50',
      accentColor: 'text-emerald-600',
      barColor: 'bg-emerald-500',
    },
    {
      label: 'หมวดหมู่',
      value: (data?.totalCategories ?? 0).toLocaleString(),
      subtitle: 'หมวดหมู่ทั้งหมด',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      gradient: 'from-violet-500 to-purple-600',
      lightBg: 'bg-violet-50',
      accentColor: 'text-violet-600',
      barColor: 'bg-violet-500',
    },
    {
      label: 'สินค้าสต็อกต่ำ',
      value: (data?.lowStockCount ?? 0).toLocaleString(),
      subtitle: (data?.lowStockCount ?? 0) > 0 ? 'ต้องเติมสต็อก!' : 'สต็อกปกติ',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      gradient: 'from-rose-500 to-red-600',
      lightBg: 'bg-rose-50',
      accentColor: (data?.lowStockCount ?? 0) > 0 ? 'text-rose-600' : 'text-gray-600',
      barColor: 'bg-rose-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          {/* Background gradient accent */}
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.gradient} opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/3 group-hover:opacity-[0.07] transition-opacity`} />

          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
              <p className={`text-2xl font-extrabold ${card.accentColor} tracking-tight`}>{card.value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{card.subtitle}</p>
            </div>
            <div className={`w-12 h-12 bg-gradient-to-br ${card.gradient} rounded-2xl flex items-center justify-center shadow-lg shadow-${card.gradient.split('-')[1]}/20`}>
              <span className="text-white">{card.icon}</span>
            </div>
          </div>

          {/* Decorative bar */}
          <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${card.barColor} rounded-full w-3/4 opacity-60`} />
          </div>
        </div>
      ))}
    </div>
  );
}
