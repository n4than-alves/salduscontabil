
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
import { Loader2, Mail } from 'lucide-react';
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

const emailResetSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type EmailResetFormValues = z.infer<typeof emailResetSchema>;

const Login = () => {
  const { signIn, user, checkEmail, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [emailNotFound, setEmailNotFound] = useState<boolean>(false);
  
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const emailResetForm = useForm<EmailResetFormValues>({
    resolver: zodResolver(emailResetSchema),
    defaultValues: {
      email: '',
    },
  });

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      await signIn(data.email, data.password);
      // No need to use navigate here as signIn already redirects
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  // Handle password reset request
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
        toast({
          title: 'E-mail enviado',
          description: 'Verifique seu e-mail para obter o link de redefinição de senha.',
        });
        setOpenResetDialog(false);
      } else {
        setEmailNotFound(true);
        toast({
          title: 'Erro ao enviar e-mail',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erro ao solicitar redefinição:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao enviar o e-mail. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenResetDialog(false);
    emailResetForm.reset();
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
                        Informe seu e-mail para receber um link de redefinição de senha
                      </DialogDescription>
                    </DialogHeader>
                    
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
                            onClick={handleRequestEmailReset}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              'Enviar link de redefinição'
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
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
