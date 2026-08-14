import { useEffect, useState } from 'react';
import { getCategoriesFlat } from '../services/categoryApi';
import { CategoryFlat } from '../types';
import { ReportType } from '../services/reportApi';

interface ReportFiltersProps {
  reportType: ReportType | '';
  category: string;
  status: string;
  threshold: number;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onThresholdChange: (value: number) => void;
}

export default function ReportFilters({
  reportType,
  category,
  status,
  threshold,
  onCategoryChange,
  onStatusChange,
  onThresholdChange,
}: ReportFiltersProps) {
  const [categories, setCategories] = useState<CategoryFlat[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategoriesFlat({ status: 'active' });
        if (response.success && response.data) {
          setCategories(response.data as CategoryFlat[]);
        }
      } catch {
        // Silently fail - categories dropdown will be empty
      }
    };
    fetchCategories();
  }, []);

  if (!reportType) return null;

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* Category filter - for inventory, category, stock-value */}
      {(reportType === 'inventory' || reportType === 'category' || reportType === 'stock-value') && (
        <div>
          <label htmlFor="filter-category" className="block text-sm font-medium text-gray-700 mb-1">
            หมวดหมู่
          </label>
          <select
            id="filter-category"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
          >
            <option value="">ทั้งหมด</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status filter - for inventory, stock-value */}
      {(reportType === 'inventory' || reportType === 'stock-value') && (
        <div>
          <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">
            สถานะ
          </label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="block w-36 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
          >
            <option value="">ทั้งหมด</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      {/* Threshold - for low-stock */}
      {reportType === 'low-stock' && (
        <div>
          <label htmlFor="filter-threshold" className="block text-sm font-medium text-gray-700 mb-1">
            Threshold (จำนวนขั้นต่ำ)
          </label>
          <input
            id="filter-threshold"
            type="number"
            min={1}
            max={999999}
            value={threshold}
            onChange={(e) => onThresholdChange(parseInt(e.target.value) || 10)}
            className="block w-36 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 border"
          />
        </div>
      )}
    </div>
  );
}
