import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-bold text-blue-600">
                WMS
              </Link>
              <Link to="/products" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                จัดการสินค้า
              </Link>
              {user?.role === 'admin' && (
                <Link to="/users" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  จัดการผู้ใช้
                </Link>
              )}
              <Link to="/change-password" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                เปลี่ยนรหัสผ่าน
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName} ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
