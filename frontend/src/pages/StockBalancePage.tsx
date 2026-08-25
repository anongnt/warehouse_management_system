import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStockBalances } from '../hooks/useStockBalances';
import StockBalanceTable from '../components/stock/StockBalanceTable';
import { getCategoriesFlat } from '../services/categoryApi';
import { CategoryFlat } from '../types';

export default function StockBalancePage() {
  const {
    balances,
    total,
    page,
    totalPages,
    limit,
    search,
    categoryId,
    lowStock,
    threshold,
    loading,
    error,
    setPage,
    setSearch,
    setCategoryId,
    setLowStock,
    setThreshold,
  } = useStockBalances();

  const [categories, setCategories] = useState<CategoryFlat[]>([]);

  useEffect(() => {
    let cancelled = false;
    getCategoriesFlat({ status: 'active' })
      .then((response) => {
        if (!cancelled) {
          setCategories(response.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 shadow-xl">
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">ยอดคงเหลือสต็อก</h1>
            <p className="mt-1 text-blue-100 text-sm">สินค้าทั้งหมด {total} รายการ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/stock/receipts/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200"
            >
              รับสินค้าเข้า
            </Link>
            <Link
              to="/stock/issues/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500/20 text-white border border-white/40 rounded-xl font-semibold text-sm hover:bg-blue-500/30 transition-all duration-200"
            >
              จ่ายสินค้าออก
            </Link>
            <Link
              to="/stock/movements"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500/20 text-white border border-white/40 rounded-xl font-semibold text-sm hover:bg-blue-500/30 transition-all duration-200"
            >
              ประวัติความเคลื่อนไหว
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-xl" role="alert">
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="balance-search" className="block text-xs font-medium text-gray-600 mb-1.5">
              ค้นหา
            </label>
            <input
              id="balance-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ชื่อสินค้า หรือ SKU"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="balance-category" className="block text-xs font-medium text-gray-600 mb-1.5">
              หมวดหมู่
            </label>
            <select
              id="balance-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {'— '.repeat(category.level)}
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end gap-2">
            <div className="flex items-center gap-2">
              <input
                id="balance-low-stock"
                type="checkbox"
                checked={lowStock}
                onChange={(e) => setLowStock(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="balance-low-stock" className="text-sm text-gray-700">
                แสดงเฉพาะสินค้าใกล้หมด
              </label>
            </div>
            <div>
              <label htmlFor="balance-threshold" className="block text-xs font-medium text-gray-600 mb-1.5">
                เกณฑ์สินค้าใกล้หมด
              </label>
              <input
                id="balance-threshold"
                type="number"
                min={0}
                max={999999}
                value={threshold}
                disabled={!lowStock}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>
      </div>

      <StockBalanceTable balances={balances} loading={loading} threshold={threshold} />

      {/* Pagination */}
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
    </div>
  );
}
