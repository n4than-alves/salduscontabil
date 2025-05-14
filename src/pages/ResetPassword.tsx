
import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  confirmPassword: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasResetToken, setHasResetToken] = useState(false);
  
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Check if we have a valid reset token in the URL
  useEffect(() => {
    const checkResetToken = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // If we have a user and reached this page, it's likely through a reset link
        if (user) {
          setHasResetToken(true);
        } else {
          // Check URL for access_token or hash parameters
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          
          if (accessToken) {
            setHasResetToken(true);
          } else {
            toast({
              title: 'Link inválido',
              description: 'Este link de redefinição de senha é inválido ou expirou.',
              variant: 'destructive',
            });
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error checking reset token:', error);
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao verificar o token de redefinição.',
          variant: 'destructive',
        });
        navigate('/login');
      }
    };

    checkResetToken();
  }, [navigate, toast]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      setIsLoading(true);
      
      // Update password using Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });
      
      if (error) {
        console.error('Error updating password:', error);
        toast({
          title: 'Erro ao redefinir senha',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Senha redefinida com sucesso',
          description: 'Sua senha foi alterada. Você já pode fazer login com sua nova senha.',
        });
        
        // Redirect to login page after successful password reset
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error in password reset:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao redefinir sua senha. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasResetToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-saldus-800">Saldus</CardTitle>
            <CardDescription>
              Verificando link de redefinição...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-saldus-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-saldus-800">Saldus</CardTitle>
          <CardDescription>
            Informe sua nova senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme a nova senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
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
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir senha'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Lembrou sua senha?{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto font-medium text-saldus-600 hover:text-saldus-500"
              onClick={() => navigate('/login')}
            >
              Voltar para o login
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
