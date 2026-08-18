import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CategoryBreakdownItem } from '../../types/expense-summary.types';

interface ExpenseChartProps {
  categoryBreakdown: CategoryBreakdownItem[];
  loading: boolean;
}

const COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#3B82F6', '#14B8A6',
  '#9CA3AF',
];

function formatCurrency(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function prepareTopCategories(items: CategoryBreakdownItem[]): { name: string; value: number; percentage: number }[] {
  if (items.length <= 10) {
    return items.map(item => ({
      name: item.categoryName,
      value: item.amount,
      percentage: item.percentage,
    }));
  }

  const top10 = items.slice(0, 10);
  const rest = items.slice(10);
  const othersAmount = rest.reduce((sum, item) => sum + item.amount, 0);
  const othersPercentage = rest.reduce((sum, item) => sum + item.percentage, 0);

  return [
    ...top10.map(item => ({
      name: item.categoryName,
      value: item.amount,
      percentage: item.percentage,
    })),
    {
      name: 'อื่นๆ',
      value: othersAmount,
      percentage: Math.round(othersPercentage * 10) / 10,
    },
  ];
}

export default function ExpensePieChart({ categoryBreakdown, loading }: ExpenseChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-[400px] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-xs text-gray-400 mt-3">กำลังโหลดกราฟ...</p>
      </div>
    );
  }

  if (categoryBreakdown.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-[400px] flex flex-col items-center justify-center">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      </div>
    );
  }

  const chartData = prepareTopCategories(categoryBreakdown);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-900">สัดส่วนค่าใช้จ่าย</h3>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
          {chartData.length} หมวดหมู่
        </span>
      </div>

      {/* Chart + Legend */}
      <div className="flex flex-col items-center gap-5">
        {/* Donut Chart */}
        <div className="relative w-full h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                strokeWidth={0}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                  padding: '12px 16px',
                  fontSize: '13px',
                }}
                formatter={(value: number, name: string, props: any) => [
                  `฿${formatCurrency(value)} (${props.payload.percentage.toFixed(1)}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">รวม</p>
            <p className="text-lg font-extrabold text-gray-900">฿{(total / 1000).toFixed(0)}k</p>
          </div>
        </div>

        {/* Legend grid */}
        <div className="w-full grid grid-cols-2 gap-2">
          {chartData.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50/70 hover:bg-gray-100/80 transition-colors group"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate font-medium">{item.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold text-gray-900">{item.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
