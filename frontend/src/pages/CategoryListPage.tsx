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
    try {
      await deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      setSuccessMessage('ลบหมวดหมู่สำเร็จ');
      fetchCategories();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'ไม่สามารถลบหมวดหมู่ได้');
      setDeletingCategory(null);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      active: 'ใช้งาน',
      inactive: 'ไม่ใช้งาน',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Count total categories recursively
  const countAll = (cats: CategoryTree[]): number => {
    return cats.reduce((sum, c) => sum + 1 + countAll(c.children || []), 0);
  };

  // Render tree rows recursively
  const renderTreeRows = (cats: CategoryTree[], level: number = 0): JSX.Element[] => {
    const rows: JSX.Element[] = [];
    for (const cat of cats) {
      rows.push(
        <tr key={cat.id} className="hover:bg-gray-50">
          <td className="px-6 py-3 whitespace-nowrap">
            <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
              {level > 0 && (
                <span className="text-gray-300 mr-2">{'└'}</span>
              )}
              <span className="text-sm text-gray-900 font-medium">{cat.name}</span>
            </div>
          </td>
          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 font-mono">{cat.code}</td>
          <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">{cat.description || '—'}</td>
          <td className="px-6 py-3 whitespace-nowrap">
            <button
              onClick={() => handleToggleStatus(cat)}
              className="focus:outline-none"
              title={cat.status === 'active' ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
            >
              {statusBadge(cat.status)}
            </button>
          </td>
          <td className="px-6 py-3 whitespace-nowrap text-right text-sm space-x-2">
            <button
              onClick={() => setEditingCategory(cat)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              แก้ไข
            </button>
            <button
              onClick={() => setDeletingCategory(cat)}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              ลบ
            </button>
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">จัดการหมวดหมู่</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">ทั้งหมด {countAll(categories)} รายการ</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            + เพิ่มหมวดหมู่
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4" role="status">
          {successMessage}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="ค้นหาด้วยชื่อหรือรหัส..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | 'active' | 'inactive')}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">ทุกสถานะ</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ไม่ใช้งาน</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          {error}
          <button onClick={() => setError('')} className="float-right text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อหมวดหมู่</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัส</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">คำอธิบาย</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">กำลังโหลด...</td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">ไม่พบหมวดหมู่</td>
              </tr>
            ) : (
              renderTreeRows(categories)
            )}
          </tbody>
        </table>
      </div>

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
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-30" onClick={() => setDeletingCategory(null)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ยืนยันการลบ</h3>
              <p className="text-sm text-gray-600 mb-4">
                คุณต้องการลบหมวดหมู่ <strong>{deletingCategory.name}</strong> ({deletingCategory.code}) ใช่หรือไม่?
              </p>
              <p className="text-xs text-gray-500 mb-4">
                หมวดหมู่ที่มีหมวดหมู่ย่อยหรือสินค้าผูกอยู่จะไม่สามารถลบได้
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeletingCategory(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
