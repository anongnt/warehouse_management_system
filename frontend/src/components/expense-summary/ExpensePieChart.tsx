import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CategoryBreakdownItem } from '../../types/expense-summary.types';

interface ExpenseChartProps {
  categoryBreakdown: CategoryBreakdownItem[];
  loading: boolean;
}

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#9CA3AF',
];

function formatCurrency(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// จัดกลุ่ม: แสดง 10 อันดับแรก + รวม "อื่นๆ"
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (categoryBreakdown.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-80 flex items-center justify-center">
        <p className="text-gray-400 text-sm">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      </div>
    );
  }

  const chartData = prepareTopCategories(categoryBreakdown);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">สัดส่วนค่าใช้จ่ายตามหมวดหมู่</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            nameKey="name"
            label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
            labelLine={true}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              `฿${formatCurrency(value)} (${props.payload.percentage.toFixed(1)}%)`,
              name,
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
