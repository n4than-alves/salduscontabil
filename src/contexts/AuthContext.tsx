import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, cleanupAuthState } from '../lib/supabase';
import { User, SupabaseProfile } from '../types';
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
                const profileData = profile as SupabaseProfile;
                setUser({
                  id: session.user.id,
                  email: session.user.email!,
                  created_at: session.user.created_at,
                  fullName: profileData.fullname || '',
                  phone: profileData.phone || null,
                  planType: (profileData.plantype as 'free' | 'pro') || 'free',
                  planStartDate: profileData.planstartdate || null,
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
            const profileData = profile as SupabaseProfile;
            setUser({
              id: session.user.id,
              email: session.user.email!,
              created_at: session.user.created_at,
              fullName: profileData.fullname || '',
              phone: profileData.phone || null,
              planType: (profileData.plantype as 'free' | 'pro') || 'free',
              planStartDate: profileData.planstartdate || null,
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
          fullname: fullName,
          plantype: 'free',
          planstartdate: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          throw profileError;
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
      
      // Converter os nomes dos campos para o formato do banco de dados
      const updateData: Record<string, any> = {};
      
      if (data.fullName !== undefined) {
        updateData.fullname = data.fullName;
      }
      
      if (data.phone !== undefined) {
        updateData.phone = data.phone;
      }
      
      if (data.planType !== undefined) {
        updateData.plantype = data.planType;
      }
      
      if (data.planStartDate !== undefined) {
        updateData.planstartdate = data.planStartDate;
      }
      
      try {
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);

        if (error) throw error;
        
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
