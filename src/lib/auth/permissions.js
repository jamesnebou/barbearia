export const ROLE_LABELS = {
  owner: "Owner",
  gerente: "Admin",
  recepcao: "Recepção",
  financeiro: "Financeiro",
  barbeiro: "Barbeiro",
};

export const ACCESS_SECTION_LABELS = [
  ["dashboard", "Visão geral"],
  ["agenda", "Agenda"],
  ["notificacoes", "Notificações"],
  ["clientes", "Clientes"],
  ["crm", "CRM"],
  ["profissionais", "Barbeiros"],
  ["procedimentos", "Serviços"],
  ["produtos", "Lojinha"],
  ["pedidos", "Pedidos da lojinha"],
  ["comandas", "Comandas"],
  ["usuarios", "Usuários"],
  ["configuracoes", "Configurações"],
  ["financeiro", "Financeiro"],
  ["assinatura", "Assinatura"],
  ["tutoriais", "Tutoriais"],
];

export const ACCESS_SECTIONS = ACCESS_SECTION_LABELS.map(([section]) => section);

export const ROLE_ACCESS = {
  owner: ["dashboard", "agenda", "notificacoes", "clientes", "crm", "profissionais", "procedimentos", "produtos", "pedidos", "comandas", "usuarios", "configuracoes", "financeiro", "assinatura", "tutoriais"],
  gerente: ["dashboard", "agenda", "notificacoes", "clientes", "crm", "profissionais", "procedimentos", "produtos", "pedidos", "comandas", "usuarios", "configuracoes", "financeiro", "assinatura", "tutoriais"],
  recepcao: ["dashboard", "agenda", "notificacoes", "clientes", "crm", "profissionais", "procedimentos", "produtos", "pedidos", "comandas", "tutoriais"],
  financeiro: ["dashboard", "notificacoes", "clientes", "crm", "produtos", "pedidos", "comandas", "financeiro", "assinatura", "tutoriais"],
  barbeiro: ["dashboard", "agenda", "notificacoes", "clientes", "crm", "procedimentos", "comandas", "tutoriais"],
};

export function getCurrentMembership(memberships, clinicaId) {
  return (memberships || []).find((item) => item.barbearia_id === clinicaId) || memberships?.[0] || null;
}

export function getCustomAccessSections(membership) {
  return customSectionsFromMembership(membership, ACCESS_SECTIONS);
}

export function canAccessSection(role, section, membership = null) {
  return canAccessByPolicy({ role, section, membership, validSections: ACCESS_SECTIONS, roleAccess: ROLE_ACCESS });
}

export function assertSectionAccess(role, section, membership = null) {
  if (!canAccessSection(role, section, membership)) {
    const label = ROLE_LABELS[role] || "Usuário";
    throw new Error(`${label} não tem permissão para acessar esta área.`);
  }
}
import { canAccessByPolicy, customSectionsFromMembership } from "@/lib/domain/permission-core.mjs";
