import { useState } from 'react';
import api from '../services/api';
import { User } from '../types';
import { AxiosError } from 'axios';

interface Props {
  user: User;
  isOpen: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function DeleteConfirmDialog({ user, isOpen, onCancel, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    setError('');
    try {
      await api.delete(`/users/${user.id}`);
      onSuccess();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'ไม่สามารถลบผู้ใช้ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-2">ยืนยันการลบ</h3>
        <p className="text-gray-600 mb-4">
          คุณต้องการลบผู้ใช้ <strong>{user.firstName} {user.lastName}</strong> ({user.email}) หรือไม่?
        </p>
        <p className="text-sm text-red-600 mb-4">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4" role="alert">
            {error}
          </div>
        )}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'กำลังลบ...' : 'ลบ'}
          </button>
        </div>
      </div>
    </div>
  );
}
