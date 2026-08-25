import { Link } from 'react-router-dom';
import { StockBalance } from '../../types/stock.types';

interface StockBalanceTableProps {
  balances: StockBalance[];
  loading: boolean;
  threshold: number;
}

function formatMoney(value: number): string {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StockBalanceTable({ balances, loading, threshold }: StockBalanceTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div aria-live="polite" className="sr-only">
        {loading ? 'กำลังโหลดข้อมูลยอดคงเหลือ' : `แสดงยอดคงเหลือ ${balances.length} รายการ`}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <caption className="sr-only">ตารางยอดคงเหลือสินค้า</caption>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                ชื่อสินค้า
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                SKU
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                หมวดหมู่
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                ยอดคงเหลือ
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                ราคาต่อหน่วย
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                มูลค่าคงเหลือ
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                ประวัติ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            )}

            {!loading && balances.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                  ไม่พบข้อมูลยอดคงเหลือ
                </td>
              </tr>
            )}

            {!loading &&
              balances.map((balance) => (
                <tr key={balance.productId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {balance.name}
                    {balance.status === 'inactive' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                        ไม่ใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{balance.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{balance.category}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span
                      className={
                        balance.onHandBalance <= threshold
                          ? 'font-semibold text-amber-700'
                          : 'font-semibold text-gray-900'
                      }
                    >
                      {balance.onHandBalance.toLocaleString('th-TH')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {formatMoney(balance.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                    {formatMoney(balance.stockValue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <Link
                      to={`/stock/movements?productId=${balance.productId}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      ดูการ์ดสต็อก
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
