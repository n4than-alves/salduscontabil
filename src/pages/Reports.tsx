
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface CategoryData {
  name: string;
  value: number;
}

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const { toast } = useToast();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    const fetchReportData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Obter dados dos últimos 6 meses
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(today.getMonth() - 5);
        
        const startDate = sixMonthsAgo.toISOString();
        const endDate = today.toISOString();
        
        // Buscar transações dos últimos 6 meses
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        if (error) throw error;

        // Processar dados para o gráfico mensal
        const monthlyDataMap = new Map<string, { income: number; expense: number }>();
        const categoryDataMap = new Map<string, number>();
        
        // Inicializar os últimos 6 meses
        for (let i = 0; i < 6; i++) {
          const date = new Date();
          date.setMonth(today.getMonth() - i);
          const monthYear = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
          monthlyDataMap.set(monthYear, { income: 0, expense: 0 });
        }
        
        // Processar transações
        transactions?.forEach(transaction => {
          // Processar dados mensais
          const date = new Date(transaction.date);
          const monthYear = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
          
          const currentMonthData = monthlyDataMap.get(monthYear) || { income: 0, expense: 0 };
          
          if (transaction.type === 'income') {
            currentMonthData.income += transaction.amount;
          } else {
            currentMonthData.expense += transaction.amount;
          }
          
          monthlyDataMap.set(monthYear, currentMonthData);
          
          // Processar dados de categoria
          if (transaction.type === 'expense') {
            const category = transaction.category || 'Outro';
            const currentAmount = categoryDataMap.get(category) || 0;
            categoryDataMap.set(category, currentAmount + transaction.amount);
          }
        });
        
        // Converter Map para array para o gráfico mensal
        const monthlyDataArray: MonthlyData[] = Array.from(monthlyDataMap).map(([month, data]) => ({
          month,
          income: data.income,
          expense: data.expense
        })).reverse(); // Mostrar os meses em ordem crescente
        
        // Converter Map para array para o gráfico de categorias
        const categoryDataArray: CategoryData[] = Array.from(categoryDataMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value) // Ordenar por valor
          .slice(0, 5); // Limitar às 5 maiores categorias
        
        setMonthlyData(monthlyDataArray);
        setCategoryData(categoryDataArray);
      } catch (error) {
        console.error('Error fetching report data:', error);
        toast({
          title: 'Erro ao carregar relatórios',
          description: 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [user]);

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        <p className="text-gray-500">
          Visualize os dados financeiros da sua conta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Gráfico de Barras - Receitas x Despesas por Mês */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Receitas x Despesas por Mês</CardTitle>
            <CardDescription>
              Comparativo dos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 30,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis 
                    tickFormatter={(value) => `R$${value}`} 
                  />
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(value as number)}`, ``]}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#4CAF50" />
                  <Bar dataKey="expense" name="Despesas" fill="#F44336" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição de Despesas por Categoria */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
            <CardDescription>
              Distribuição das suas despesas
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={130}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">
                  Nenhuma despesa registrada para o período selecionado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Reports;
