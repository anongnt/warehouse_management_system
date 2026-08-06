import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        สวัสดี, {user?.firstName} {user?.lastName}
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Warehouse Management System</h2>
        <p className="text-gray-600">
          ยินดีต้อนรับเข้าสู่ระบบจัดการคลังสินค้า
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">บทบาท</p>
            <p className="text-lg font-bold text-blue-900">{user?.role === 'admin' ? 'Admin' : 'User'}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">สถานะ</p>
            <p className="text-lg font-bold text-green-900">ใช้งาน</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">อีเมล</p>
            <p className="text-lg font-bold text-purple-900">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
