import { useState, FormEvent, useEffect, useRef } from 'react';
import { Product, CreateProductPayload, UpdateProductPayload, CategoryFlat } from '../types';
import { createProduct, updateProduct, generateSkuPreview } from '../services/productApi';
import { getCategoriesFlat } from '../services/categoryApi';
import { AxiosError } from 'axios';

interface Props {
  product?: Product | null; // null = create mode, Product = edit mode
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductFormModal({ product, isOpen, onClose, onSuccess }: Props) {
  const isEditMode = !!product;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<CategoryFlat[]>([]);
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [skuPreview, setSkuPreview] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load categories from API
  useEffect(() => {
    if (isOpen) {
      getCategoriesFlat({ status: 'active' })
        .then(res => setCategoryOptions((res.data || []) as CategoryFlat[]))
        .catch(() => setCategoryOptions([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setAutoGenerate(false);
      setCategory(product.category);
      setCategoryId((product as any).categoryId || '');
      setQuantity(String(product.quantity));
      setUnitPrice(String(product.unitPrice));
      setDescription(product.description || '');
      setStatus(product.status);
      setImagePreview(product.imageUrl || null);
    } else {
      setName('');
      setSku('');
      setAutoGenerate(true);
      setCategory('');
      setCategoryId('');
      setQuantity('');
      setUnitPrice('');
      setDescription('');
      setStatus('active');
      setImagePreview(null);
      setSkuPreview('');
    }
    setImageFile(null);
    setError('');
    setFieldErrors({});
  }, [product, isOpen]);

  // Generate SKU preview when category changes and auto-generate is on
  useEffect(() => {
    if (!isOpen || isEditMode || !autoGenerate || !categoryId) {
      setSkuPreview('');
      return;
    }

    let cancelled = false;
    setIsGenerating(true);

    generateSkuPreview(category, categoryId)
      .then((res) => {
        if (!cancelled && res.data) {
          setSkuPreview(res.data.sku);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSkuPreview('');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsGenerating(false);
        }
      });

    return () => { cancelled = true; };
  }, [categoryId, category, autoGenerate, isOpen, isEditMode]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setFieldErrors(prev => ({ ...prev, image: 'อนุญาตเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF, WebP) เท่านั้น' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setFieldErrors(prev => ({ ...prev, image: 'ขนาดไฟล์ต้องไม่เกิน 5MB' }));
        return;
      }
      setFieldErrors(prev => {
        const { image, ...rest } = prev;
        return rest;
      });
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length > 200) {
      errors.name = 'ชื่อสินค้าต้องมีความยาว 1-200 ตัวอักษร';
    }
    if (!autoGenerate || isEditMode) {
      if (!sku.trim() || sku.trim().length > 50) {
        errors.sku = 'SKU ต้องมีความยาว 1-50 ตัวอักษร';
      } else if (!/^[a-zA-Z0-9_-]+$/.test(sku.trim())) {
        errors.sku = 'SKU ต้องประกอบด้วยตัวอักษร ตัวเลข - หรือ _ เท่านั้น';
      }
    }
    if (!category.trim()) {
      errors.category = 'กรุณาเลือกหมวดหมู่';
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0 || qty > 999999 || !Number.isInteger(Number(quantity))) {
      errors.quantity = 'จำนวนต้องเป็นจำนวนเต็ม 0-999,999';
    }

    const price = parseFloat(unitPrice);
    if (isNaN(price) || price < 0 || price > 999999999.99) {
      errors.unitPrice = 'ราคาต่อหน่วยต้องอยู่ระหว่าง 0-999,999,999.99';
    } else {
      const decimalPart = unitPrice.split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        errors.unitPrice = 'ราคาต่อหน่วยต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง';
      }
    }

    if (description.length > 1000) {
      errors.description = 'คำอธิบายต้องไม่เกิน 1,000 ตัวอักษร';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      if (isEditMode && product) {
        const data: UpdateProductPayload = {
          name: name.trim(),
          sku: sku.trim(),
          category: category.trim(),
          categoryId: categoryId || undefined,
          quantity: parseInt(quantity),
          unitPrice: parseFloat(unitPrice),
          description: description || undefined,
          status,
        };
        if (imageFile) {
          data.image = imageFile;
        }
        await updateProduct(product.id, data);
      } else {
        const data: CreateProductPayload = {
          name: name.trim(),
          sku: autoGenerate ? undefined : sku.trim(),
          category: category.trim(),
          categoryId: categoryId || undefined,
          quantity: parseInt(quantity),
          unitPrice: parseFloat(unitPrice),
          description: description || undefined,
        };
        if (imageFile) {
          data.image = imageFile;
        }
        await createProduct(data);
      }
      onSuccess();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEditMode ? 'bg-amber-100' : 'bg-blue-100'}`}>
                {isEditMode ? (
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isEditMode ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isEditMode ? 'แก้ไขข้อมูลสินค้าที่มีอยู่' : 'กรอกข้อมูลเพื่อสร้างสินค้าใหม่'}
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
          <form onSubmit={handleSubmit} className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl text-sm" role="alert">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Product Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                ชื่อสินค้า <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl shadow-sm text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                placeholder="กรอกชื่อสินค้า"
              />
              {fieldErrors.name && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{fieldErrors.name}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                หมวดหมู่ <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setCategoryId(selectedId);
                  const selected = categoryOptions.find(c => c.id === selectedId);
                  setCategory(selected ? selected.name : '');
                }}
                className={`w-full px-4 py-2.5 border rounded-xl shadow-sm text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
                  fieldErrors.category ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <option value="">-- เลือกหมวดหมู่ --</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {'─'.repeat(cat.level - 1)} {cat.name} ({cat.code})
                  </option>
                ))}
              </select>
              {fieldErrors.category && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{fieldErrors.category}</p>}
            </div>

            {/* SKU */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  SKU {(!autoGenerate || isEditMode) && <span className="text-red-500">*</span>}
                </label>
                {!isEditMode && (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenerate}
                      onChange={(e) => setAutoGenerate(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    <span className="ml-2 text-xs text-gray-600">สร้างอัตโนมัติ</span>
                  </label>
                )}
              </div>
              {autoGenerate && !isEditMode ? (
                <div className="px-4 py-2.5 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-sm">
                  {isGenerating ? (
                    <span className="text-gray-400 flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                      กำลังสร้าง...
                    </span>
                  ) : skuPreview ? (
                    <span className="font-mono text-blue-700 font-semibold">{skuPreview}</span>
                  ) : (
                    <span className="text-gray-400">เลือกหมวดหมู่เพื่อสร้าง SKU อัตโนมัติ</span>
                  )}
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl shadow-sm text-sm font-mono transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.sku ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="เช่น ELEC-00001"
                  />
                  {fieldErrors.sku && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{fieldErrors.sku}</p>}
                </>
              )}
            </div>

            {/* Quantity & Unit Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  จำนวน <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl shadow-sm text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.quantity ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="0"
                    min="0"
                    max="999999"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">ชิ้น</span>
                </div>
                {fieldErrors.quantity && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{fieldErrors.quantity}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  ราคาต่อหน่วย <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">฿</span>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className={`w-full pl-7 pr-4 py-2.5 border rounded-xl shadow-sm text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.unitPrice ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {fieldErrors.unitPrice && <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{fieldErrors.unitPrice}</p>}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">รูปภาพสินค้า</label>
              <div className="mt-1">
                {imagePreview ? (
                  <div className="relative inline-block group">
                    <img
                      src={imagePreview}
                      alt="ตัวอย่างรูปสินค้า"
                      className="w-36 h-36 object-cover rounded-xl border-2 border-gray-100 shadow-sm"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform"
                        title="เปลี่ยนรูป"
                      >
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform"
                        title="ลบรูป"
                        aria-label="ลบรูปภาพ"
                      >
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-36 h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors mb-2">
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">เพิ่มรูปภาพ</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">รองรับ JPEG, PNG, GIF, WebP ขนาดไม่เกิน 5MB</p>
              {fieldErrors.image && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{fieldErrors.image}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">คำอธิบาย</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`w-full px-4 py-2.5 border rounded-xl shadow-sm text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  fieldErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                placeholder="คำอธิบายสินค้า (ไม่บังคับ)"
              />
              <div className="flex justify-between mt-1">
                {fieldErrors.description && <p className="text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{fieldErrors.description}</p>}
                <span className={`text-xs ml-auto ${description.length > 900 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {description.length}/1,000
                </span>
              </div>
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
              disabled={isLoading}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditMode ? 'บันทึกการแก้ไข' : 'สร้างสินค้า'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
