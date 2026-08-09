"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

function text(formData, key) {
  return String(formData.get(key) || "").trim();
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createBarbershopAction(_prevState, formData) {
  const user = await getCurrentUser();

  if (!user) redirect("/login-cliente");

  const nome = text(formData, "nome");
  const email = text(formData, "email") || user.email;

  if (!nome) return { ok: false, message: "Informe o nome da barbearia." };

  const baseSlug = slugify(text(formData, "slug") || nome);
  const slug = baseSlug || `barbearia-${Date.now()}`;

  const { data: existing } = await supabaseAdmin
    .from("barbearias")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.id) {
    return { ok: false, message: "Este identificador já está em uso. Escolha outro." };
  }

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: barbearia, error: barbeariaError } = await supabaseAdmin
    .from("barbearias")
    .insert({
      nome,
      nome_fantasia: nome,
      slug,
      email,
      telefone: text(formData, "telefone") || null,
      whatsapp: text(formData, "telefone") || null,
      cidade: text(formData, "cidade") || null,
      estado: text(formData, "estado").toUpperCase() || null,
      documento: text(formData, "documento") || null,
      status: "trial",
      plano: "starter",
      site_publicado: false,
      metadata: {
        trial_ends_at: trialEndsAt,
        billing_email: email,
        assinatura_status: "trial",
      },
    })
    .select("id")
    .single();

  if (barbeariaError) {
    return { ok: false, message: barbeariaError.message || "Erro ao criar a barbearia." };
  }

  const { error: membershipError } = await supabaseAdmin
    .from("barbearia_usuarios")
    .insert({
      barbearia_id: barbearia.id,
      user_id: user.id,
      nome: user.user_metadata?.name || user.email || "Administrador",
      email: user.email,
      papel: "owner",
      ativo: true,
      aceito_em: new Date().toISOString(),
    });

  if (membershipError) {
    await supabaseAdmin.from("barbearias").delete().eq("id", barbearia.id);
    return { ok: false, message: membershipError.message || "Não foi possível vincular o proprietário à barbearia." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
