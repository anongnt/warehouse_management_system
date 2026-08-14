import { useState } from 'react';
import ReportFilters from '../components/ReportFilters';
import ExportButtons from '../components/ExportButtons';
import {
  ReportType,
  downloadInventoryReport,
  downloadCategoryReport,
  downloadLowStockReport,
  downloadStockValueReport,
} from '../services/reportApi';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'inventory', label: 'รายงานสินค้าคงคลัง (Inventory)' },
  { value: 'category', label: 'รายงานตามหมวดหมู่ (Category)' },
  { value: 'low-stock', label: 'รายงานสินค้าใกล้หมด (Low Stock)' },
  { value: 'stock-value', label: 'รายงานมูลค่าสต็อก (Stock Value)' },
];

export default function ReportPage() {
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [threshold, setThreshold] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    if (!reportType) return;

    setLoading(true);
    setError('');

    try {
      switch (reportType) {
        case 'inventory':
          await downloadInventoryReport({
            format,
            category: category || undefined,
            status: (status as 'active' | 'inactive') || undefined,
          });
          break;
        case 'category':
          await downloadCategoryReport({
            format,
            category: category || undefined,
          });
          break;
        case 'low-stock':
          await downloadLowStockReport({
            format,
            threshold,
          });
          break;
        case 'stock-value':
          await downloadStockValueReport({
            format,
            category: category || undefined,
            status: (status as 'active' | 'inactive') || undefined,
          });
          break;
      }
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('การสร้างรายงานใช้เวลาเกินกำหนด กรุณาลองใหม่อีกครั้ง');
      } else if (err.response?.status === 504) {
        setError('การสร้างรายงานใช้เวลาเกินกำหนด กรุณาลองใหม่อีกครั้ง');
      } else if (err.response?.status === 400) {
        setError('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบตัวเลือกอีกครั้ง');
      } else {
        setError('เกิดข้อผิดพลาดในการสร้างรายงาน กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReportTypeChange = (value: string) => {
    setReportType(value as ReportType | '');
    setCategory('');
    setStatus('');
    setThreshold(10);
    setError('');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">รายงาน</h1>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* Report Type Selection */}
        <div>
          <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">
            ประเภทรายงาน
          </label>
          <select
            id="report-type"
            value={reportType}
            onChange={(e) => handleReportTypeChange(e.target.value)}
            className="block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
          >
            <option value="">-- เลือกประเภทรายงาน --</option>
            {REPORT_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filters */}
        {reportType && (
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-2">ตัวกรอง</h2>
            <ReportFilters
              reportType={reportType}
              category={category}
              status={status}
              threshold={threshold}
              onCategoryChange={setCategory}
              onStatusChange={setStatus}
              onThresholdChange={setThreshold}
            />
          </div>
        )}

        {/* Export Buttons */}
        <div className="pt-4 border-t">
          <ExportButtons
            disabled={!reportType}
            loading={loading}
            onExportPdf={() => handleExport('pdf')}
            onExportExcel={() => handleExport('xlsx')}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
