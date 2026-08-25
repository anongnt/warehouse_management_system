import { useState, useEffect, useRef } from 'react';
import { getBalances } from '../../services/stockApi';
import { StockBalance } from '../../types/stock.types';

interface ProductPickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (product: StockBalance | null) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Searchable product selector. Only `active` products can be picked, and the
 * option list carries the current balance so callers can display it.
 */
export default function ProductPicker({
  id,
  label,
  value,
  onChange,
  error,
  disabled = false,
}: ProductPickerProps) {
  const [products, setProducts] = useState<StockBalance[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await getBalances({
          page: 1,
          limit: 100,
          search: search.trim() || undefined,
        });
        const data = response.data;
        setProducts((data?.data || []).filter((item) => item.status === 'active'));
      } catch {
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [search]);

  const searchId = `${id}-search`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={searchId} className="block text-xs font-medium text-gray-600">
        {label}
      </label>
      <input
        id={searchId}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ค้นหาชื่อสินค้าหรือ SKU"
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
      />

      <label htmlFor={id} className="sr-only">
        เลือกสินค้า
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const selected = products.find((product) => product.productId === e.target.value) || null;
          onChange(selected);
        }}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
      >
        <option value="">{isLoading ? 'กำลังโหลดสินค้า...' : '-- เลือกสินค้า --'}</option>
        {products.map((product) => (
          <option key={product.productId} value={product.productId}>
            {product.name} ({product.sku}) — คงเหลือ {product.onHandBalance}
          </option>
        ))}
      </select>

      {error && (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
