
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

interface SubscriptionCardProps {
  className?: string;
}

export function SubscriptionCard({ className }: SubscriptionCardProps) {
  const { 
    subscribed, 
    planType, 
    planExpiryDate, 
    isLoading,
    createCheckoutSession,
    openCustomerPortal
  } = useSubscription();

  // Formatar data de expiração
  const formattedExpiryDate = planExpiryDate
    ? new Date(planExpiryDate).toLocaleDateString('pt-BR')
    : null;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Plano de Assinatura</CardTitle>
        <CardDescription>
          {planType === 'pro' 
            ? 'Você tem acesso a todos os recursos premium' 
            : 'Atualize para o plano Pro e tenha acesso a recursos exclusivos'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-saldus-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className={cn(
                "rounded-lg border p-4 transition-all",
                planType === 'free' 
                  ? "bg-white border-gray-200" 
                  : "bg-gray-100 border-gray-200 opacity-60"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Plano Gratuito</h3>
                  {planType === 'free' && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                      Atual
                    </span>
                  )}
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>5 transações por semana</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Recursos básicos</span>
                  </li>
                </ul>
                <p className="text-sm font-medium">Gratuito</p>
              </div>

              <div className={cn(
                "rounded-lg border p-4 transition-all",
                planType === 'pro' 
                  ? "bg-white border-2 border-saldus-500 shadow-sm" 
                  : "bg-white border-gray-200"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Plano Pro</h3>
                  {planType === 'pro' && (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      Ativo
                    </span>
                  )}
                </div>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Transações ilimitadas</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Suporte prioritário</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Clientes ilimitados</span>
                  </li>
                </ul>
                <p className="text-sm font-medium">R$40,00/mês</p>
                {formattedExpiryDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Próxima cobrança: {formattedExpiryDate}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        {isLoading ? (
          <Button disabled className="w-full">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando...
          </Button>
        ) : (
          <>
            {subscribed ? (
              <Button onClick={openCustomerPortal} className="w-full">
                Gerenciar Assinatura
              </Button>
            ) : (
              <Button onClick={createCheckoutSession} className="w-full bg-saldus-600 hover:bg-saldus-700">
                Assinar Plano Pro
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
