import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CategoryDistributionItem } from '../../types';
import ErrorMessage from './ErrorMessage';

interface CategoryChartProps {
  data: CategoryDistributionItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#3B82F6', '#14B8A6',
];

export default function CategoryChart({ data, loading, error, onRetry }: CategoryChartProps) {
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">สัดส่วนสินค้าตามหมวดหมู่</h3>
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-44 mb-6" />
        <div className="flex items-center justify-center h-64">
          <div className="w-40 h-40 bg-gray-100 rounded-full border-[12px] border-gray-200" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">สัดส่วนสินค้าตามหมวดหมู่</h3>
        <div className="h-64 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">ไม่มีข้อมูล</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.productCount, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900">สัดส่วนสินค้า</h3>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
          ทั้งหมด {total} รายการ
        </span>
      </div>

      <div className="flex flex-col items-center gap-6">
        {/* Chart */}
        <div className="w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="productCount"
                nameKey="categoryName"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                  padding: '10px 14px',
                  fontSize: '13px',
                }}
                formatter={(value: number, _name: string) => [`${value} รายการ (${Math.round((value / total) * 100)}%)`, '']}
                labelFormatter={(label: string) => label}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend grid */}
        <div className="w-full grid grid-cols-2 gap-2">
          {data.slice(0, 6).map((item, index) => (
            <div key={item.categoryName} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50/70 hover:bg-gray-100/80 transition-colors">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-gray-700 truncate flex-1">{item.categoryName}</span>
              <span className="text-xs font-bold text-gray-900">{item.productCount}</span>
            </div>
          ))}
          {data.length > 6 && (
            <div className="flex items-center justify-center px-3 py-2 rounded-lg bg-gray-50/70">
              <span className="text-xs text-gray-500">+{data.length - 6} อื่นๆ</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
