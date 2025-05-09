
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, cleanupAuthState } from '../lib/supabase';
import { User } from '../types';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Configurar listener de mudança de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Usar setTimeout para prevenir deadlocks
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (profile) {
                setUser({
                  id: session.user.id,
                  email: session.user.email!,
                  created_at: session.user.created_at,
                  fullName: profile.fullName,
                  phone: profile.phone,
                  planType: profile.planType as "free" | "pro",
                  planStartDate: profile.planStartDate,
                });
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
            }
          }, 0);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Verificar sessão atual
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              created_at: session.user.created_at,
              fullName: profile.fullName,
              phone: profile.phone,
              planType: profile.planType as "free" | "pro",
              planStartDate: profile.planStartDate,
            });
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      // Limpar estado de auth anterior
      cleanupAuthState();
      
      // Tentar logout global para evitar conflitos
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continuar mesmo se falhar
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName, // Salva nos metadados
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Criar perfil para novo usuário
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          fullName,
          planType: 'free',
          planStartDate: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          if (profileError.message.includes('fullName')) {
            // Tentar com "fullname" minúsculo
            const { error: retryError } = await supabase.from('profiles').insert({
              id: data.user.id,
              email,
              fullname: fullName, // Tentar com "fullname" minúsculo
              planType: 'free',
              planStartDate: new Date().toISOString(),
            });
            
            if (retryError) throw retryError;
          } else {
            throw profileError;
          }
        }

        toast({
          title: 'Conta criada com sucesso',
          description: 'Bem-vindo ao Saldus!',
        });
        
        // Recarregar a página para garantir estado limpo
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      // Limpar estado de auth anterior
      cleanupAuthState();
      
      // Tentar logout global para evitar conflitos
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continuar mesmo se falhar
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Login realizado com sucesso',
        description: 'Bem-vindo de volta!',
      });
      
      // Recarregar a página para garantir estado limpo
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer login',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      // Limpar estado de auth primeiro
      cleanupAuthState();
      
      await supabase.auth.signOut();
      setUser(null);
      
      toast({
        title: 'Logout realizado com sucesso',
      });
      
      // Recarregar a página para garantir estado limpo
      window.location.href = '/login';
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer logout',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      
      setLoading(true);
      
      // Verificar caso o campo seja fullName ou fullname
      const updateData = { ...data };
      
      try {
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);

        if (error) {
          // Se o erro for relacionado ao campo fullName, tentar com fullname
          if (error.message.includes('fullName') && 'fullName' in updateData) {
            const { fullName, ...rest } = updateData;
            const alternativeUpdate = {
              ...rest,
              fullname: fullName // Tentar com fullname minúsculo
            };
            
            const { error: retryError } = await supabase
              .from('profiles')
              .update(alternativeUpdate)
              .eq('id', user.id);
              
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }
      } catch (e: any) {
        // Se ainda falhar, tentar um approach alternativo checando o schema primeiro
        const { data: columns } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);
          
        const columnExists = columns && columns.length > 0 
          ? Object.keys(columns[0]).some(col => col.toLowerCase() === 'fullname')
          : false;
        
        const fieldName = columnExists ? 'fullname' : 'fullName';
        const { fullName, ...rest } = updateData;
        
        const finalUpdate = {
          ...rest,
          [fieldName]: fullName // Usar o campo correto baseado na verificação
        };
        
        const { error } = await supabase
          .from('profiles')
          .update(finalUpdate)
          .eq('id', user.id);
          
        if (error) throw error;
      }

      setUser({ ...user, ...data });
      toast({
        title: 'Perfil atualizado com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
