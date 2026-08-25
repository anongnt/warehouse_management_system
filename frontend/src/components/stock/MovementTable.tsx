import { StockMovement, MOVEMENT_TYPE_LABELS, MovementType } from '../../types/stock.types';

interface MovementTableProps {
  movements: StockMovement[];
  loading: boolean;
  /** Provided for admins only; renders the per-row cancel action */
  onCancelDocument?: (documentId: string, documentNumber: string) => void;
}

const TYPE_BADGE_CLASSES: Record<MovementType, string> = {
  receipt: 'bg-emerald-50 text-emerald-700',
  issue: 'bg-blue-50 text-blue-700',
  adjustment: 'bg-amber-50 text-amber-700',
  reversal: 'bg-gray-100 text-gray-700',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MovementTable({ movements, loading, onCancelDocument }: MovementTableProps) {
  const columnCount = onCancelDocument ? 8 : 7;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div aria-live="polite" className="sr-only">
        {loading ? 'กำลังโหลดประวัติความเคลื่อนไหว' : `แสดงประวัติ ${movements.length} รายการ`}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <caption className="sr-only">ตารางประวัติความเคลื่อนไหวสต็อก</caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                เลขที่เอกสาร
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                วันที่
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                ประเภทรายการ
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                สินค้า
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                จำนวน
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                ยอดคงเหลือหลังรายการ
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                ผู้บันทึก
              </th>
              {onCancelDocument && (
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  จัดการ
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-gray-500">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            )}

            {!loading && movements.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-sm text-gray-500">
                  ไม่พบประวัติความเคลื่อนไหว
                </td>
              </tr>
            )}

            {!loading &&
              movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {movement.documentNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDateTime(movement.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        TYPE_BADGE_CLASSES[movement.movementType]
                      }`}
                    >
                      {MOVEMENT_TYPE_LABELS[movement.movementType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {movement.productName}
                    <span className="ml-1 text-xs text-gray-400">({movement.sku})</span>
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-semibold ${
                      movement.quantity > 0
                        ? 'text-emerald-700'
                        : movement.quantity < 0
                          ? 'text-red-700'
                          : 'text-gray-500'
                    }`}
                  >
                    {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    {movement.balanceAfter.toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{movement.createdByName}</td>
                  {onCancelDocument && (
                    <td className="px-4 py-3 text-sm text-right">
                      {movement.movementType !== 'reversal' && (
                        <button
                          type="button"
                          onClick={() => onCancelDocument(movement.documentId, movement.documentNumber)}
                          aria-label={`ยกเลิกเอกสาร ${movement.documentNumber}`}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          ยกเลิกเอกสาร
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
