import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CategoryBreakdownItem } from '../../types/expense-summary.types';

interface ExpenseChartProps {
  categoryBreakdown: CategoryBreakdownItem[];
  loading: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExpenseBarChart({ categoryBreakdown, loading }: ExpenseChartProps) {
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

  // เรียงจากมากไปน้อย (data ควรมาเรียงแล้ว แต่ sort ซ้ำเพื่อความมั่นใจ)
  const chartData = [...categoryBreakdown]
    .sort((a, b) => b.amount - a.amount)
    .map(item => ({
      name: item.categoryName,
      value: item.amount,
      percentage: item.percentage,
    }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">มูลค่าค่าใช้จ่ายตามหมวดหมู่</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number, _name: string, props: any) => [
              `฿${formatCurrency(value)} (${props.payload.percentage.toFixed(1)}%)`,
              'มูลค่า',
            ]}
          />
          <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
