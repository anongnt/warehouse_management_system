import { useState, useMemo } from 'react';
import { useExpenseSummary } from '../hooks/useExpenseSummary';
import DateRangeFilter from '../components/expense-summary/DateRangeFilter';
import CategoryMultiSelect from '../components/expense-summary/CategoryMultiSelect';
import ExpenseTable from '../components/expense-summary/ExpenseTable';
import ExpensePieChart from '../components/expense-summary/ExpensePieChart';
import ExpenseBarChart from '../components/expense-summary/ExpenseBarChart';
import {
  downloadInventoryReport,
  downloadCategoryReport,
  downloadLowStockReport,
  downloadStockValueReport,
} from '../services/reportApi';
import { ExpenseItem } from '../types/expense-summary.types';

function formatCurrency(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ViewTab = 'expense-summary' | 'inventory' | 'category' | 'low-stock' | 'stock-value';

const VIEW_TABS: { value: ViewTab; label: string; icon: JSX.Element }[] = [
  {
    value: 'expense-summary',
    label: 'สรุปค่าใช้จ่าย',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    value: 'inventory',
    label: 'สินค้าคงคลัง',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    value: 'category',
    label: 'ตามหมวดหมู่',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    value: 'low-stock',
    label: 'สินค้าใกล้หมด',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    value: 'stock-value',
    label: 'มูลค่าสต็อก',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function ExpenseSummaryPage() {
  const {
    data,
    loading,
    error,
    exporting,
    filters,
    setDateRange,
    setCategories,
    fetchData,
    exportPdf,
    exportExcel,
  } = useExpenseSummary();

  const [activeTab, setActiveTab] = useState<ViewTab>('expense-summary');
  const [threshold, setThreshold] = useState(10);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [categoryNames, setCategoryNames] = useState<string[]>([]);

  const filteredItems = useMemo((): ExpenseItem[] => {
    if (!data) return [];
    switch (activeTab) {
      case 'expense-summary':
      case 'inventory':
        return data.items;
      case 'category':
        return [...data.items].sort((a, b) => a.category.localeCompare(b.category));
      case 'low-stock':
        return data.items.filter(item => item.quantity <= threshold);
      case 'stock-value':
        return data.items;
      default:
        return data.items;
    }
  }, [data, activeTab, threshold]);

  const tabSummary = useMemo(() => {
    const totalAmount = filteredItems.reduce((sum, item) => sum + item.totalValue, 0);
    const totalItems = filteredItems.length;
    const uniqueCategories = new Set(filteredItems.map(item => item.categoryId || item.category));
    return { totalAmount, totalItems, totalCategories: uniqueCategories.size };
  }, [filteredItems]);

  const handleExportPdf = async () => {
    if (activeTab === 'expense-summary') {
      await exportPdf();
      return;
    }
    await handleOtherExport('pdf');
  };

  const handleExportExcel = async () => {
    if (activeTab === 'expense-summary') {
      await exportExcel();
      return;
    }
    await handleOtherExport('xlsx');
  };

  const handleOtherExport = async (format: 'pdf' | 'xlsx') => {
    setReportLoading(true);
    setReportError('');

    const selectedCategory = categoryNames.length > 0 ? categoryNames[0] : undefined;

    try {
      switch (activeTab) {
        case 'inventory':
          await downloadInventoryReport({ format, category: selectedCategory });
          break;
        case 'category':
          await downloadCategoryReport({ format, category: selectedCategory });
          break;
        case 'low-stock':
          await downloadLowStockReport({ format, threshold });
          break;
        case 'stock-value':
          await downloadStockValueReport({ format, category: selectedCategory });
          break;
      }
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setReportError('การสร้างรายงานใช้เวลาเกินกำหนด กรุณาลองใหม่');
      } else if (err.response?.status === 504) {
        setReportError('การสร้างรายงานใช้เวลาเกินกำหนด กรุณาลองใหม่');
      } else {
        setReportError('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } finally {
      setReportLoading(false);
    }
  };

  const isExporting = exporting || reportLoading;
  const hasData = filteredItems.length > 0;

  const getTabDescription = () => {
    switch (activeTab) {
      case 'expense-summary': return 'แสดงสรุปค่าใช้จ่ายตามช่วงวันที่และหมวดหมู่ที่เลือก';
      case 'inventory': return 'แสดงรายการสินค้าคงคลังทั้งหมดในช่วงเวลาที่เลือก';
      case 'category': return 'แสดงรายการสินค้าจัดกลุ่มตามหมวดหมู่';
      case 'low-stock': return `แสดงสินค้าที่มีจำนวนไม่เกิน ${threshold} ชิ้น`;
      case 'stock-value': return 'แสดงสินค้าเรียงตามมูลค่าสต็อกจากมากไปน้อย';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 rounded-2xl p-8 shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              รายงาน
            </h1>
            <p className="mt-1 text-emerald-100 text-sm">
              สรุปค่าใช้จ่ายสินค้าคงคลังและส่งออกรายงาน
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExporting || !hasData}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 backdrop-blur-sm text-white border border-white/25 rounded-xl text-sm font-medium hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isExporting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
              PDF
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isExporting || !hasData}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-700 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isExporting ? (
                <span className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        <div className="flex flex-wrap gap-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); setReportError(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.value
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className={activeTab === tab.value ? 'text-white' : 'text-gray-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DateRangeFilter
          startDate={filters.startDate}
          endDate={filters.endDate}
          onFilter={setDateRange}
          disabled={loading}
        />
        <CategoryMultiSelect
          selectedCategories={filters.categories || []}
          onChange={setCategories}
          onCategoryNamesChange={setCategoryNames}
          disabled={loading}
        />
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">มุมมองปัจจุบัน</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{getTabDescription()}</p>

          {activeTab === 'low-stock' && (
            <div className="mt-4">
              <label htmlFor="filter-threshold" className="block text-xs font-medium text-gray-600 mb-1.5">
                Threshold (จำนวนสูงสุด)
              </label>
              <input
                id="filter-threshold"
                type="number"
                min={1}
                max={999999}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 10)}
                className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-2.5 border"
              />
            </div>
          )}

          {reportError && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-600">{reportError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            ลองใหม่
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">มูลค่ารวม</p>
              <p className="text-xl font-extrabold text-gray-900 mt-0.5">฿{formatCurrency(tabSummary.totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">จำนวนรายการ</p>
              <p className="text-xl font-extrabold text-gray-900 mt-0.5">{tabSummary.totalItems.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">จำนวนหมวดหมู่</p>
              <p className="text-xl font-extrabold text-gray-900 mt-0.5">{tabSummary.totalCategories}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {activeTab === 'expense-summary' && (loading || (data && data.categoryBreakdown.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpensePieChart
            categoryBreakdown={data?.categoryBreakdown || []}
            loading={loading}
          />
          <ExpenseBarChart
            categoryBreakdown={data?.categoryBreakdown || []}
            loading={loading}
          />
        </div>
      )}

      {/* Table */}
      <ExpenseTable
        items={filteredItems}
        loading={loading}
        emptyMessage={
          activeTab === 'low-stock'
            ? `ไม่มีสินค้าที่มีจำนวน ≤ ${threshold} ในช่วงเวลาที่เลือก`
            : 'ไม่มีข้อมูลสำหรับช่วงเวลาและตัวกรองที่เลือก'
        }
      />
    </div>
  );
}
