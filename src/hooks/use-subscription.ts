
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

export type SubscriptionStatus = {
  subscribed: boolean;
  planType: 'free' | 'pro';
  planExpiryDate: string | null;
  isLoading: boolean;
  error: string | null;
};

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    planType: 'free',
    planExpiryDate: null,
    isLoading: true,
    error: null
  });

  const checkSubscription = async () => {
    if (!user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        throw new Error(error.message);
      }
      
      console.log('Subscription data received:', data);
      
      setStatus({
        subscribed: data.subscribed,
        planType: data.planType,
        planExpiryDate: data.planExpiryDate,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error('Erro ao verificar assinatura:', err);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido ao verificar assinatura'
      }));
    }
  };

  const createCheckoutSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err) {
      console.error('Erro ao criar sessão de checkout:', err);
      toast({
        title: 'Erro ao iniciar checkout',
        description: err instanceof Error ? err.message : 'Não foi possível iniciar o processo de pagamento',
        variant: 'destructive'
      });
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL do portal não retornada');
      }
    } catch (err) {
      console.error('Erro ao abrir portal do cliente:', err);
      toast({
        title: 'Erro ao abrir portal de gerenciamento',
        description: err instanceof Error ? err.message : 'Não foi possível abrir o portal de gerenciamento',
        variant: 'destructive'
      });
    }
  };

  // Add polling to regularly check subscription status
  useEffect(() => {
    const checkAndUpdateStatus = async () => {
      await checkSubscription();
    };
    
    // Check immediately on mount
    if (user) {
      checkAndUpdateStatus();
    } else {
      setStatus({
        subscribed: false,
        planType: 'free',
        planExpiryDate: null,
        isLoading: false,
        error: null
      });
    }
    
    // Set up polling every 30 seconds
    const intervalId = setInterval(() => {
      if (user) {
        checkAndUpdateStatus();
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(intervalId);
  }, [user]);

  // Verificar parâmetros na URL após retorno do checkout
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const checkoutStatus = queryParams.get('checkout');
    
    if (checkoutStatus === 'success') {
      toast({
        title: 'Pagamento processado com sucesso!',
        description: 'Sua assinatura está sendo ativada. Aguarde alguns instantes.',
      });
      
      // Remover query param da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Verificar status da assinatura após um curto delay
      setTimeout(() => {
        checkSubscription();
      }, 2000);
    } else if (checkoutStatus === 'cancelled') {
      toast({
        title: 'Checkout cancelado',
        description: 'Você cancelou o processo de checkout.',
      });
      
      // Remover query param da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  return {
    ...status,
    checkSubscription,
    createCheckoutSession,
    openCustomerPortal,
  };
};
