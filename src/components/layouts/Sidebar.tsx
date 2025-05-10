
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const NavItem = ({
  to,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}) => (
  <Link
    to={to}
    className={cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active ? 'bg-saldus-500 text-white' : 'hover:bg-gray-100 text-gray-700'
    )}
    onClick={onClick}
  >
    <Icon className="h-5 w-5" />
    <span>{label}</span>
  </Link>
);

const Sidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Fechar sidebar automaticamente em dispositivos móveis após navegação
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  if (!user) return null;
  
  const navItems = [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      active: location.pathname === '/dashboard',
    },
    {
      to: '/clients',
      icon: Users,
      label: 'Clientes',
      active: location.pathname === '/clients',
    },
    {
      to: '/transactions',
      icon: CreditCard,
      label: 'Movimentações',
      active: location.pathname === '/transactions',
    },
    {
      to: '/reports',
      icon: BarChart,
      label: 'Relatórios',
      active: location.pathname === '/reports',
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'Configurações',
      active: location.pathname === '/settings',
    },
  ];

  return (
    <>
      {/* Mobile toggle button */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-4 top-4 z-50 md:hidden"
          onClick={toggleSidebar}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}
      
      {/* Sidebar container */}
      <aside
        className={cn(
          'bg-white border-r border-gray-200 flex flex-col h-screen fixed md:sticky top-0 left-0 z-40 transition-all duration-200',
          isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0',
          isMobile ? 'w-64' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-center border-b h-16">
          <h1 className="text-xl font-bold text-saldus-800">Saldus</h1>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-auto py-4 px-3 space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              onClick={() => isMobile && setIsOpen(false)}
            />
          ))}
        </div>

        {/* User info and logout */}
        <div className="border-t p-4 space-y-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {user.fullName || user.email}
            </span>
            <span className="text-xs text-gray-500">
              Plano {user.planType === 'pro' ? 'Pro' : 'Gratuito'}
            </span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      
      {/* Overlay para mobile quando sidebar está aberta */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
