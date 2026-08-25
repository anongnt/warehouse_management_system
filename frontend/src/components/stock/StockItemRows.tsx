import ProductPicker from './ProductPicker';
import { StockBalance } from '../../types/stock.types';
import { StockFormMode, StockFormRow } from '../../hooks/useStockDocumentForm';

interface StockItemRowsProps {
  mode: StockFormMode;
  rows: StockFormRow[];
  rowErrors: Record<number, Record<string, string>>;
  rowWarnings: Record<number, string>;
  disabled?: boolean;
  onAddRow: () => void;
  onRemoveRow: (key: number) => void;
  onUpdateRow: (key: number, patch: Partial<Omit<StockFormRow, 'key'>>) => void;
  onSelectProduct: (key: number, product: StockBalance | null) => void;
}

export default function StockItemRows({
  mode,
  rows,
  rowErrors,
  rowWarnings,
  disabled = false,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onSelectProduct,
}: StockItemRowsProps) {
  return (
    <div className="space-y-4">
      {rows.map((row, index) => {
        const errors = rowErrors[index] || {};
        const warning = rowWarnings[index];
        const quantityId = `row-${row.key}-quantity`;
        const quantityErrorId = `${quantityId}-error`;
        const unitCostId = `row-${row.key}-unit-cost`;
        const unitCostErrorId = `${unitCostId}-error`;
        const countedId = `row-${row.key}-counted`;
        const countedErrorId = `${countedId}-error`;
        const reasonId = `row-${row.key}-reason`;
        const reasonErrorId = `${reasonId}-error`;

        const quantityMessage = warning || errors.quantity;
        const difference =
          row.onHandBalance !== null && row.countedQuantity !== ''
            ? Number(row.countedQuantity) - row.onHandBalance
            : null;

        return (
          <div
            key={row.key}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-gray-50 border border-gray-200 rounded-xl p-4"
          >
            <div className="md:col-span-5">
              <ProductPicker
                id={`row-${row.key}-product`}
                label={`สินค้า รายการที่ ${index + 1}`}
                value={row.productId}
                error={errors.productId}
                disabled={disabled}
                onChange={(product) => onSelectProduct(row.key, product)}
              />
            </div>

            <div className="md:col-span-2">
              <p className="block text-xs font-medium text-gray-600 mb-1.5">ยอดคงเหลือปัจจุบัน</p>
              <p className="px-3 py-2 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg">
                {row.onHandBalance === null ? '-' : row.onHandBalance.toLocaleString('th-TH')}
              </p>
            </div>

            {mode === 'adjustment' ? (
              <>
                <div className="md:col-span-2">
                  <label htmlFor={countedId} className="block text-xs font-medium text-gray-600 mb-1.5">
                    จำนวนที่นับได้
                  </label>
                  <input
                    id={countedId}
                    type="number"
                    min={0}
                    max={999999}
                    step={1}
                    value={row.countedQuantity}
                    disabled={disabled}
                    aria-invalid={errors.countedQuantity ? true : undefined}
                    aria-describedby={errors.countedQuantity ? countedErrorId : undefined}
                    onChange={(e) => onUpdateRow(row.key, { countedQuantity: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      errors.countedQuantity ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {errors.countedQuantity && (
                    <p id={countedErrorId} className="mt-1 text-xs text-red-600" role="alert">
                      {errors.countedQuantity}
                    </p>
                  )}
                  {difference !== null && (
                    <p className="mt-1 text-xs text-gray-500">
                      ส่วนต่าง: {difference > 0 ? `+${difference}` : difference}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor={reasonId} className="block text-xs font-medium text-gray-600 mb-1.5">
                    เหตุผล
                  </label>
                  <input
                    id={reasonId}
                    type="text"
                    maxLength={500}
                    value={row.reason}
                    disabled={disabled}
                    aria-invalid={errors.reason ? true : undefined}
                    aria-describedby={errors.reason ? reasonErrorId : undefined}
                    onChange={(e) => onUpdateRow(row.key, { reason: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      errors.reason ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {errors.reason && (
                    <p id={reasonErrorId} className="mt-1 text-xs text-red-600" role="alert">
                      {errors.reason}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className={mode === 'receipt' ? 'md:col-span-2' : 'md:col-span-4'}>
                  <label htmlFor={quantityId} className="block text-xs font-medium text-gray-600 mb-1.5">
                    จำนวน
                  </label>
                  <input
                    id={quantityId}
                    type="number"
                    min={1}
                    max={999999}
                    step={1}
                    value={row.quantity}
                    disabled={disabled}
                    aria-invalid={quantityMessage ? true : undefined}
                    aria-describedby={quantityMessage ? quantityErrorId : undefined}
                    onChange={(e) => onUpdateRow(row.key, { quantity: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                      quantityMessage ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  {quantityMessage && (
                    <p id={quantityErrorId} className="mt-1 text-xs text-red-600" role="alert">
                      {quantityMessage}
                    </p>
                  )}
                </div>

                {mode === 'receipt' && (
                  <div className="md:col-span-2">
                    <label htmlFor={unitCostId} className="block text-xs font-medium text-gray-600 mb-1.5">
                      ต้นทุนต่อหน่วย
                    </label>
                    <input
                      id={unitCostId}
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.unitCost}
                      disabled={disabled}
                      aria-invalid={errors.unitCost ? true : undefined}
                      aria-describedby={errors.unitCost ? unitCostErrorId : undefined}
                      onChange={(e) => onUpdateRow(row.key, { unitCost: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
                        errors.unitCost ? 'border-red-400' : 'border-gray-300'
                      }`}
                    />
                    {errors.unitCost && (
                      <p id={unitCostErrorId} className="mt-1 text-xs text-red-600" role="alert">
                        {errors.unitCost}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="md:col-span-1 flex md:justify-end md:pt-6">
              <button
                type="button"
                onClick={() => onRemoveRow(row.key)}
                disabled={disabled || rows.length <= 1}
                aria-label={`ลบรายการที่ ${index + 1}`}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:text-gray-300 disabled:hover:bg-transparent"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddRow}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-blue-400 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        เพิ่มรายการ
      </button>
    </div>
  );
}
