
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
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Lidar com requisições OPTIONS para CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função iniciada");

    // Obter chave secreta do Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY não está configurada");
    logStep("Chave Stripe verificada");

    // Inicializar cliente Supabase com a ANON key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

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
      throw new Error("Nenhuma conta Stripe encontrada para este usuário");
    }
    
    const customerId = customers.data[0].id;
    logStep("Cliente Stripe encontrado", { customerId });

    // Criar sessão do portal de cliente para gerenciar assinatura
    const origin = req.headers.get("origin") || "https://app.saldus.com.br";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });
    
    logStep("Sessão do portal de cliente criada", { 
      sessionId: portalSession.id, 
      url: portalSession.url 
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
