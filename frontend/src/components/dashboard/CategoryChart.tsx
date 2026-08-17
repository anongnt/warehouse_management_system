import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CategoryDistributionItem } from '../../types';
import ErrorMessage from './ErrorMessage';

interface CategoryChartProps {
  data: CategoryDistributionItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

export default function CategoryChart({ data, loading, error, onRetry }: CategoryChartProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">สินค้าตามหมวดหมู่</h3>
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <div className="w-48 h-48 bg-gray-200 rounded-full" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">สินค้าตามหมวดหมู่</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          ไม่มีข้อมูลสินค้าตามหมวดหมู่
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">สินค้าตามหมวดหมู่</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="productCount"
              nameKey="categoryName"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ categoryName, productCount }) => `${categoryName} (${productCount})`}
              labelLine={true}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value} รายการ`, 'จำนวนสินค้า']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
