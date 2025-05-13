
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const emailResetSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
});

const codeResetSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  resetCode: z.string().min(1, { message: 'Código de verificação é obrigatório' }),
  newPassword: z.string().min(6, { message: 'Nova senha deve ter no mínimo 6 caracteres' }),
  confirmPassword: z.string().min(6, { message: 'Confirme a nova senha' }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
type EmailResetFormValues = z.infer<typeof emailResetSchema>;
type CodeResetFormValues = z.infer<typeof codeResetSchema>;

const Login = () => {
  const { signIn, user, checkEmail, resetPassword, requestPasswordReset, verifyResetCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'security' | 'password'>('email');
  const [securityQuestion, setSecurityQuestion] = useState<string>('');
  const [emailNotFound, setEmailNotFound] = useState<boolean>(false);
  const [resetMethod, setResetMethod] = useState<'security' | 'email'>('email');
  const [emailResetSent, setEmailResetSent] = useState(false);
  
  // Check for reset parameter in URL
  useEffect(() => {
    const reset = searchParams.get('reset');
    if (reset === 'true') {
      setOpenResetDialog(true);
      setResetMethod('email');
      setEmailResetSent(true);
    }
  }, [searchParams]);

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

  const emailResetForm = useForm<EmailResetFormValues>({
    resolver: zodResolver(emailResetSchema),
    defaultValues: {
      email: '',
    },
  });

  const codeResetForm = useForm<CodeResetFormValues>({
    resolver: zodResolver(codeResetSchema),
    defaultValues: {
      email: '',
      resetCode: '',
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
      setEmailNotFound(false);
      
      console.log("Checking email:", email);
      const result = await checkEmail(email);
      console.log("Email check result:", result);
      
      if (!result.exists || !result.securityQuestion) {
        setEmailNotFound(true);
        toast({
          title: 'E-mail não encontrado',
          description: 'Não encontramos uma conta com este e-mail ou a conta não possui pergunta de segurança configurada.',
          variant: 'destructive',
        });
        return;
      }
      
      // Definir a pergunta de segurança
      setSecurityQuestion(result.securityQuestion);
      
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
    const securityAnswer = resetForm.getValues('securityAnswer');
    
    if (!securityAnswer) {
      resetForm.setError('securityAnswer', { 
        message: 'Informe sua resposta para continuar' 
      });
      return;
    }

    // Avançar para a etapa de redefinir a senha
    // A verificação real será feita na etapa final
    setResetStep('password');
  };

  const handleResetPassword = async () => {
    const { email, securityAnswer, newPassword } = resetForm.getValues();
    
    if (newPassword !== resetForm.getValues('confirmPassword')) {
      resetForm.setError('confirmPassword', { 
        message: 'As senhas não conferem' 
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Call the resetPassword function from AuthContext
      const success = await resetPassword(
        email,
        securityQuestion,
        securityAnswer,
        newPassword
      );
      
      if (success) {
        // Reset the form and close the dialog
        resetForm.reset();
        setOpenResetDialog(false);
        setResetStep('email');
      }
      
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

  // New function to handle email reset request
  const handleRequestEmailReset = async () => {
    const { email } = emailResetForm.getValues();
    
    if (!email) {
      emailResetForm.setError('email', { 
        message: 'Informe seu e-mail para continuar' 
      });
      return;
    }
    
    try {
      setIsLoading(true);
      const result = await requestPasswordReset(email);
      
      if (result.success) {
        setEmailResetSent(true);
        codeResetForm.setValue('email', email);
        toast({
          title: 'Código enviado',
          description: 'Verifique seu e-mail para obter o código de redefinição.',
        });
      } else {
        toast({
          title: 'Erro ao enviar código',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erro ao solicitar código:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao enviar o código. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // New function to handle email code verification and password reset
  const handleVerifyResetCode = async () => {
    const { email, resetCode, newPassword, confirmPassword } = codeResetForm.getValues();
    
    if (!email || !resetCode) {
      if (!email) codeResetForm.setError('email', { message: 'E-mail é obrigatório' });
      if (!resetCode) codeResetForm.setError('resetCode', { message: 'Código de verificação é obrigatório' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      codeResetForm.setError('confirmPassword', { message: 'As senhas não conferem' });
      return;
    }
    
    try {
      setIsLoading(true);
      const result = await verifyResetCode(email, resetCode, newPassword);
      
      if (result.success) {
        toast({
          title: 'Senha atualizada',
          description: 'Sua senha foi atualizada com sucesso. Você pode fazer login agora.',
        });
        codeResetForm.reset();
        setOpenResetDialog(false);
        setEmailResetSent(false);
      } else {
        toast({
          title: 'Erro na verificação',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erro na verificação do código:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao verificar o código. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenResetDialog(false);
    setResetStep('email');
    setEmailResetSent(false);
    resetForm.reset();
    emailResetForm.reset();
    codeResetForm.reset();
    setEmailNotFound(false);
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
                        Escolha um método para redefinir sua senha
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Tabs defaultValue="email" value={resetMethod} onValueChange={(value) => setResetMethod(value as 'security' | 'email')}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="email">Por E-mail</TabsTrigger>
                        <TabsTrigger value="security">Pergunta de Segurança</TabsTrigger>
                      </TabsList>
                      
                      {/* Redefinição por e-mail */}
                      <TabsContent value="email" className="space-y-4 mt-4">
                        {!emailResetSent ? (
                          <Form {...emailResetForm}>
                            <form className="space-y-4">
                              <FormField
                                control={emailResetForm.control}
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
                                  onClick={handleRequestEmailReset}
                                  disabled={isLoading}
                                >
                                  {isLoading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Enviando...
                                    </>
                                  ) : (
                                    'Enviar código'
                                  )}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        ) : (
                          <Form {...codeResetForm}>
                            <form className="space-y-4">
                              <FormField
                                control={codeResetForm.control}
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
                              
                              <FormField
                                control={codeResetForm.control}
                                name="resetCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Código de Verificação</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Digite o código recebido por e-mail" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={codeResetForm.control}
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
                                control={codeResetForm.control}
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
                              
                              <div className="text-sm text-gray-500 flex items-center mt-2">
                                <HelpCircle className="h-4 w-4 mr-2" />
                                <span>Verifique seu e-mail e digite o código recebido para redefinir sua senha.</span>
                              </div>
                              
                              <DialogFooter className="sm:justify-between">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    setEmailResetSent(false);
                                    codeResetForm.reset();
                                  }}
                                >
                                  Voltar
                                </Button>
                                <Button 
                                  type="button" 
                                  className="bg-saldus-600 hover:bg-saldus-700"
                                  onClick={handleVerifyResetCode}
                                  disabled={isLoading}
                                >
                                  {isLoading ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Verificando...
                                    </>
                                  ) : (
                                    'Redefinir Senha'
                                  )}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        )}
                      </TabsContent>
                      
                      {/* Redefinição por pergunta de segurança */}
                      <TabsContent value="security" className="space-y-4 mt-4">
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
                                  {emailNotFound && (
                                    <p className="text-sm text-red-500 mt-1">
                                      E-mail não encontrado. Verifique se digitou corretamente.
                                    </p>
                                  )}
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
                      </TabsContent>
                    </Tabs>
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
