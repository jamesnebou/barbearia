"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

export async function createClinicAction(_prevState, formData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const nome = text(formData, "nome");
  const email = text(formData, "email") || user.email;

  if (!nome) {
    return { ok: false, message: "Informe o nome da clínica." };
  }

  const baseSlug = slugify(text(formData, "slug") || nome);
  const slug = baseSlug || `clinica-${Date.now()}`;

  const { data: existing } = await supabaseAdmin
    .from("clinicas")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.id) {
    return { ok: false, message: "Este identificador já está em uso. Escolha outro." };
  }

  const { data: clinica, error: clinicaError } = await supabaseAdmin
    .from("clinicas")
    .insert({
      nome,
      slug,
      email,
      telefone: text(formData, "telefone") || null,
      cidade: text(formData, "cidade") || null,
      estado: text(formData, "estado") || null,
      documento: text(formData, "documento") || null,
      status: "trial",
      plano: "starter",
      assinatura_status: "trial",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      billing_email: email,
    })
    .select("id")
    .single();

  if (clinicaError) {
    return { ok: false, message: clinicaError.message || "Erro ao criar clínica." };
  }

  const { error: membershipError } = await supabaseAdmin
    .from("usuarios_clinica")
    .insert({
      clinica_id: clinica.id,
      user_id: user.id,
      nome: user.user_metadata?.name || user.email || "Administrador",
      email: user.email,
      papel: "owner",
      ativo: true,
      accepted_at: new Date().toISOString(),
    });

  if (membershipError) {
    return { ok: false, message: membershipError.message || "Clínica criada, mas não foi possível vincular usuário." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
