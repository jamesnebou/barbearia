import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptBarbeariaSecrets } from "@/lib/security/barbearia-secrets";
import { isAsaasConfigured } from "@/lib/asaas/client";
import { getStoreConfig } from "@/lib/store/config";
import { StoreCheckout } from "./checkout-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: `Checkout | ${slug}` };
}

export default async function StoreCheckoutPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const { data: clinic, error } = await supabaseAdmin
    .from("barbearias")
    .select("id, nome, slug, status, metadata")
    .eq("slug", slug)
    .in("status", ["trial", "ativa"])
    .maybeSingle();
  if (error) throw error;
  if (!clinic || clinic.metadata?.site_publico?.publicado === false || clinic.metadata?.site_publico?.lojinha_ativa === false) notFound();

  const { data: integration } = await supabaseAdmin
    .from("barbearia_integracoes")
    .select("barbearia_id, ativo, configuracao_publica, segredos_criptografados")
    .eq("barbearia_id", clinic.id)
    .eq("provedor", "asaas")
    .eq("ativo", true)
    .maybeSingle();
  const secrets = integration ? decryptBarbeariaSecrets(integration.segredos_criptografados) : {};
  const asaasConfig = integration ? { barbearia_id: clinic.id, asaas_ativo: integration.ativo, baseUrl: integration.configuracao_publica?.baseUrl, apiKey: secrets.apiKey } : { barbearia_id: clinic.id };
  const site = clinic.metadata?.site_publico || {};
  const primary = clinic.metadata?.primary_color || "#2e3a2d";
  const accent = clinic.metadata?.accent_color || "#d99bae";

  return (
    <div style={{ "--clinic-primary": primary, "--clinic-accent": accent }}>
      <StoreCheckout
        slug={slug}
        brandName={clinic.metadata?.brand_name || clinic.nome}
        config={getStoreConfig(site)}
        onlinePaymentAvailable={getStoreConfig(site).checkoutAsaasAtivo && isAsaasConfigured(asaasConfig)}
        cartToken={query?.cart || ""}
        query={query || {}}
      />
    </div>
  );
}
