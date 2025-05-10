
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, CreditCard, CheckCircle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Schema para validar os dados do formulário
const profileSchema = z.object({
  fullName: z.string().min(3, 'Nome completo deve ter no mínimo 3 caracteres'),
  phone: z.string().optional().or(z.literal('')),
  companyName: z.string().optional().or(z.literal('')),
  commercialPhone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal(''))
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Interface da estrutura de dados real que vem do Supabase
interface SupabaseProfile {
  id: string;
  created_at: string | null;
  email: string | null;
  fullname: string | null;
  phone: string | null;
  plantype: string | null;
  planstartdate: string | null;
  companyname: string | null;
  commercialphone: string | null;
  address: string | null;
  theme: string | null;
  planexpirydate: string | null;
}

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<SupabaseProfile | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      companyName: '',
      commercialPhone: '',
      address: ''
    },
  });

  useEffect(() => {
    const loadFullProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        // Carregar todos os dados do perfil
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading profile:', error);
          return;
        }

        if (data) {
          setProfileData(data as SupabaseProfile);
          
          // Preencher o formulário com os dados do perfil
          form.reset({
            fullName: data.fullname || '',
            phone: data.phone || '',
            companyName: data.companyname || '',
            commercialPhone: data.commercialphone || '',
            address: data.address || ''
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFullProfile();
  }, [user, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Atualizar os dados básicos através do contexto de auth
      await updateProfile({
        fullName: data.fullName,
        phone: data.phone || null,
      });
      
      // Atualizar campos adicionais diretamente
      const updateData = {
        fullname: data.fullName,
        phone: data.phone || null,
        companyname: data.companyName || null,
        commercialphone: data.commercialPhone || null,
        address: data.address || null
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro ao atualizar perfil',
        description: 'Ocorreu um erro ao salvar suas informações. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
        <p className="text-gray-500">Gerencie suas preferências e dados pessoais</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-saldus-600" />
              <CardTitle>Dados Pessoais</CardTitle>
            </div>
            <CardDescription>
              Atualize suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-saldus-600" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone Pessoal</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commercialPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone Comercial</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input value={user?.email} disabled />
                    </FormControl>
                  </FormItem>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-saldus-600" />
              <CardTitle>Seu Plano</CardTitle>
            </div>
            <CardDescription>
              Informações sobre o seu plano atual
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {user?.planType === 'pro' ? 'Plano Pro' : 'Plano Gratuito'}
                </h3>
                <div
                  className={
                    user?.planType === 'pro'
                      ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800'
                      : 'rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800'
                  }
                >
                  {user?.planType === 'pro' ? 'Ativo' : 'Limitado'}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {user?.planType === 'pro' ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Transações ilimitadas</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Suporte prioritário</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Clientes ilimitados</span>
                    </div>
                    <div className="mt-4 text-sm font-medium text-gray-700">
                      Valor: R$40,00/mês
                    </div>
                    <div className="text-xs text-gray-500">
                      Plano ativo desde:{' '}
                      {user?.planStartDate
                        ? new Date(user.planStartDate).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>5 transações por semana</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Funcionalidades básicas</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Clientes ilimitados</span>
                    </div>
                    <div className="mt-4 text-sm font-medium text-gray-700">
                      Valor: Gratuito
                    </div>
                    <div className="text-xs text-gray-500">
                      Registrado desde:{' '}
                      {user?.planStartDate
                        ? new Date(user.planStartDate).toLocaleDateString()
                        : new Date(user?.created_at || '').toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full bg-saldus-600 hover:bg-saldus-700" 
              onClick={() => toast({
                title: user?.planType === 'pro' ? 'Você já possui o Plano Pro' : 'Upgrade do plano',
                description: user?.planType === 'pro' 
                  ? 'Você já está aproveitando todos os benefícios do Plano Pro.'
                  : 'Em breve você poderá fazer o upgrade para o Plano Pro!'
              })}
              disabled={user?.planType === 'pro'}
            >
              {user?.planType === 'pro' ? 'Plano Pro Ativo' : 'Atualizar para Plano Pro'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
