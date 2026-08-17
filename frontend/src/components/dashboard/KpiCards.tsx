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
    <div className="bg-white rounded-lg shadow p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-7 bg-gray-200 rounded w-32" />
    </div>
  );
}

export default function KpiCards({ data, loading, error, onRetry }: KpiCardsProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const cards = [
    {
      label: 'จำนวนสินค้าทั้งหมด',
      value: data?.totalProducts ?? 0,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'มูลค่าคลังสินค้า',
      value: formatCurrency(data?.inventoryValue ?? 0),
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'จำนวนหมวดหมู่',
      value: data?.totalCategories ?? 0,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'สินค้าสต็อกต่ำ',
      value: data?.lowStockCount ?? 0,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} rounded-lg shadow p-5`}>
          <p className={`text-sm font-medium ${card.color}`}>{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
