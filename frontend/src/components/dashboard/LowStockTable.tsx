import { LowStockProduct } from '../../types';
import ErrorMessage from './ErrorMessage';

interface LowStockTableProps {
  data: LowStockProduct[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
    </tr>
  );
}

export default function LowStockTable({ data, loading, error, onRetry }: LowStockTableProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">สินค้าสต็อกต่ำ</h3>
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">สินค้าสต็อกต่ำ</h3>
      {loading ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">ชื่อสินค้า</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">SKU</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">จำนวน</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">หมวดหมู่</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-gray-400">ไม่มีสินค้าที่สต็อกต่ำ</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">ชื่อสินค้า</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">SKU</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">จำนวน</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">หมวดหมู่</th>
              </tr>
            </thead>
            <tbody>
              {data.map((product) => (
                <tr key={product.sku} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{product.sku}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      {product.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{product.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
