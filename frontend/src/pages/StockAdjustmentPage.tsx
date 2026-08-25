import StockDocumentForm from '../components/stock/StockDocumentForm';

export default function StockAdjustmentPage() {
  return (
    <StockDocumentForm
      mode="adjustment"
      title="ปรับยอดสต็อก"
      subtitle="ตั้งยอดคงเหลือให้เท่ากับจำนวนที่นับได้จริง ระบบจะบันทึกส่วนต่างเป็นรายการปรับยอด"
      submitLabel="บันทึกปรับยอด"
    />
  );
}
