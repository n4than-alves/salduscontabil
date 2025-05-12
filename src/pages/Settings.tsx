
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
import { Loader2, User, Shield, Building } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Schema para validar os dados do formulário
const profileSchema = z.object({
  fullName: z.string().min(3, 'Nome completo deve ter no mínimo 3 caracteres'),
  phone: z.string().optional().or(z.literal('')),
  companyName: z.string().optional().or(z.literal('')),
  commercialPhone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal(''))
});

// Schema para validar a pergunta de segurança
const securitySchema = z.object({
  securityQuestion: z.string().min(1, 'Escolha uma pergunta de segurança'),
  securityAnswer: z.string().min(1, 'Forneça uma resposta para a pergunta de segurança')
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SecurityFormValues = z.infer<typeof securitySchema>;

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
  securityquestion: string | null;
  securityanswer: string | null;
}

const SECURITY_QUESTIONS = [
  'Qual foi o nome do seu primeiro animal de estimação?',
  'Qual é o nome da cidade onde você nasceu?',
  'Qual é o nome de solteiro da sua mãe?',
  'Qual foi o seu primeiro emprego?',
  'Qual é o nome da escola onde você estudou?'
];

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [profileData, setProfileData] = useState<SupabaseProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>('personal');

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

  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      securityQuestion: '',
      securityAnswer: ''
    }
  });

  useEffect(() => {
    const loadFullProfile = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setSecurityLoading(true);
        
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

          // Preencher o formulário de segurança
          securityForm.reset({
            securityQuestion: data.securityquestion || '',
            securityAnswer: data.securityanswer || ''
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
        setSecurityLoading(false);
      }
    };

    loadFullProfile();
  }, [user, form, securityForm]);

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

  const onSubmitSecurity = async (data: SecurityFormValues) => {
    if (!user) return;

    setSecurityLoading(true);
    try {
      // Atualizar pergunta e resposta de segurança
      const updateData = {
        securityquestion: data.securityQuestion,
        securityanswer: data.securityAnswer.toLowerCase().trim()
      };
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      toast({
        title: 'Configurações de segurança atualizadas',
        description: 'Sua pergunta e resposta de segurança foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast({
        title: 'Erro ao atualizar configurações de segurança',
        description: 'Ocorreu um erro ao salvar suas configurações. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
        <p className="text-gray-500">Gerencie suas preferências e dados pessoais</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Assinatura
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-6 md:grid-cols-1">
          <TabsContent value="personal">
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
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-saldus-600" />
                  <CardTitle>Configurações de Segurança</CardTitle>
                </div>
                <CardDescription>
                  Atualize sua pergunta e resposta de segurança para recuperação de senha
                </CardDescription>
              </CardHeader>
              <CardContent>
                {securityLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-saldus-600" />
                  </div>
                ) : (
                  <Form {...securityForm}>
                    <form onSubmit={securityForm.handleSubmit(onSubmitSecurity)} className="space-y-4">
                      <FormField
                        control={securityForm.control}
                        name="securityQuestion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pergunta de Segurança</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma pergunta de segurança" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SECURITY_QUESTIONS.map((question) => (
                                  <SelectItem key={question} value={question}>
                                    {question}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={securityForm.control}
                        name="securityAnswer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resposta de Segurança</FormLabel>
                            <FormControl>
                              <Input placeholder="Sua resposta" {...field} />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500">
                              Essa resposta será usada para recuperar sua senha caso você a esqueça.
                              Guarde-a com cuidado.
                            </p>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={securityLoading}>
                        {securityLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Configurações de Segurança'
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionCard />
          </TabsContent>
        </div>
      </Tabs>
    </AppLayout>
  );
};

export default Settings;
