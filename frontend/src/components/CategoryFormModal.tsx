import { useState, useEffect } from 'react';
import { Category, CategoryFlat, CreateCategoryPayload, UpdateCategoryPayload } from '../types';
import { createCategory, updateCategory, getCategoriesFlat } from '../services/categoryApi';
import { AxiosError } from 'axios';

interface Props {
  category: Category | null; // null = create mode
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CategoryFormModal({ category, isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [parentOptions, setParentOptions] = useState<CategoryFlat[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = category !== null;

  useEffect(() => {
    if (isOpen) {
      loadParentOptions();
      if (category) {
        setName(category.name);
        setCode(category.code);
        setDescription(category.description || '');
        setParentId(category.parentId || '');
      } else {
        setName('');
        setCode('');
        setDescription('');
        setParentId('');
      }
      setError('');
    }
  }, [isOpen, category]);

  const loadParentOptions = async () => {
    try {
      const res = await getCategoriesFlat({ status: 'active' });
      let options = (res.data || []) as CategoryFlat[];
      // Filter out self and descendants (for edit mode)
      if (category) {
        options = options.filter(c => c.id !== category.id);
      }
      // Only allow up to level 2 as parent (so child will be max level 3)
      options = options.filter(c => c.level <= 2);
      setParentOptions(options);
    } catch {
      setParentOptions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (isEditMode) {
        const payload: UpdateCategoryPayload = {};
        if (name !== category!.name) payload.name = name;
        if (code !== category!.code) payload.code = code;
        if (description !== (category!.description || '')) payload.description = description || null;
        if (parentId !== (category!.parentId || '')) payload.parentId = parentId || null;

        await updateCategory(category!.id, payload);
      } else {
        const payload: CreateCategoryPayload = {
          name,
          code,
          description: description || undefined,
          parentId: parentId || undefined,
        };
        await createCategory(payload);
      }
      onSuccess();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isEditMode ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}
          </h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อหมวดหมู่ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น อิเล็กทรอนิกส์"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รหัส (Code) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                minLength={2}
                maxLength={10}
                pattern="[A-Z]+"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                placeholder="เช่น ELEC"
              />
              <p className="text-xs text-gray-500 mt-1">2-10 ตัวพิมพ์ใหญ่ A-Z (ใช้สำหรับ SKU)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                คำอธิบาย
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="คำอธิบายหมวดหมู่ (ไม่บังคับ)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หมวดหมู่หลัก (Parent)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— ไม่มี (ระดับบนสุด) —</option>
                {parentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {'─'.repeat(opt.level - 1)} {opt.name} ({opt.code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">สูงสุด 3 ระดับ</p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : isEditMode ? 'บันทึก' : 'สร้าง'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
