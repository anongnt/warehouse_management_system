import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { User, ApiResponse, PaginatedResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import UserFormModal from '../components/UserFormModal';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import { AxiosError } from 'axios';

export default function UserListPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());

      const response = await api.get<ApiResponse<PaginatedResponse<User>>>(`/users?${params}`);
      const data = response.data.data!;
      setUsers(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleUpdateSuccess = () => {
    setEditingUser(null);
    fetchUsers();
  };

  const handleDeleteSuccess = () => {
    setDeletingUser(null);
    fetchUsers();
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      locked: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      active: 'ใช้งาน',
      suspended: 'ระงับ',
      locked: 'ล็อก',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h2>
        <span className="text-sm text-gray-500">ทั้งหมด {total} คน</span>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="ค้นหาด้วยอีเมล ชื่อ หรือนามสกุล..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อีเมล</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">บทบาท</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">กำลังโหลด...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">ไม่พบข้อมูลผู้ใช้</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.firstName} {u.lastName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.role === 'admin' ? 'Admin' : 'User'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{statusBadge(u.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      แก้ไข
                    </button>
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => setDeletingUser(u)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        ลบ
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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

      {/* Edit Modal */}
      {editingUser && (
        <UserFormModal
          user={editingUser}
          isOpen={true}
          onClose={() => setEditingUser(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {/* Delete Dialog */}
      {deletingUser && (
        <DeleteConfirmDialog
          user={deletingUser}
          isOpen={true}
          onCancel={() => setDeletingUser(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
