import { useState, FormEvent, useEffect, useRef } from 'react';
import { Product, CreateProductPayload, UpdateProductPayload } from '../types';
import { createProduct, updateProduct } from '../services/productApi';
import { AxiosError } from 'axios';

const PRODUCT_CATEGORIES = [
  { value: 'อิเล็กทรอนิกส์', label: 'อิเล็กทรอนิกส์' },
  { value: 'อุปกรณ์สำนักงาน', label: 'อุปกรณ์สำนักงาน' },
  { value: 'เครื่องมือช่าง', label: 'เครื่องมือช่าง' },
  { value: 'วัสดุบรรจุภัณฑ์', label: 'วัสดุบรรจุภัณฑ์' },
  { value: 'อะไหล่และชิ้นส่วน', label: 'อะไหล่และชิ้นส่วน' },
  { value: 'เครื่องใช้ไฟฟ้า', label: 'เครื่องใช้ไฟฟ้า' },
  { value: 'สินค้าอุปโภคบริโภค', label: 'สินค้าอุปโภคบริโภค' },
  { value: 'เคมีภัณฑ์', label: 'เคมีภัณฑ์' },
  { value: 'วัตถุดิบ', label: 'วัตถุดิบ' },
  { value: 'อื่นๆ', label: 'อื่นๆ' },
];

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
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setCategory(product.category);
      setQuantity(String(product.quantity));
      setUnitPrice(String(product.unitPrice));
      setDescription(product.description || '');
      setStatus(product.status);
      setImagePreview(product.imageUrl || null);
    } else {
      setName('');
      setSku('');
      setCategory('');
      setQuantity('');
      setUnitPrice('');
      setDescription('');
      setStatus('active');
      setImagePreview(null);
    }
    setImageFile(null);
    setError('');
    setFieldErrors({});
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setFieldErrors(prev => ({ ...prev, image: 'อนุญาตเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF, WebP) เท่านั้น' }));
        return;
      }
      // Validate file size (5MB)
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
    if (!sku.trim() || sku.trim().length > 50) {
      errors.sku = 'SKU ต้องมีความยาว 1-50 ตัวอักษร';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(sku.trim())) {
      errors.sku = 'SKU ต้องประกอบด้วยตัวอักษร ตัวเลข - หรือ _ เท่านั้น';
    }
    if (!category.trim() || category.trim().length > 100) {
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
          sku: sku.trim(),
          category: category.trim(),
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {isEditMode ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm" role="alert">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">ชื่อสินค้า *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="ชื่อสินค้า"
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">SKU *</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="เช่น PROD-001"
              />
              {fieldErrors.sku && <p className="mt-1 text-xs text-red-600">{fieldErrors.sku}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">หมวดหมู่ *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- เลือกหมวดหมู่ --</option>
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {fieldErrors.category && <p className="mt-1 text-xs text-red-600">{fieldErrors.category}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">จำนวน *</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
                max="999999"
              />
              {fieldErrors.quantity && <p className="mt-1 text-xs text-red-600">{fieldErrors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ราคาต่อหน่วย *</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {fieldErrors.unitPrice && <p className="mt-1 text-xs text-red-600">{fieldErrors.unitPrice}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">รูปภาพสินค้า</label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="ตัวอย่างรูปสินค้า"
                    className="w-32 h-32 object-cover rounded-md border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    aria-label="ลบรูปภาพ"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-xs text-gray-500 mt-1">เพิ่มรูปภาพ</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  เปลี่ยนรูปภาพ
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">รองรับไฟล์ JPEG, PNG, GIF, WebP ขนาดไม่เกิน 5MB</p>
            {fieldErrors.image && <p className="mt-1 text-xs text-red-600">{fieldErrors.image}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">คำอธิบาย</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="คำอธิบายสินค้า (ไม่บังคับ)"
            />
            {fieldErrors.description && <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>}
          </div>

          {isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700">สถานะ</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">ใช้งาน</option>
                <option value="inactive">ไม่ใช้งาน</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'กำลังบันทึก...' : (isEditMode ? 'บันทึก' : 'สร้างสินค้า')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
