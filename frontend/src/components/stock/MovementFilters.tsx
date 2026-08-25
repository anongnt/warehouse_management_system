import ProductPicker from './ProductPicker';
import { MovementType, MOVEMENT_TYPE_LABELS } from '../../types/stock.types';
import { MovementFilterState } from '../../hooks/useStockMovements';

interface MovementFiltersProps {
  filters: MovementFilterState;
  onChange: <K extends keyof MovementFilterState>(key: K, value: MovementFilterState[K]) => void;
  onReset: () => void;
}

const MOVEMENT_TYPES: MovementType[] = ['receipt', 'issue', 'adjustment', 'reversal'];

export default function MovementFilters({ filters, onChange, onReset }: MovementFiltersProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <ProductPicker
            id="movement-filter-product"
            label="สินค้า"
            value={filters.productId}
            onChange={(product) => onChange('productId', product ? product.productId : '')}
          />
        </div>

        <div>
          <label htmlFor="movement-filter-type" className="block text-xs font-medium text-gray-600 mb-1.5">
            ประเภทรายการ
          </label>
          <select
            id="movement-filter-type"
            value={filters.movementType}
            onChange={(e) => onChange('movementType', e.target.value as '' | MovementType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">ทุกประเภท</option>
            {MOVEMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {MOVEMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="movement-filter-start" className="block text-xs font-medium text-gray-600 mb-1.5">
            วันที่เริ่มต้น
          </label>
          <input
            id="movement-filter-start"
            type="date"
            value={filters.startDate}
            onChange={(e) => onChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="movement-filter-end" className="block text-xs font-medium text-gray-600 mb-1.5">
            วันที่สิ้นสุด
          </label>
          <input
            id="movement-filter-end"
            type="date"
            value={filters.endDate}
            onChange={(e) => onChange('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          ล้างตัวกรอง
        </button>
      </div>
    </div>
  );
}
