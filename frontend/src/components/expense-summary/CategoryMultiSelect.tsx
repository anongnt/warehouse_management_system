import { useState, useEffect, useRef } from 'react';
import { getCategoriesFlat } from '../../services/categoryApi';
import { CategoryFlat } from '../../types';

interface CategoryMultiSelectProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  onCategoryNamesChange?: (names: string[]) => void;
  disabled: boolean;
}

export default function CategoryMultiSelect({ selectedCategories, onChange, onCategoryNamesChange, disabled }: CategoryMultiSelectProps) {
  const [categories, setCategories] = useState<CategoryFlat[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ดึงรายการหมวดหมู่ที่ active
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const result = await getCategoriesFlat({ status: 'active' });
        if (result.success && result.data) {
          setCategories(result.data as CategoryFlat[]);
        }
      } catch {
        // silent fail
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // หา children ทั้งหมดของ category (recursive)
  const getDescendantIds = (parentId: string): string[] => {
    const children = categories.filter(c => c.parentId === parentId);
    let ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids = ids.concat(getDescendantIds(child.id));
    }
    return ids;
  };

  const toggleCategory = (id: string) => {
    const descendantIds = getDescendantIds(id);
    const allRelatedIds = [id, ...descendantIds];

    let newSelection: string[];
    if (selectedCategories.includes(id)) {
      // ยกเลิกเลือก: ยกเลิก parent + children ทั้งหมด
      newSelection = selectedCategories.filter(c => !allRelatedIds.includes(c));
    } else {
      // เลือก: เลือก parent + children ทั้งหมด
      newSelection = Array.from(new Set([...selectedCategories, ...allRelatedIds]));
    }
    onChange(newSelection);
    if (onCategoryNamesChange) {
      const names = categories.filter(c => newSelection.includes(c.id)).map(c => c.name);
      onCategoryNamesChange(names);
    }
  };

  const clearAll = () => {
    onChange([]);
    if (onCategoryNamesChange) {
      onCategoryNamesChange([]);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4" ref={dropdownRef}>
      <h3 className="text-sm font-medium text-gray-700 mb-3">หมวดหมู่</h3>

      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full border rounded px-3 py-2 text-sm text-left flex items-center justify-between disabled:opacity-50 disabled:bg-gray-50"
        >
          <span className="text-gray-600">
            {selectedCategories.length === 0
              ? 'ทุกหมวดหมู่'
              : `เลือกแล้ว`}
          </span>
          <div className="flex items-center gap-2">
            {selectedCategories.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                {selectedCategories.length}
              </span>
            )}
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {selectedCategories.length > 0 && (
              <button
                onClick={clearAll}
                className="w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 text-left border-b"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}

            {loadingCategories ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">กำลังโหลด...</div>
            ) : categories.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">ไม่พบหมวดหมู่</div>
            ) : (
              categories.map(cat => (
                <label
                  key={cat.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  style={{ paddingLeft: `${12 + (cat.level || 0) * 16}px` }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{cat.name}</span>
                </label>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
