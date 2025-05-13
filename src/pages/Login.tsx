
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
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
import { Loader2, Mail, KeyRound, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
});

const resetPasswordSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  securityAnswer: z.string().min(1, { message: 'Resposta é obrigatória' }),
  newPassword: z.string().min(6, { message: 'Nova senha deve ter no mínimo 6 caracteres' }),
  confirmPassword: z.string().min(6, { message: 'Confirme a nova senha' }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const Login = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'security' | 'password'>('email');
  const [securityQuestion, setSecurityQuestion] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
      securityAnswer: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Redirecionar para o dashboard se já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      await signIn(data.email, data.password);
      // Não é necessário usar navigate aqui pois o signIn já redireciona
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleFindSecurityQuestion = async () => {
    const email = resetForm.getValues('email');
    
    if (!email) {
      resetForm.setError('email', { 
        message: 'Informe seu e-mail para continuar' 
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Buscar usuários com este email
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email);
      
      if (error) {
        throw error;
      }
      
      // Verificar se encontrou algum perfil
      if (!profiles || profiles.length === 0) {
        toast({
          title: 'Usuário não encontrado',
          description: 'Não encontramos uma conta com este e-mail.',
          variant: 'destructive',
        });
        return;
      }
      
      // Verificar se o perfil tem pergunta de segurança
      const profile = profiles[0];
      if (!profile.securityquestion || !profile.securityanswer) {
        toast({
          title: 'Recuperação não disponível',
          description: 'Este usuário não configurou uma pergunta de segurança.',
          variant: 'destructive',
        });
        return;
      }
      
      // Definir a pergunta de segurança e ID do usuário
      setSecurityQuestion(profile.securityquestion);
      setUserId(profile.id);
      
      // Avançar para a etapa de responder a pergunta de segurança
      setResetStep('security');
      
    } catch (error: any) {
      console.error('Erro ao buscar pergunta de segurança:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao buscar seus dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySecurityAnswer = async () => {
    if (!userId) return;

    const securityAnswer = resetForm.getValues('securityAnswer');
    
    if (!securityAnswer) {
      resetForm.setError('securityAnswer', { 
        message: 'Informe sua resposta para continuar' 
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Buscar o perfil do usuário para verificar a resposta
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('securityanswer')
        .eq('id', userId)
        .single();
      
      if (error) {
        throw error;
      }
      
      // Verificar se a resposta está correta (case insensitive)
      if (profile.securityanswer.toLowerCase() !== securityAnswer.toLowerCase()) {
        toast({
          title: 'Resposta incorreta',
          description: 'A resposta à pergunta de segurança está incorreta.',
          variant: 'destructive',
        });
        return;
      }
      
      // Avançar para a etapa de redefinir a senha
      setResetStep('password');
      
    } catch (error: any) {
      console.error('Erro ao verificar resposta:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao verificar sua resposta. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      
      const { newPassword } = resetForm.getValues();
      
      // Atualizar a senha do usuário
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi alterada com sucesso. Você já pode fazer login.',
      });
      
      // Resetar o formulário e fechar o diálogo
      resetForm.reset();
      setOpenResetDialog(false);
      setResetStep('email');
      
    } catch (error: any) {
      console.error('Erro na redefinição de senha:', error);
      toast({
        title: 'Erro na redefinição',
        description: error.message || 'Ocorreu um erro ao tentar redefinir a senha.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenResetDialog(false);
    setResetStep('email');
    resetForm.reset();
  };

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-saldus-800">Saldus</CardTitle>
          <CardDescription>
            Entre com sua conta para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
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
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Dialog open={openResetDialog} onOpenChange={setOpenResetDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="link" 
                      className="p-0 text-saldus-600 hover:text-saldus-500"
                    >
                      Esqueceu a senha?
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        Recuperação de Senha
                      </DialogTitle>
                      <DialogDescription>
                        {resetStep === 'email' && 'Informe seu e-mail para recuperar sua senha.'}
                        {resetStep === 'security' && 'Responda à pergunta de segurança.'}
                        {resetStep === 'password' && 'Defina uma nova senha para sua conta.'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {resetStep === 'email' && (
                        <>
                          <FormField
                            control={resetForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>E-mail</FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-2">
                                    <Mail className="h-4 w-4 text-gray-500" />
                                    <Input placeholder="seu@email.com" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter className="sm:justify-between">
                            <DialogClose asChild>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={handleCloseDialog}
                              >
                                Cancelar
                              </Button>
                            </DialogClose>
                            <Button 
                              type="button" 
                              className="bg-saldus-600 hover:bg-saldus-700"
                              onClick={handleFindSecurityQuestion}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Buscando...
                                </>
                              ) : (
                                'Continuar'
                              )}
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                      
                      {resetStep === 'security' && (
                        <>
                          <div className="rounded-md border border-gray-200 p-4">
                            <h4 className="mb-2 font-medium">Pergunta de Segurança:</h4>
                            <p className="text-gray-700">{securityQuestion}</p>
                          </div>
                          
                          <FormField
                            control={resetForm.control}
                            name="securityAnswer"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sua Resposta</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Digite sua resposta" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter className="sm:justify-between">
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => setResetStep('email')}
                            >
                              Voltar
                            </Button>
                            <Button 
                              type="button" 
                              className="bg-saldus-600 hover:bg-saldus-700"
                              onClick={handleVerifySecurityAnswer}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Verificando...
                                </>
                              ) : (
                                'Verificar'
                              )}
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                      
                      {resetStep === 'password' && (
                        <>
                          <FormField
                            control={resetForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nova Senha</FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-2">
                                    <KeyRound className="h-4 w-4 text-gray-500" />
                                    <Input type="password" placeholder="••••••" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={resetForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirmar Senha</FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-2">
                                    <KeyRound className="h-4 w-4 text-gray-500" />
                                    <Input type="password" placeholder="••••••" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter className="sm:justify-between">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setResetStep('security')}
                            >
                              Voltar
                            </Button>
                            <Button 
                              type="button" 
                              className="bg-saldus-600 hover:bg-saldus-700"
                              onClick={handleResetPassword}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Redefinindo...
                                </>
                              ) : (
                                'Redefinir Senha'
                              )}
                            </Button>
                          </DialogFooter>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-saldus-600 hover:bg-saldus-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <Link to="/register" className="font-medium text-saldus-600 hover:text-saldus-500">
              Registre-se
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
