
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const Sidebar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      name: 'Clientes',
      icon: Users,
      path: '/clients',
    },
    {
      name: 'Movimentações',
      icon: DollarSign,
      path: '/transactions',
    },
    {
      name: 'Configurações',
      icon: Settings,
      path: '/settings',
    },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className="fixed left-0 top-0 z-40 flex h-16 w-full items-center border-b bg-white px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mr-2"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold text-saldus-800">Saldus</h1>
        </div>
      </div>

      <div
        className={cn(
          'fixed inset-0 z-50 transform bg-black bg-opacity-50 transition-opacity duration-200 md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={toggleSidebar}
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 transform bg-white transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0 md:shadow-md'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-xl font-bold text-saldus-800">Saldus</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col justify-between px-3 py-4">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium',
                  location.pathname === item.path
                    ? 'bg-saldus-50 text-saldus-800'
                    : 'text-gray-600 hover:bg-saldus-50 hover:text-saldus-800'
                )}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-4 pt-4">
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center px-3 py-2">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800">
                    {user?.fullName || user?.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    Plano: {user?.planType === 'pro' ? 'Pro' : 'Gratuito'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-start px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700"
                onClick={signOut}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="h-16 md:hidden" />
    </>
  );
};

export default Sidebar;
