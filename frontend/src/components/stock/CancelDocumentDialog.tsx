import { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { cancelDocument } from '../../services/stockApi';

interface CancelDocumentDialogProps {
  documentId: string;
  documentNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (documentNumber: string) => void;
}

/**
 * Cancel confirmation with a mandatory reason. Only rendered for admins;
 * a 403 or 409 from the API is shown inline and never redirects the user.
 */
export default function CancelDocumentDialog({
  documentId,
  documentNumber,
  isOpen,
  onClose,
  onSuccess,
}: CancelDocumentDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, documentId]);

  if (!isOpen || user?.role !== 'admin') {
    return null;
  }

  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length >= 1 && trimmedReason.length <= 500;

  const handleConfirm = async () => {
    if (!isReasonValid) {
      setError('เหตุผลการยกเลิกต้องมีความยาว 1-500 ตัวอักษร');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await cancelDocument(documentId, { reason: trimmedReason });
      onSuccess(documentNumber);
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string } }>;
      setError(axiosError.response?.data?.error?.message || 'ไม่สามารถยกเลิกเอกสารได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-document-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <h2 id="cancel-document-title" className="text-lg font-bold text-gray-900">
          ยกเลิกเอกสาร {documentNumber}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          ระบบจะสร้างรายการหักกลบเพื่อคืนยอดคงเหลือ รายการเดิมจะยังคงอยู่ในประวัติ
        </p>

        <div className="mt-4">
          <label htmlFor="cancel-reason" className="block text-xs font-medium text-gray-600 mb-1.5">
            เหตุผลการยกเลิก
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'cancel-reason-error' : undefined}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              error ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          <p className="mt-1 text-xs text-gray-400">{trimmedReason.length}/500</p>
        </div>

        {error && (
          <p id="cancel-reason-error" role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !isReasonValid}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isLoading ? 'กำลังยกเลิก...' : 'ยืนยันการยกเลิก'}
          </button>
        </div>
      </div>
    </div>
  );
}
