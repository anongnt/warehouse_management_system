import { useState, useEffect } from 'react';
import { Category, CategoryFlat, CreateCategoryPayload, UpdateCategoryPayload } from '../types';
import { createCategory, updateCategory, updateCategoryStatus, getCategoriesFlat } from '../services/categoryApi';
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
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
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
        setStatus(category.status);
      } else {
        setName('');
        setCode('');
        setDescription('');
        setParentId('');
        setStatus('active');
      }
      setError('');
    }
  }, [isOpen, category]);

  const loadParentOptions = async () => {
    try {
      const res = await getCategoriesFlat({ status: 'active' });
      let options = (res.data || []) as CategoryFlat[];
      if (category) {
        options = options.filter(c => c.id !== category.id);
      }
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

        // Update basic info if changed
        if (Object.keys(payload).length > 0) {
          await updateCategory(category!.id, payload);
        }

        // Update status separately if changed
        if (status !== category!.status) {
          await updateCategoryStatus(category!.id, status);
        }
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
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEditMode ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                {isEditMode ? (
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isEditMode ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isEditMode ? 'แก้ไขข้อมูลหมวดหมู่' : 'กรอกข้อมูลเพื่อสร้างหมวดหมู่ใหม่'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                ชื่อหมวดหมู่ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-300"
                placeholder="เช่น อิเล็กทรอนิกส์"
              />
            </div>

            {/* Code */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm text-sm font-mono uppercase transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-300"
                placeholder="เช่น ELEC"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">2-10 ตัวพิมพ์ใหญ่ A-Z (ใช้สำหรับ SKU)</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">คำอธิบาย</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-300 resize-none"
                placeholder="คำอธิบายหมวดหมู่ (ไม่บังคับ)"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[11px] ${description.length > 400 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {description.length}/500
                </span>
              </div>
            </div>

            {/* Parent */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">หมวดหมู่หลัก (Parent)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent hover:border-gray-300 appearance-none bg-white"
              >
                <option value="">— ไม่มี (ระดับบนสุด) —</option>
                {parentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {'─'.repeat(opt.level - 1)} {opt.name} ({opt.code})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1.5">รองรับสูงสุด 3 ระดับ</p>
            </div>

            {/* Status (edit mode only) */}
            {isEditMode && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">สถานะ</label>
                <div className="flex gap-3">
                  <label
                    className={`flex-1 flex items-center gap-2 px-4 py-3 border rounded-xl cursor-pointer transition-all duration-150 ${
                      status === 'active'
                        ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value="active"
                      checked={status === 'active'}
                      onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                      className="sr-only"
                    />
                    <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="text-sm font-medium text-gray-700">ใช้งาน</span>
                  </label>
                  <label
                    className={`flex-1 flex items-center gap-2 px-4 py-3 border rounded-xl cursor-pointer transition-all duration-150 ${
                      status === 'inactive'
                        ? 'border-gray-400 bg-gray-50 ring-2 ring-gray-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value="inactive"
                      checked={status === 'inactive'}
                      onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                      className="sr-only"
                    />
                    <span className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span className="text-sm font-medium text-gray-700">ไม่ใช้งาน</span>
                  </label>
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditMode ? 'บันทึกการแก้ไข' : 'สร้างหมวดหมู่'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
