import { RecentProduct } from '../../types';
import ErrorMessage from './ErrorMessage';

interface RecentProductsTableProps {
  data: RecentProduct[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'เมื่อวาน';
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  return formatDate(dateStr);
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-10" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-14" /></td>
      <td className="px-5 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
    </tr>
  );
}

export default function RecentProductsTable({ data, loading, error, onRetry }: RecentProductsTableProps) {
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">สินค้าที่เพิ่มล่าสุด</h3>
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">สินค้าที่เพิ่มล่าสุด</h3>
            <p className="text-[11px] text-gray-400">อัปเดตอัตโนมัติ</p>
          </div>
        </div>
        {!loading && data.length > 0 && (
          <span className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full font-semibold">
            {data.length} รายการ
          </span>
        )}
      </div>

      {loading ? (
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-y border-gray-100">
              <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">ชื่อสินค้า</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
              <th className="text-right px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">จำนวน</th>
              <th className="text-center px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
              <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">เพิ่มเมื่อ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      ) : data.length === 0 ? (
        <div className="py-14 flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">ไม่มีข้อมูลสินค้า</p>
          <p className="text-xs text-gray-400 mt-0.5">สินค้าที่เพิ่มจะแสดงที่นี่</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-y border-gray-100">
                <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">ชื่อสินค้า</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
                <th className="text-right px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">จำนวน</th>
                <th className="text-center px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">สถานะ</th>
                <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">เพิ่มเมื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((product, index) => (
                <tr
                  key={product.sku}
                  className="group hover:bg-blue-50/40 transition-colors duration-150"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {product.name}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-[11px] font-mono font-medium text-gray-600">
                      {product.sku}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-indigo-50 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-100">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`text-sm font-bold ${product.quantity <= 10 ? 'text-rose-600' : 'text-gray-900'}`}>
                      {product.quantity.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    {product.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 ring-1 ring-gray-200">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                        ไม่ใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="text-xs text-gray-500">{getRelativeTime(product.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
