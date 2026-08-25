import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStockMovements } from '../hooks/useStockMovements';
import MovementFilters from '../components/stock/MovementFilters';
import MovementTable from '../components/stock/MovementTable';
import CancelDocumentDialog from '../components/stock/CancelDocumentDialog';

export default function StockMovementPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialProductId = searchParams.get('productId') || '';

  const {
    movements,
    total,
    page,
    totalPages,
    limit,
    filters,
    loading,
    error,
    isStockCardMode,
    setPage,
    setFilter,
    resetFilters,
    refetch,
  } = useStockMovements({ productId: initialProductId });

  const [cancelTarget, setCancelTarget] = useState<{ id: string; number: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 shadow-xl">
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            ประวัติความเคลื่อนไหวสต็อก
          </h1>
          <p className="mt-1 text-blue-100 text-sm">
            {isStockCardMode
              ? 'โหมดการ์ดสต็อก: เรียงลำดับจากรายการเก่าไปใหม่เพื่อดูยอดคงเหลือต่อเนื่อง'
              : `รายการทั้งหมด ${total} รายการ เรียงจากใหม่ไปเก่า`}
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-xl" role="status">
          <span className="font-medium text-sm">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-xl" role="alert">
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      <MovementFilters filters={filters} onChange={setFilter} onReset={resetFilters} />

      <MovementTable
        movements={movements}
        loading={loading}
        onCancelDocument={
          user?.role === 'admin'
            ? (documentId, documentNumber) =>
                setCancelTarget({ id: documentId, number: documentNumber })
            : undefined
        }
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          แสดง {from}-{to} จาก {total} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            ก่อนหน้า
          </button>
          <span className="text-sm text-gray-600">
            หน้า {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            ถัดไป
          </button>
        </div>
      </div>

      {cancelTarget && (
        <CancelDocumentDialog
          documentId={cancelTarget.id}
          documentNumber={cancelTarget.number}
          isOpen={Boolean(cancelTarget)}
          onClose={() => setCancelTarget(null)}
          onSuccess={(documentNumber) => {
            setCancelTarget(null);
            setSuccessMessage(`ยกเลิกเอกสาร ${documentNumber} สำเร็จ`);
            refetch();
          }}
        />
      )}
    </div>
  );
}
