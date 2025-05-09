
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  requiredAuth?: boolean;
}

const AppLayout = ({ children, requiredAuth = true }: AppLayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user && requiredAuth) {
      navigate('/login');
    }
  }, [user, loading, navigate, requiredAuth]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-saldus-600" />
      </div>
    );
  }

  if (!user && requiredAuth) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      {user && <Sidebar />}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
