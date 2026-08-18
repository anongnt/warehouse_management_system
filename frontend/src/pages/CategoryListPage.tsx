import { useState, useEffect, useCallback, useRef } from 'react';
import { CategoryTree, Category } from '../types';
import { getCategories, updateCategoryStatus, deleteCategory } from '../services/categoryApi';
import CategoryFormModal from '../components/CategoryFormModal';
import { AxiosError } from 'axios';

export default function CategoryListPage() {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getCategories({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
      });
      setCategories(response.data as CategoryTree[] || []);
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setSuccessMessage('สร้างหมวดหมู่สำเร็จ');
    fetchCategories();
  };

  const handleUpdateSuccess = () => {
    setEditingCategory(null);
    setSuccessMessage('อัปเดตหมวดหมู่สำเร็จ');
    fetchCategories();
  };

  const handleToggleStatus = async (cat: Category) => {
    const newStatus = cat.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCategoryStatus(cat.id, newStatus);
      setSuccessMessage('อัปเดตสถานะสำเร็จ');
      fetchCategories();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      await deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      setSuccessMessage('ลบหมวดหมู่สำเร็จ');
      fetchCategories();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'ไม่สามารถลบหมวดหมู่ได้');
      setDeletingCategory(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Count total categories recursively
  const countAll = (cats: CategoryTree[]): number => {
    return cats.reduce((sum, c) => sum + 1 + countAll(c.children || []), 0);
  };

  // Get icon by category code/name
  const getCategoryIcon = (code: string, name: string) => {
    const key = code.toUpperCase();
    const nameLower = name.toLowerCase();

    // Electronics / อิเล็กทรอนิกส์
    if (key === 'ELEC' || nameLower.includes('อิเล็กทรอนิกส์') || nameLower.includes('electronic')) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    // Computer / คอมพิวเตอร์
    if (key === 'COMP' || nameLower.includes('คอมพิวเตอร์') || nameLower.includes('computer')) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    // Notebook / โน๊ตบุ๊ค
    if (key === 'NOTEBOOK' || nameLower.includes('โน๊ตบุ๊ค') || nameLower.includes('โน้ตบุ๊ก') || nameLower.includes('notebook') || nameLower.includes('laptop')) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    // Mobile / มือถือ
    if (key === 'MOBI' || key === 'MOBILE' || nameLower.includes('มือถือ') || nameLower.includes('โทรศัพท์') || nameLower.includes('phone')) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    // Office / เครื่องใช้สำนักงาน
    if (key === 'OFFC' || key === 'OFFICE' || nameLower.includes('สำนักงาน') || nameLower.includes('office')) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    }
    // Consumer / สินค้าอุปโภคบริโภค
    if (key === 'CONSUMER' || key === 'CONS' || nameLower.includes('อุปโภค') || nameLower.includes('บริโภค') || nameLower.includes('consumer')) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    }
    // Food / อาหาร
    if (key === 'FOOD' || nameLower.includes('อาหาร') || nameLower.includes('food') || nameLower.includes('เครื่องดื่ม')) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546M12 3v2m6.364 1.636l-1.414 1.414M21 12h-2M5 12H3m3.636-4.95L5.222 5.636M12 8a4 4 0 00-4 4h8a4 4 0 00-4-4z" />
        </svg>
      );
    }
    // Clothing / เสื้อผ้า
    if (key === 'CLOTH' || nameLower.includes('เสื้อผ้า') || nameLower.includes('แฟชั่น') || nameLower.includes('clothing')) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V3a2 2 0 00-2-2h-4a2 2 0 00-2 2v8m-2 0h12l2 10H4l2-10z" />
        </svg>
      );
    }
    // Tool / เครื่องมือ
    if (key === 'TOOL' || nameLower.includes('เครื่องมือ') || nameLower.includes('tool')) {
      return (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    }
    // Default - folder icon
    return (
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    );
  };

  // Get gradient color by category code
  const getCategoryGradient = (code: string, name: string) => {
    const key = code.toUpperCase();
    const nameLower = name.toLowerCase();

    if (key === 'ELEC' || nameLower.includes('อิเล็กทรอนิกส์')) return 'from-amber-400 to-orange-500';
    if (key === 'COMP' || nameLower.includes('คอมพิวเตอร์')) return 'from-blue-500 to-indigo-600';
    if (key === 'NOTEBOOK' || nameLower.includes('โน๊ตบุ๊ค') || nameLower.includes('โน้ตบุ๊ก')) return 'from-slate-500 to-gray-700';
    if (key === 'MOBI' || key === 'MOBILE' || nameLower.includes('มือถือ')) return 'from-green-400 to-emerald-600';
    if (key === 'OFFC' || key === 'OFFICE' || nameLower.includes('สำนักงาน')) return 'from-sky-400 to-blue-500';
    if (key === 'CONSUMER' || key === 'CONS' || nameLower.includes('อุปโภค') || nameLower.includes('บริโภค')) return 'from-pink-400 to-rose-500';
    if (key === 'FOOD' || nameLower.includes('อาหาร')) return 'from-orange-400 to-red-500';
    if (key === 'CLOTH' || nameLower.includes('เสื้อผ้า')) return 'from-fuchsia-400 to-purple-600';
    if (key === 'TOOL' || nameLower.includes('เครื่องมือ')) return 'from-gray-500 to-zinc-700';
    return 'from-indigo-400 to-violet-600';
  };

  // Render tree rows recursively
  const renderTreeRows = (cats: CategoryTree[], level: number = 0): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    for (const cat of cats) {
      rows.push(
        <tr key={cat.id} className="group hover:bg-blue-50/30 transition-colors duration-150">
          <td className="px-6 py-4">
            <div className="flex items-center" style={{ paddingLeft: `${level * 28}px` }}>
              {level > 0 && (
                <svg className="w-4 h-4 text-gray-300 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mr-3 bg-gradient-to-br ${getCategoryGradient(cat.code, cat.name)} shadow-sm`}>
                {getCategoryIcon(cat.code, cat.name)}
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">{cat.name}</span>
                {cat.children && cat.children.length > 0 && (
                  <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {cat.children.length} ย่อย
                  </span>
                )}
              </div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-mono font-medium text-gray-700">
              {cat.code}
            </span>
          </td>
          <td className="px-6 py-4">
            <span className="text-sm text-gray-500 line-clamp-1 max-w-xs">
              {cat.description || <span className="text-gray-300">—</span>}
            </span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <button
              onClick={() => handleToggleStatus(cat)}
              className="group/btn relative inline-flex items-center"
              title={cat.status === 'active' ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
            >
              {cat.status === 'active' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 group-hover/btn:bg-emerald-100 transition-colors">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  ใช้งาน
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 ring-1 ring-gray-200 group-hover/btn:bg-gray-100 transition-colors">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  ไม่ใช้งาน
                </span>
              )}
            </button>
          </td>
          <td className="px-6 py-4 text-right">
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => setEditingCategory(cat)}
                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-150"
                title="แก้ไข"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => setDeletingCategory(cat)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-150"
                title="ลบ"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      );
      if (cat.children && cat.children.length > 0) {
        rows.push(...renderTreeRows(cat.children, level + 1));
      }
    }
    return rows;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              จัดการหมวดหมู่
            </h1>
            <p className="mt-1 text-purple-100 text-sm">
              จัดการหมวดหมู่สินค้าทั้งหมด {countAll(categories)} รายการ
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            เพิ่มหมวดหมู่ใหม่
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-xl shadow-sm animate-fadeIn" role="status">
          <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-medium text-sm">{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-xl shadow-sm" role="alert">
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="font-medium text-sm flex-1">{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อหรือรหัส..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              statusFilter === ''
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ใช้งาน
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              statusFilter === 'inactive'
                ? 'bg-gray-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ไม่ใช้งาน
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">ไม่พบหมวดหมู่</h3>
          <p className="text-sm text-gray-500 mb-4">
            {search ? 'ลองเปลี่ยนคำค้นหาใหม่' : 'เริ่มต้นสร้างหมวดหมู่แรกของคุณ'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              เพิ่มหมวดหมู่ใหม่
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {!isLoading && categories.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ชื่อหมวดหมู่</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">รหัส</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">คำอธิบาย</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {renderTreeRows(categories)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CategoryFormModal
        category={null}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Modal */}
      {editingCategory && (
        <CategoryFormModal
          category={editingCategory}
          isOpen={true}
          onClose={() => setEditingCategory(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setDeletingCategory(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl transform transition-all">
              <div className="flex flex-col items-center pt-8 pb-2 px-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">ยืนยันการลบหมวดหมู่</h3>
                <p className="text-sm text-gray-600 text-center mb-1">คุณต้องการลบหมวดหมู่</p>
                <p className="text-sm font-semibold text-gray-900 text-center">
                  "{deletingCategory.name}" ({deletingCategory.code})
                </p>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg mt-3">
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-xs text-amber-700 font-medium">หมวดหมู่ที่มีย่อยหรือสินค้าจะลบไม่ได้</span>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-5 mt-2">
                <button
                  onClick={() => setDeletingCategory(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl text-sm font-semibold hover:from-red-700 hover:to-red-800 shadow-sm transition-all disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังลบ...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      ลบหมวดหมู่
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
