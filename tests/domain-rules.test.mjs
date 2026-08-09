import test from "node:test";
import assert from "node:assert/strict";
import { intervalsOverlap, totalAppointmentMinutes } from "../src/lib/domain/schedule-core.mjs";
import { summarizeFinancialRecords } from "../src/lib/domain/finance-core.mjs";
import { matchesDemoEmail, shouldRestoreDemoSession } from "../src/lib/domain/demo-core.mjs";
import { canAccessByPolicy } from "../src/lib/domain/permission-core.mjs";

const validSections = ["dashboard", "agenda", "financeiro", "configuracoes", "comandas"];
const roleAccess = { recepcao: ["dashboard", "agenda", "comandas"], financeiro: ["dashboard", "financeiro", "comandas"] };

test("agenda soma serviços, intervalos e detecta conflitos sem bloquear horários adjacentes", () => {
  assert.equal(totalAppointmentMinutes([
    { duracao_minutos: 45, intervalo_minutos: 10 },
    { duracao_minutos: 35, intervalo_minutos: 5 },
  ], { includeIntervals: true }), 95);
  assert.equal(intervalsOverlap(540, 635, 600, 660), true);
  assert.equal(intervalsOverlap(540, 600, 600, 660), false);
});

test("financeiro exclui cancelados do previsto e mantém apenas recebimentos válidos", () => {
  const summary = summarizeFinancialRecords([
    { status: "confirmado", valor_final: 200, pagamentos: [{ status: "pago", valor: 80 }] },
    { status: "cancelado", valor_final: 300, pagamentos: [] },
    { status: "concluido", valor_final: 150, pagamentos: [{ status: "estornado", valor: 150 }] },
  ]);
  assert.deepEqual(summary, { expected: 350, received: 80, pending: 270 });
});

test("permissões respeitam papel e acesso personalizado", () => {
  const access = (role, section, membership = null) => canAccessByPolicy({ role, section, membership, validSections, roleAccess });
  assert.equal(access("owner", "configuracoes"), true);
  assert.equal(access("recepcao", "financeiro"), false);
  assert.equal(access("recepcao", "financeiro", { permissoes: { secoes: ["financeiro"] } }), true);
  assert.equal(access("recepcao", "agenda", { permissoes: { secoes: ["financeiro"] } }), false);
});

test("demo é identificada sem diferença de caixa e só restaura sessão autenticada", () => {
  assert.equal(matchesDemoEmail(" DEMO@BARBEARIA.LOCAL ", "demo@barbearia.local"), true);
  assert.equal(matchesDemoEmail("cliente@barbearia.local", "demo@barbearia.local"), false);
  assert.equal(shouldRestoreDemoSession({ demoClinic: true, authenticated: true }), true);
  assert.equal(shouldRestoreDemoSession({ demoClinic: true, authenticated: false }), false);
});
