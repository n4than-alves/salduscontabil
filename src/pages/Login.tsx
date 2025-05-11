
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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const loginSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
});

const recoverySchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  securityAnswer: z.string().min(1, { message: 'Selecione uma resposta' }),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, { message: 'Nova senha deve ter no mínimo 6 caracteres' }),
  confirmPassword: z.string().min(6, { message: 'Confirme a nova senha' }),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RecoveryFormValues = z.infer<typeof recoverySchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function generateMultipleChoices(correctAnswer: string): string[] {
  const answers = [correctAnswer.toLowerCase()];
  
  // Lista de possíveis respostas para distrair
  const distractors = [
    'Resposta incorreta 1',
    'Opção errada',
    'Alternativa falsa',
    'Não é esta resposta',
    'Tente novamente',
    'Outra opção',
    'Alternativa diferente',
    'Resposta alternativa',
    'Outra possibilidade'
  ];
  
  // Adicionar 3 respostas erradas para ter 4 opções no total
  while (answers.length < 4) {
    const distractor = distractors[Math.floor(Math.random() * distractors.length)];
    if (!answers.includes(distractor)) {
      answers.push(distractor);
    }
  }
  
  // Embaralhar as respostas
  return answers.sort(() => Math.random() - 0.5);
}

const Login = () => {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [securityQuestion, setSecurityQuestion] = useState<string>('');
  const [answerOptions, setAnswerOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const recoveryForm = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoverySchema),
    defaultValues: {
      email: '',
      securityAnswer: '',
    },
  });

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Redirecionar para o dashboard se já estiver logado
  if (user) {
    navigate('/dashboard');
    return null;
  }

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

  const onSubmitRecovery = async (data: RecoveryFormValues) => {
    try {
      setIsLoading(true);
      
      // Primeiro, buscar o perfil do usuário pelo e-mail
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, securityquestion, securityanswer')
        .eq('email', data.email)
        .single();
      
      if (profileError) {
        toast({
          title: 'Erro na recuperação',
          description: 'E-mail não encontrado no sistema.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Verificar se o usuário tem uma pergunta de segurança configurada
      if (!profiles.securityquestion || !profiles.securityanswer) {
        toast({
          title: 'Recuperação não disponível',
          description: 'Este usuário não configurou uma pergunta de segurança.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      // Verificar se a resposta selecionada está correta
      if (data.securityAnswer !== profiles.securityanswer.toLowerCase().trim()) {
        toast({
          title: 'Verificação falhou',
          description: 'Resposta de segurança incorreta.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      // Se a resposta estiver correta, mostrar o formulário de redefinição
      setUserId(profiles.id);
      setShowResetForm(true);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Erro na recuperação de senha:', error);
      toast({
        title: 'Erro na recuperação',
        description: error.message || 'Ocorreu um erro ao tentar recuperar a senha.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const onSubmitReset = async (data: ResetPasswordFormValues) => {
    try {
      if (!userId) {
        toast({
          title: 'Erro na redefinição',
          description: 'ID de usuário não encontrado.',
          variant: 'destructive',
        });
        return;
      }
      
      setIsLoading(true);
      
      // Buscar o e-mail do usuário pelo ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (profileError || !profile?.email) {
        toast({
          title: 'Erro na redefinição',
          description: 'Não foi possível encontrar seu e-mail.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      // Atualizar a senha do usuário
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { password: data.newPassword }
      );
      
      if (error) {
        // Se não funcionar com admin, tentar com resetPasswordForEmail
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          profile.email,
          { redirectTo: window.location.origin + '/login' }
        );
        
        if (resetError) {
          throw new Error('Não foi possível redefinir sua senha. Entre em contato com o suporte.');
        } else {
          toast({
            title: 'E-mail enviado',
            description: 'Um e-mail de redefinição de senha foi enviado para o seu endereço de e-mail.',
          });
        }
      } else {
        toast({
          title: 'Senha alterada',
          description: 'Sua senha foi alterada com sucesso. Você já pode fazer login.',
        });
      }
      
      setShowResetForm(false);
      setOpenResetDialog(false);
      resetPasswordForm.reset();
      recoveryForm.reset();
      
      setIsLoading(false);
    } catch (error: any) {
      console.error('Erro na redefinição de senha:', error);
      toast({
        title: 'Erro na redefinição',
        description: error.message || 'Ocorreu um erro ao tentar redefinir a senha.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenResetDialog(false);
    setShowResetForm(false);
    recoveryForm.reset();
    resetPasswordForm.reset();
  };

  const fetchSecurityQuestion = async (email: string) => {
    try {
      setIsLoading(true);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, securityquestion, securityanswer')
        .eq('email', email)
        .single();
      
      if (error || !profile) {
        toast({
          title: 'Usuário não encontrado',
          description: 'E-mail não encontrado no sistema.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      if (!profile.securityquestion || !profile.securityanswer) {
        toast({
          title: 'Recuperação não disponível',
          description: 'Este usuário não configurou uma pergunta de segurança.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      setSecurityQuestion(profile.securityquestion);
      setCorrectAnswer(profile.securityanswer.toLowerCase().trim());
      
      // Gerar opções de resposta aleatórias incluindo a correta
      const options = generateMultipleChoices(profile.securityanswer);
      setAnswerOptions(options);
      setUserId(profile.id);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao buscar pergunta de segurança:', error);
      setIsLoading(false);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao buscar seus dados. Tente novamente.',
        variant: 'destructive',
      });
    }
  };
  
  const handleRecoveryStart = () => {
    const email = recoveryForm.getValues('email');
    if (!email) {
      recoveryForm.setError('email', { 
        message: 'Informe seu e-mail para continuar' 
      });
      return;
    }
    
    fetchSecurityQuestion(email);
  };

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
                        {showResetForm ? 'Redefinir Senha' : 'Recuperação de Senha'}
                      </DialogTitle>
                      <DialogDescription>
                        {showResetForm 
                          ? 'Digite sua nova senha abaixo.' 
                          : 'Para recuperar sua senha, forneça seu e-mail e responda à pergunta de segurança.'}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {!showResetForm ? (
                      <Form {...recoveryForm}>
                        <form onSubmit={recoveryForm.handleSubmit(onSubmitRecovery)} className="space-y-4">
                          <FormField
                            control={recoveryForm.control}
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
                                {!securityQuestion && (
                                  <Button 
                                    type="button" 
                                    variant="outline"
                                    className="mt-2 w-full text-sm"
                                    onClick={handleRecoveryStart}
                                  >
                                    Buscar minha pergunta de segurança
                                  </Button>
                                )}
                              </FormItem>
                            )}
                          />
                          
                          {securityQuestion && (
                            <div className="space-y-4">
                              <div className="rounded-md border border-gray-200 p-4">
                                <h4 className="mb-2 font-medium">Pergunta de Segurança:</h4>
                                <p className="text-gray-700">{securityQuestion}</p>
                              </div>
                              
                              <FormField
                                control={recoveryForm.control}
                                name="securityAnswer"
                                render={({ field }) => (
                                  <FormItem className="space-y-3">
                                    <FormLabel>Selecione a resposta correta:</FormLabel>
                                    <FormControl>
                                      <RadioGroup 
                                        onValueChange={field.onChange} 
                                        value={field.value}
                                        className="space-y-2"
                                      >
                                        {answerOptions.map((option) => (
                                          <div key={option} className="flex items-center space-x-2">
                                            <RadioGroupItem value={option} id={option} />
                                            <label 
                                              htmlFor={option} 
                                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                              {option}
                                            </label>
                                          </div>
                                        ))}
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                          
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
                            {securityQuestion && (
                              <Button 
                                type="submit" 
                                className="bg-saldus-600 hover:bg-saldus-700"
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
                            )}
                          </DialogFooter>
                        </form>
                      </Form>
                    ) : (
                      <Form {...resetPasswordForm}>
                        <form onSubmit={resetPasswordForm.handleSubmit(onSubmitReset)} className="space-y-4">
                          <FormField
                            control={resetPasswordForm.control}
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
                            control={resetPasswordForm.control}
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
                              onClick={() => setShowResetForm(false)}
                            >
                              Voltar
                            </Button>
                            <Button 
                              type="submit" 
                              className="bg-saldus-600 hover:bg-saldus-700"
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
                        </form>
                      </Form>
                    )}
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
