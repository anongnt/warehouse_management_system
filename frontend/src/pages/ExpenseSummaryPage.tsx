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

const VIEW_TABS: { value: ViewTab; label: string; icon: string }[] = [
  { value: 'expense-summary', label: 'สรุปค่าใช้จ่าย', icon: '📊' },
  { value: 'inventory', label: 'สินค้าคงคลัง', icon: '📦' },
  { value: 'category', label: 'ตามหมวดหมู่', icon: '🏷️' },
  { value: 'low-stock', label: 'สินค้าใกล้หมด', icon: '⚠️' },
  { value: 'stock-value', label: 'มูลค่าสต็อก', icon: '💰' },
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

  // กรองข้อมูลตาม tab ที่เลือก
  const filteredItems = useMemo((): ExpenseItem[] => {
    if (!data) return [];
    switch (activeTab) {
      case 'expense-summary':
      case 'inventory':
        return data.items;
      case 'category':
        // เรียงตามหมวดหมู่
        return [...data.items].sort((a, b) => a.category.localeCompare(b.category));
      case 'low-stock':
        // แสดงเฉพาะสินค้าที่มี quantity ≤ threshold
        return data.items.filter(item => item.quantity <= threshold);
      case 'stock-value':
        // เรียงตามมูลค่ารวม (มากไปน้อย) - data มาเรียงแล้ว
        return data.items;
      default:
        return data.items;
    }
  }, [data, activeTab, threshold]);

  // Summary สำหรับ tab ปัจจุบัน
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

  // คำอธิบาย tab
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายงาน</h1>
          <p className="text-sm text-gray-500 mt-1">สรุปค่าใช้จ่ายสินค้าคงคลังและส่งออกรายงาน</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPdf}
            disabled={isExporting || !hasData}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg shadow-sm hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isExporting ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            ส่งออก PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting || !hasData}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-lg shadow-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isExporting ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            ส่งออก Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5">
        <div className="flex flex-wrap gap-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); setReportError(''); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
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
        <div className="bg-white rounded-lg border p-4 h-full">
          <h3 className="text-sm font-medium text-gray-700 mb-2">มุมมองปัจจุบัน</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{getTabDescription()}</p>

          {activeTab === 'low-stock' && (
            <div className="mt-3">
              <label htmlFor="filter-threshold" className="block text-xs text-gray-500 mb-1">
                Threshold (จำนวนสูงสุด)
              </label>
              <input
                id="filter-threshold"
                type="number"
                min={1}
                max={999999}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 10)}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
              />
            </div>
          )}

          {reportError && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs text-red-600">{reportError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">มูลค่ารวม</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">฿{formatCurrency(tabSummary.totalAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">จำนวนรายการ</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{tabSummary.totalItems.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">จำนวนหมวดหมู่</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{tabSummary.totalCategories}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts - แสดงเฉพาะ tab สรุปค่าใช้จ่าย */}
      {activeTab === 'expense-summary' && (loading || (data && data.categoryBreakdown.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
