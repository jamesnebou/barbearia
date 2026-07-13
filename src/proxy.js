import { NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|auth|dashboard|admin|login|login-cliente|onboarding|privacidade|termos).*)"],
};

function isPlatformHost(host) {
  const value = String(host || "").toLowerCase().split(":")[0];
  if (!value) return true;
  if (value === "localhost" || value === "127.0.0.1") return true;
  if (value.endsWith(".vercel.app")) return true;
  const configured = String(process.env.APP_PRIMARY_HOSTS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(value);
}

function domainContext(host) {
  const domain = String(host || "").toLowerCase().split(":")[0];
  const withoutWww = domain.replace(/^www\./, "");
  const candidates = Array.from(new Set([domain, withoutWww, `www.${withoutWww}`].filter(Boolean)));
  const encodedCandidates = candidates.map((item) => `"${item.replaceAll('"', '\\"')}"`).join(",");
  return { domain, encodedCandidates };
}

async function querySupabase(path, serviceRoleKey) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !serviceRoleKey) return [];

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return [];
  return response.json().catch(() => []);
}

function preferredDomainRow(rows, domain) {
  return rows.find((item) => item.dominio === domain)
    || rows.find((item) => ["ativo", "verificado"].includes(item.status))
    || rows[0]
    || null;
}

async function findBarbershopByDomain({ domain, encodedCandidates, serviceRoleKey }) {
  const rows = await querySupabase(
    `barbearia_dominios?dominio=in.(${encodedCandidates})&status=in.(ativo,verificado,pendente)&select=dominio,status,barbearias(slug,status,site_publicado)`,
    serviceRoleKey,
  );
  const eligible = rows.filter((item) =>
    item.barbearias?.site_publicado === true
    && ["trial", "ativa"].includes(item.barbearias?.status),
  );
  return preferredDomainRow(eligible, domain)?.barbearias?.slug || null;
}

async function findClinicByDomain({ domain, encodedCandidates, serviceRoleKey }) {
  const rows = await querySupabase(
    `barbearia_dominios?dominio=in.(${encodedCandidates})&status=in.(ativo,verificado,pendente)&select=dominio,status,barbearias(slug)`,
    serviceRoleKey,
  );
  return preferredDomainRow(rows, domain)?.barbearias?.slug || null;
}

async function findPublicSiteByDomain(host) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const context = domainContext(host);
  if (!serviceRoleKey || !context.domain) return null;

  const barbershopSlug = await findBarbershopByDomain({ ...context, serviceRoleKey });
  if (barbershopSlug) return { type: "barbershop", slug: barbershopSlug };

  const clinicSlug = await findClinicByDomain({ ...context, serviceRoleKey });
  return clinicSlug ? { type: "clinic", slug: clinicSlug } : null;
}

export async function proxy(request) {
  const host = request.headers.get("host") || "";

  if (isPlatformHost(host)) {
    return NextResponse.next();
  }

  const site = await findPublicSiteByDomain(host);
  if (!site) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = site.type === "barbershop" ? `/b/${site.slug}` : `/c/${site.slug}`;
  return NextResponse.rewrite(url);
}
