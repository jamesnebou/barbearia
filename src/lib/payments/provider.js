import { isAsaasConfigured } from "@/lib/asaas/client";
import { isInfinitePayConfigured } from "@/lib/infinitepay/client";

export function resolveBarbershopPaymentProvider(integration = {}) {
  const selected = String(integration?.pagamento_gateway || "").toLowerCase();
  if (selected === "infinitepay") return isInfinitePayConfigured(integration) ? "infinitepay" : null;
  if (selected === "asaas") return isAsaasConfigured(integration) ? "asaas" : null;
  if (isAsaasConfigured(integration)) return "asaas";
  if (isInfinitePayConfigured(integration)) return "infinitepay";
  return null;
}

export function paymentProviderLabel(provider) {
  if (provider === "infinitepay") return "InfinitePay";
  if (provider === "asaas") return "Asaas";
  return "Pagamento online";
}
