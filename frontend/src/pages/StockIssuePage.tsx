import StockDocumentForm from '../components/stock/StockDocumentForm';

export default function StockIssuePage() {
  return (
    <StockDocumentForm
      mode="issue"
      title="จ่ายสินค้าออก"
      subtitle="บันทึกการจ่ายสินค้าออกจากคลัง จำนวนที่จ่ายต้องไม่เกินยอดคงเหลือ"
      submitLabel="บันทึกจ่ายออก"
    />
  );
}
