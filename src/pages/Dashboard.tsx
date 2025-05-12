
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layouts/AppLayout';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, ArrowDown, Coins, Calendar, Activity, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/use-subscription';

interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  recentTransactions: any[];
  weeklyTransactionCount: number;
  weeklyTransactionLimit: number;
  canCreateTransactions: boolean;
  accountsReceivable: number;
  accountsPayable: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { planType } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    recentTransactions: [],
    weeklyTransactionCount: 0,
    weeklyTransactionLimit: 5,
    canCreateTransactions: true,
    accountsReceivable: 0,
    accountsPayable: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
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

        // Fetch accounts receivable (future income transactions)
        const { data: receivables, error: receivablesError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'income')
          .gt('date', today.toISOString());
        
        if (receivablesError) throw receivablesError;
        
        // Fetch accounts payable (future expense transactions)
        const { data: payables, error: payablesError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gt('date', today.toISOString());
        
        if (payablesError) throw payablesError;

        // Calculate accounts receivable/payable totals
        const accountsReceivable = receivables?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
        const accountsPayable = payables?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;

        // Use the planType from useSubscription
        const weeklyLimit = planType === 'pro' ? Infinity : 5;
        const canCreate = planType === 'pro' || (count as number) < weeklyLimit;

        setData({
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          recentTransactions: recentTransactions || [],
          weeklyTransactionCount: count as number,
          weeklyTransactionLimit: weeklyLimit,
          canCreateTransactions: canCreate,
          accountsReceivable,
          accountsPayable
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
  }, [user, planType]);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">
          Bem-vindo ao Saldus, {user?.fullName || user?.email}!
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
                  title="Total de Receitas"
                  value={formatCurrency(data.totalIncome)}
                  description="Valor total recebido este mês"
                  icon={<ArrowUp className="h-4 w-4" />}
                  className="border-l-4 border-green-400"
                />
                <StatCard
                  title="Total de Despesas"
                  value={formatCurrency(data.totalExpense)}
                  description="Valor total gasto este mês"
                  icon={<ArrowDown className="h-4 w-4" />}
                  className="border-l-4 border-red-400"
                />
                <StatCard
                  title="Lucro Líquido"
                  value={formatCurrency(data.balance)}
                  description={data.balance >= 0 ? "Saldo positivo" : "Saldo negativo"}
                  icon={<TrendingUp className="h-4 w-4" />}
                  className={
                    data.balance >= 0 ? 'border-l-4 border-blue-400' : 'border-l-4 border-orange-400'
                  }
                />
              </>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contas a Receber/Pagar</CardTitle>
                <CardDescription>
                  Resumo das próximas transações
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ArrowUp className="h-5 w-5 text-green-600" />
                          <h3 className="font-medium text-green-700">
                            Contas a Receber
                          </h3>
                        </div>
                        <span className="text-green-700 font-semibold">
                          {formatCurrency(data.accountsReceivable)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-red-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ArrowDown className="h-5 w-5 text-red-600" />
                          <h3 className="font-medium text-red-700">
                            Contas a Pagar
                          </h3>
                        </div>
                        <span className="text-red-700 font-semibold">
                          {formatCurrency(data.accountsPayable)}
                        </span>
                      </div>
                    </div>
                    <div 
                      className="cursor-pointer text-sm text-center mt-4 text-saldus-600 hover:text-saldus-700"
                      onClick={() => navigate('/transactions')}
                    >
                      Ver todas as transações →
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
                    
                    <div 
                      className="cursor-pointer text-sm text-center mt-4 text-saldus-600 hover:text-saldus-700"
                      onClick={() => navigate('/reports')}
                    >
                      Ver relatórios completos →
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Only show plan card for free users */}
          {planType === 'free' && (
            <Card>
              <CardHeader>
                <CardTitle>Seu Plano</CardTitle>
                <CardDescription>
                  Plano Gratuito com limite de transações semanais
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
                            Plano Gratuito
                          </h3>
                        </div>
                      </div>
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
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa</CardTitle>
              <CardDescription>
                Balanço entre receitas e despesas
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
                <div className="space-y-6">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-700 mb-2">Resumo do Fluxo de Caixa</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Total de Receitas</p>
                          <p className="text-lg font-medium text-green-600">
                            {formatCurrency(data.totalIncome)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total de Despesas</p>
                          <p className="text-lg font-medium text-red-600">
                            {formatCurrency(data.totalExpense)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold">Saldo Atual</p>
                          <p className={cn(
                            'font-semibold text-lg',
                            data.balance >= 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {formatCurrency(data.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-medium text-gray-700 mb-2">Contas Futuras</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">A Receber</p>
                          <p className="text-lg font-medium text-green-600">
                            {formatCurrency(data.accountsReceivable)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">A Pagar</p>
                          <p className="text-lg font-medium text-red-600">
                            {formatCurrency(data.accountsPayable)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold">Projeção Futura</p>
                          <p className={cn(
                            'font-semibold text-lg',
                            data.balance + data.accountsReceivable - data.accountsPayable >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          )}>
                            {formatCurrency(data.balance + data.accountsReceivable - data.accountsPayable)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <button 
                      className="bg-saldus-600 hover:bg-saldus-700 text-white px-4 py-2 rounded"
                      onClick={() => navigate('/transactions')}
                    >
                      Gerenciar Transações
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Dashboard;
