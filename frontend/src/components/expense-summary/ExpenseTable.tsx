import { ExpenseItem } from '../../types/expense-summary.types';

interface ExpenseTableProps {
  items: ExpenseItem[];
  loading: boolean;
  emptyMessage?: string;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExpenseTable({ items, loading, emptyMessage = 'ไม่มีข้อมูล' }: ExpenseTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-50 border-b" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-b border-gray-50 flex items-center px-5 gap-6">
              <div className="h-3.5 bg-gray-100 rounded-full w-1/4" />
              <div className="h-3.5 bg-gray-100 rounded-full w-1/6" />
              <div className="h-3.5 bg-gray-100 rounded-full w-1/6" />
              <div className="h-3.5 bg-gray-100 rounded-full w-12" />
              <div className="h-3.5 bg-gray-100 rounded-full w-16" />
              <div className="h-3.5 bg-gray-100 rounded-full w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">ชื่อสินค้า</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">SKU</th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">หมวดหมู่</th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">จำนวน</th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">ราคา/หน่วย</th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">มูลค่ารวม</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item, index) => (
              <tr key={item.id} className={`hover:bg-blue-50/30 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-5 py-3.5 text-gray-900 font-medium">{item.name}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-gray-100 text-gray-700">
                    {item.sku}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {item.category}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">{item.quantity.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right text-gray-700 tabular-nums">฿{formatCurrency(item.unitPrice)}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-gray-900 tabular-nums">฿{formatCurrency(item.totalValue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={5} className="px-5 py-3.5 text-right font-semibold text-gray-700">รวมทั้งหมด</td>
              <td className="px-5 py-3.5 text-right font-bold text-gray-900 tabular-nums">
                ฿{formatCurrency(items.reduce((sum, item) => sum + item.totalValue, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
