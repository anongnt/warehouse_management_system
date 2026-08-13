import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { getProducts, updateProductStatus } from '../services/productApi';
import ProductFormModal from '../components/ProductFormModal';
import ProductDeleteConfirmDialog from '../components/ProductDeleteConfirmDialog';
import { AxiosError } from 'axios';

export default function ProductListPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await getProducts({
        page,
        limit: 20,
        search: debouncedSearch.trim() || undefined,
      });
      const data = response.data!;
      setProducts(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Auto-dismiss success notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setSuccessMessage('สร้างสินค้าสำเร็จ');
    fetchProducts();
  };

  const handleUpdateSuccess = () => {
    setEditingProduct(null);
    setSuccessMessage('อัปเดตสินค้าสำเร็จ');
    fetchProducts();
  };

  const handleDeleteSuccess = () => {
    setDeletingProduct(null);
    setSuccessMessage('ลบสินค้าสำเร็จ');
    fetchProducts();
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await updateProductStatus(product.id, newStatus);
      setSuccessMessage('อัปเดตสถานะสำเร็จ');
      fetchProducts();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'ไม่สามารถอัปเดตสถานะได้');
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">จัดการสินค้า</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">ทั้งหมด {total} รายการ</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            + เพิ่มสินค้า
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4" role="status">
          {successMessage}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="ค้นหาด้วยชื่อ, SKU หรือหมวดหมู่..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รูปภาพ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อสินค้า</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">หมวดหมู่</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวน</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ราคา/หน่วย</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่สร้าง</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">กำลังโหลด...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">ไม่พบสินค้า</td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{p.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{p.quantity.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatPrice(p.unitPrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(p)}
                      className="focus:outline-none"
                      title={p.status === 'active' ? 'คลิกเพื่อปิดใช้งาน' : 'คลิกเพื่อเปิดใช้งาน'}
                    >
                      {statusBadge(p.status)}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(p.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => setDeletingProduct(p)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex justify-center items-center mt-4 space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            ก่อนหน้า
          </button>
          <span className="text-sm text-gray-600">
            หน้า {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            ถัดไป
          </button>
        </div>
      )}

      {/* Create Modal */}
      <ProductFormModal
        product={null}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Modal */}
      {editingProduct && (
        <ProductFormModal
          product={editingProduct}
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* Delete Dialog */}
      {deletingProduct && (
        <ProductDeleteConfirmDialog
          product={deletingProduct}
          isOpen={true}
          onCancel={() => setDeletingProduct(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
