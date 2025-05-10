
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para logar cada etapa do processo
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Lidar com requisições OPTIONS para CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Usar a service_role key para realizar escritas no banco de dados
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Função iniciada");

    // Obter chave secreta do Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não está configurada");
    logStep("Chave Stripe verificada");

    // Autenticar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Cabeçalho de autorização não fornecido");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Erro de autenticação: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("Usuário não autenticado ou email não disponível");
    logStep("Usuário autenticado", { userId: user.id, email: user.email });

    // Inicializar Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Verificar se o cliente existe no Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("Nenhum cliente Stripe encontrado");
      
      // Atualizar o perfil com status não assinante
      await supabaseClient.from("profiles").update({
        plantype: 'free',
        planstartdate: null,
        planexpirydate: null,
        updated_at: new Date().toISOString()
      }).eq("id", user.id);
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        planType: 'free',
        planExpiryDate: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Cliente Stripe encontrado", { customerId });

    // Buscar assinaturas ativas do usuário
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let planExpiryDate = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      planExpiryDate = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Assinatura ativa encontrada", { 
        subscriptionId: subscription.id, 
        endDate: planExpiryDate 
      });
      
      // Atualizar o perfil com o status de assinante
      await supabaseClient.from("profiles").update({
        plantype: 'pro',
        planstartdate: new Date(subscription.start_date * 1000).toISOString(),
        planexpirydate: planExpiryDate,
        updated_at: new Date().toISOString()
      }).eq("id", user.id);

      return new Response(JSON.stringify({
        subscribed: true,
        planType: 'pro',
        planExpiryDate
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("Nenhuma assinatura ativa encontrada");
      
      // Atualizar o perfil com status não assinante
      await supabaseClient.from("profiles").update({
        plantype: 'free',
        planexpirydate: null,
        updated_at: new Date().toISOString()
      }).eq("id", user.id);
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        planType: 'free',
        planExpiryDate: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
