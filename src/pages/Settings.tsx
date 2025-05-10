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
import { Loader2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';

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

        <SubscriptionCard />
      </div>
    </AppLayout>
  );
};

export default Settings;
