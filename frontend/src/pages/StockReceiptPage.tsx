import StockDocumentForm from '../components/stock/StockDocumentForm';

export default function StockReceiptPage() {
  return (
    <StockDocumentForm
      mode="receipt"
      title="รับสินค้าเข้า"
      subtitle="บันทึกการรับสินค้าเข้าคลัง ระบบจะออกเลขที่เอกสารให้อัตโนมัติ"
      submitLabel="บันทึกรับเข้า"
    />
  );
}
