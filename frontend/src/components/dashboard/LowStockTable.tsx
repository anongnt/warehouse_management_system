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
    <div className="flex items-center gap-4 p-3 animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-xl" />
      <div className="flex-1">
        <div className="h-3.5 bg-gray-200 rounded w-28 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
      <div className="h-6 bg-gray-200 rounded-lg w-10" />
    </div>
  );
}

export default function LowStockTable({ data, loading, error, onRetry }: LowStockTableProps) {
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">สินค้าสต็อกต่ำ</h3>
        <ErrorMessage message={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">สินค้าสต็อกต่ำ</h3>
            {!loading && data.length > 0 && (
              <p className="text-[11px] text-rose-500 font-medium">ต้องเติมสต็อก {data.length} รายการ</p>
            )}
          </div>
        </div>
        {!loading && data.length > 0 && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700">สต็อกสินค้าปกติ</p>
          <p className="text-xs text-gray-400 mt-0.5">ไม่มีสินค้าที่ต้องเติมสต็อก</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {data.map((product, index) => {
            const urgency = product.quantity < 5 ? 'critical' : product.quantity <= 7 ? 'warning' : 'low';
            const urgencyColors = {
              critical: 'bg-red-500 text-white',
              warning: 'bg-amber-100 text-amber-700',
              low: 'bg-orange-50 text-orange-700',
            };

            return (
              <div
                key={product.sku}
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50/60 border border-transparent hover:border-rose-100 transition-all duration-200"
              >
                {/* Rank */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-rose-500 to-red-600 shadow-sm">
                  <span className="text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-rose-700 transition-colors">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-gray-400">{product.sku}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="text-[11px] text-gray-400">{product.category}</span>
                  </div>
                </div>

                {/* Quantity badge */}
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${urgencyColors[urgency]} min-w-[40px] text-center`}>
                  {product.quantity}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
