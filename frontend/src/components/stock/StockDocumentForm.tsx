import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import StockItemRows from './StockItemRows';
import CancelDocumentDialog from './CancelDocumentDialog';
import { useStockDocumentForm, StockFormMode } from '../../hooks/useStockDocumentForm';
import { createReceipt, createIssue, createAdjustment } from '../../services/stockApi';
import { StockDocument, MOVEMENT_TYPE_LABELS } from '../../types/stock.types';

interface StockDocumentFormProps {
  mode: StockFormMode;
  title: string;
  subtitle: string;
  submitLabel: string;
}

const SUCCESS_PREFIX: Record<StockFormMode, string> = {
  receipt: 'บันทึกรับสินค้าเข้าสำเร็จ',
  issue: 'บันทึกจ่ายสินค้าออกสำเร็จ',
  adjustment: 'ปรับยอดสินค้าสำเร็จ',
};

export default function StockDocumentForm({
  mode,
  title,
  subtitle,
  submitLabel,
}: StockDocumentFormProps) {
  const { user } = useAuth();
  const form = useStockDocumentForm(mode);
  const [note, setNote] = useState('');
  const [postedDocument, setPostedDocument] = useState<StockDocument | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StockDocument | null>(null);
  const [cancelledMessage, setCancelledMessage] = useState('');

  const { state, rowWarnings, canSubmit } = form;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    form.clearErrors();
    form.setSubmitting(true);
    setCancelledMessage('');

    try {
      // POST requests are never retried automatically - a retry could post twice
      let response;
      if (mode === 'receipt') {
        response = await createReceipt({
          note: note.trim() || undefined,
          items: state.rows.map((row) => ({
            productId: row.productId,
            quantity: Number(row.quantity),
            ...(row.unitCost.trim() !== '' ? { unitCost: Number(row.unitCost) } : {}),
          })),
        });
      } else if (mode === 'issue') {
        response = await createIssue({
          note: note.trim() || undefined,
          items: state.rows.map((row) => ({
            productId: row.productId,
            quantity: Number(row.quantity),
          })),
        });
      } else {
        response = await createAdjustment({
          note: note.trim() || undefined,
          items: state.rows.map((row) => ({
            productId: row.productId,
            countedQuantity: Number(row.countedQuantity),
            reason: row.reason.trim(),
          })),
        });
      }

      setPostedDocument(response.data!);
      setNote('');
      // Reset clears the rows so the next pick reloads fresh balances
      form.reset();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: { message: string; details?: Record<string, string>[] } }>;
      const apiError = axiosError.response?.data?.error;
      form.applyErrorDetails(apiError?.details, apiError?.message || 'ไม่สามารถบันทึกเอกสารได้');
    } finally {
      form.setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 shadow-xl">
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h1>
            <p className="mt-1 text-blue-100 text-sm">{subtitle}</p>
          </div>
          <Link
            to="/stock/balances"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200"
          >
            กลับไปหน้ายอดคงเหลือ
          </Link>
        </div>
      </div>

      {cancelledMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-xl" role="status">
          <span className="font-medium text-sm">{cancelledMessage}</span>
        </div>
      )}

      {postedDocument && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-5 py-4 rounded-xl" role="status">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">
                {SUCCESS_PREFIX[mode]} เลขที่เอกสาร {postedDocument.documentNumber}
              </p>
              <ul className="mt-2 space-y-0.5 text-xs text-emerald-800">
                {postedDocument.items.map((item) => (
                  <li key={item.id}>
                    {item.productName} ({item.sku}) — {MOVEMENT_TYPE_LABELS[item.movementType]}{' '}
                    {item.quantity > 0 ? `+${item.quantity}` : item.quantity} → ยอดคงเหลือ{' '}
                    {item.balanceAfter.toLocaleString('th-TH')}
                  </li>
                ))}
              </ul>
            </div>
            {user?.role === 'admin' && postedDocument.status === 'posted' && (
              <button
                type="button"
                onClick={() => setCancelTarget(postedDocument)}
                className="self-start px-4 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                ยกเลิกเอกสารนี้
              </button>
            )}
          </div>
        </div>
      )}

      {state.formErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-xl" role="alert">
          <ul className="space-y-1 text-sm font-medium">
            {state.formErrors.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
        <StockItemRows
          mode={mode}
          rows={state.rows}
          rowErrors={state.rowErrors}
          rowWarnings={rowWarnings}
          disabled={state.submitting}
          onAddRow={form.addRow}
          onRemoveRow={form.removeRow}
          onUpdateRow={form.updateRow}
          onSelectProduct={form.selectProduct}
        />

        <div>
          <label htmlFor="document-note" className="block text-xs font-medium text-gray-600 mb-1.5">
            หมายเหตุ
          </label>
          <textarea
            id="document-note"
            rows={2}
            maxLength={1000}
            value={note}
            disabled={state.submitting}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <div aria-live="polite" className="text-sm text-gray-500">
            {state.submitting ? 'กำลังบันทึกข้อมูล...' : ''}
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.submitting ? 'กำลังบันทึก...' : submitLabel}
          </button>
        </div>
      </form>

      {cancelTarget && (
        <CancelDocumentDialog
          documentId={cancelTarget.id}
          documentNumber={cancelTarget.documentNumber}
          isOpen={Boolean(cancelTarget)}
          onClose={() => setCancelTarget(null)}
          onSuccess={(documentNumber) => {
            setCancelTarget(null);
            setPostedDocument(null);
            setCancelledMessage(`ยกเลิกเอกสาร ${documentNumber} สำเร็จ`);
          }}
        />
      )}
    </div>
  );
}
