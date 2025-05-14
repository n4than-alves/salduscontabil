
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';

const emailSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
});

const phoneSchema = z.object({
  phone: z.string().min(10, { message: 'Telefone inválido. Insira DDD + número' }),
});

const nameSchema = z.object({
  fullName: z.string().min(3, { message: 'Nome completo deve ter no mínimo 3 caracteres' }),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;
type NameFormValues = z.infer<typeof nameSchema>;

const RecuperarSenha = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchMethod, setSearchMethod] = useState<'email' | 'phone' | 'name'>('email');

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  const nameForm = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { fullName: '' },
  });

  const searchByEmail = async (data: EmailFormValues) => {
    try {
      setIsLoading(true);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', data.email)
        .single();
      
      if (error || !profileData) {
        toast({
          title: "Usuário não encontrado",
          description: "Não foi encontrado nenhum usuário com este e-mail",
          variant: "destructive"
        });
        return;
      }
      
      // Enviar email de redefinição de senha
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (resetError) {
        toast({
          title: "Erro ao enviar e-mail",
          description: resetError.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha",
      });
      
      // Redirecionar para a página de login após envio do email
      navigate('/login');
      
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao buscar o usuário",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchByPhone = async (data: PhoneFormValues) => {
    try {
      setIsLoading(true);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('phone', data.phone)
        .single();
      
      if (error || !profileData) {
        toast({
          title: "Usuário não encontrado",
          description: "Não foi encontrado nenhum usuário com este telefone",
          variant: "destructive"
        });
        return;
      }
      
      if (!profileData.email) {
        toast({
          title: "E-mail não encontrado",
          description: "Não foi possível recuperar o e-mail associado a este telefone",
          variant: "destructive"
        });
        return;
      }
      
      // Enviar email de redefinição de senha
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(profileData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (resetError) {
        toast({
          title: "Erro ao enviar e-mail",
          description: resetError.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha",
      });
      
      // Redirecionar para a página de login após envio do email
      navigate('/login');
      
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao buscar o usuário",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchByName = async (data: NameFormValues) => {
    try {
      setIsLoading(true);
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email, fullname')
        .ilike('fullname', `%${data.fullName}%`)
        .limit(1)
        .single();
      
      if (error || !profileData) {
        toast({
          title: "Usuário não encontrado",
          description: "Não foi encontrado nenhum usuário com este nome",
          variant: "destructive"
        });
        return;
      }
      
      if (!profileData.email) {
        toast({
          title: "E-mail não encontrado",
          description: "Não foi possível recuperar o e-mail associado a este nome",
          variant: "destructive"
        });
        return;
      }
      
      // Enviar email de redefinição de senha
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(profileData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (resetError) {
        toast({
          title: "Erro ao enviar e-mail",
          description: resetError.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha",
      });
      
      // Redirecionar para a página de login após envio do email
      navigate('/login');
      
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao buscar o usuário",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-saldus-800">Recuperar Senha</CardTitle>
          <CardDescription>
            Encontre sua conta para redefinir a senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="email" onValueChange={(value) => setSearchMethod(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email">E-mail</TabsTrigger>
              <TabsTrigger value="phone">Telefone</TabsTrigger>
              <TabsTrigger value="name">Nome</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email">
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(searchByEmail)} className="space-y-4 mt-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-saldus-600 hover:bg-saldus-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar por E-mail
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="phone">
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(searchByPhone)} className="space-y-4 mt-4">
                  <FormField
                    control={phoneForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-saldus-600 hover:bg-saldus-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar por Telefone
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="name">
              <Form {...nameForm}>
                <form onSubmit={nameForm.handleSubmit(searchByName)} className="space-y-4 mt-4">
                  <FormField
                    control={nameForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu Nome Completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-saldus-600 hover:bg-saldus-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar por Nome
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            variant="link" 
            className="font-medium text-saldus-600 hover:text-saldus-500"
            onClick={() => navigate('/login')}
          >
            Voltar para o login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RecuperarSenha;
