import { useState, useEffect } from 'react';

interface DateRangeFilterProps {
  startDate: string;       // YYYY-MM-DD
  endDate: string;         // YYYY-MM-DD
  onFilter: (start: string, end: string) => void;
  disabled: boolean;
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function DateRangeFilter({ startDate, endDate, onFilter, disabled }: DateRangeFilterProps) {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
  }, [startDate, endDate]);

  const validate = (start: string, end: string): string | null => {
    if (!start || !end) return 'กรุณาระบุวันที่เริ่มต้นและวันที่สิ้นสุด';

    const startDt = new Date(start);
    const endDt = new Date(end);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (startDt > endDt) return 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด';
    if (endDt > today) return 'ไม่อนุญาตวันที่ในอนาคต';

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    if (startDt < fiveYearsAgo) return 'ย้อนหลังได้สูงสุด 5 ปี';

    const diffDays = (endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 365) return 'ช่วงวันที่ต้องไม่เกิน 365 วัน';

    return null;
  };

  const handleApply = () => {
    const err = validate(localStart, localEnd);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg(null);
    onFilter(localStart, localEnd);
  };

  const applyPreset = (start: Date, end: Date) => {
    const s = formatIsoDate(start);
    const e = formatIsoDate(end);
    setLocalStart(s);
    setLocalEnd(e);
    setErrorMsg(null);
    onFilter(s, e);
  };

  const handleToday = () => {
    const today = new Date();
    applyPreset(today, today);
  };

  const handleThisWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    applyPreset(monday, now);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    applyPreset(firstDay, now);
  };

  const handleLast3Months = () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    applyPreset(threeMonthsAgo, now);
  };

  const handleThisYear = () => {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    applyPreset(firstDayOfYear, now);
  };

  return (
    <div className="bg-white rounded-lg border p-4 h-full">
      <h3 className="text-sm font-medium text-gray-700 mb-3">ช่วงวันที่</h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {[
          { label: 'วันนี้', handler: handleToday },
          { label: 'สัปดาห์นี้', handler: handleThisWeek },
          { label: 'เดือนนี้', handler: handleThisMonth },
          { label: '3 เดือน', handler: handleLast3Months },
          { label: 'ปีนี้', handler: handleThisYear },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={preset.handler}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg disabled:opacity-50 transition-colors duration-150"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">เริ่มต้น</label>
            <input
              type="date"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              disabled={disabled}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">สิ้นสุด</label>
            <input
              type="date"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
              disabled={disabled}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 transition-all"
            />
          </div>
        </div>
        <button
          onClick={handleApply}
          disabled={disabled}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          กรอง
        </button>
      </div>

      {errorMsg && (
        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
