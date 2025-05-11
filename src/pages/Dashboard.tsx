
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layouts/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, ArrowDown, Coins, Calendar, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  recentTransactions: any[];
  weeklyTransactionCount: number;
  weeklyTransactionLimit: number;
  canCreateTransactions: boolean;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    recentTransactions: [],
    weeklyTransactionCount: 0,
    weeklyTransactionLimit: 5,
    canCreateTransactions: true
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();
        
        // Get transactions for current month
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        if (error) throw error;

        // Calculate totals
        let totalIncome = 0;
        let totalExpense = 0;
        
        transactions?.forEach(transaction => {
          if (transaction.type === 'income') {
            totalIncome += transaction.amount;
          } else {
            totalExpense += transaction.amount;
          }
        });

        // Get recent transactions
        const { data: recentTransactions, error: recentError } = await supabase
          .from('transactions')
          .select('*, clients(name)')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(5);

        if (recentError) throw recentError;

        // Check weekly transaction limit for free users
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const { count, error: countError } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', oneWeekAgo.toISOString());

        if (countError) throw countError;

        const weeklyLimit = user.planType === 'pro' ? Infinity : 5;
        const canCreate = user.planType === 'pro' || (count as number) < weeklyLimit;

        setData({
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          recentTransactions: recentTransactions || [],
          weeklyTransactionCount: count as number,
          weeklyTransactionLimit: weeklyLimit,
          canCreateTransactions: canCreate
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Erro ao carregar o dashboard',
          description: 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">
          Bem-vindo ao Saldus, {user?.fullName || user?.email}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="Saldo Atual"
              value={formatCurrency(data.balance)}
              icon={<Coins className="h-4 w-4" />}
              className={
                data.balance >= 0 ? 'border-l-4 border-green-400' : 'border-l-4 border-red-400'
              }
            />
            <StatCard
              title="Receitas do Mês"
              value={formatCurrency(data.totalIncome)}
              icon={<ArrowUp className="h-4 w-4" />}
              className="border-l-4 border-green-400"
            />
            <StatCard
              title="Balanço Total"
              value={formatCurrency(data.totalExpense)}
              icon={<ArrowDown className="h-4 w-4" />}
              className="border-l-4 border-red-400"
            />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
            <CardDescription>
              Últimas 5 transações registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : (
              <div className="space-y-4">
                {data.recentTransactions.length > 0 ? (
                  data.recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={cn(
                            'rounded-full p-2',
                            transaction.type === 'income'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          )}
                        >
                          {transaction.type === 'income' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-xs text-gray-500">
                            {transaction.clients?.name
                              ? `Cliente: ${transaction.clients.name}`
                              : transaction.category}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p
                          className={cn(
                            'font-medium',
                            transaction.type === 'income'
                              ? 'text-green-600'
                              : 'text-red-600'
                          )}
                        >
                          {transaction.type === 'income' ? '+' : '-'}{' '}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-right text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500">
                    Nenhuma transação registrada
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {user?.planType !== 'pro' && (
          <Card>
            <CardHeader>
              <CardTitle>Seu Plano</CardTitle>
              <CardDescription>
                {user?.planType === 'pro' 
                  ? 'Você possui o Plano Pro com transações ilimitadas'
                  : 'Plano Gratuito com limite de transações semanais'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40" />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-saldus-700" />
                        <h3 className="font-medium text-saldus-700">
                          {user?.planType === 'pro' ? 'Plano Pro' : 'Plano Gratuito'}
                        </h3>
                      </div>
                      {user?.planType === 'pro' && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          Ativo
                        </span>
                      )}
                    </div>
                    {user?.planType !== 'pro' && (
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>Transações usadas esta semana</span>
                          <span className="font-medium">
                            {data.weeklyTransactionCount} / {data.weeklyTransactionLimit}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={cn(
                              'h-full bg-saldus-600',
                              data.canCreateTransactions
                                ? ''
                                : 'bg-red-500'
                            )}
                            style={{
                              width: `${Math.min(
                                (data.weeklyTransactionCount / data.weeklyTransactionLimit) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {data.canCreateTransactions
                            ? `Você ainda pode adicionar ${
                                data.weeklyTransactionLimit - data.weeklyTransactionCount
                              } transações esta semana.`
                            : 'Você atingiu o limite de transações desta semana.'}
                        </p>
                        <p className="mt-2 text-sm font-medium text-saldus-700">
                          Atualize para o Plano Pro por R$40/mês e tenha transações ilimitadas!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
