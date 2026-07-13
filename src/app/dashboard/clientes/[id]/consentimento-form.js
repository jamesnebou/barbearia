"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/app-shell/ui";

const TERMOS = {
  atendimento: {
    titulo: "Termo de consentimento para serviço de barbearia",
    texto:
      "Declaro que recebi informações claras sobre o serviço escolhido, duração, valor, resultado esperado e cuidados recomendados. Autorizo a realização do atendimento pelo barbeiro selecionado.",
  },
  imagem: {
    titulo: "Termo de autorização de uso de imagem",
    texto:
      "Autorizo o registro e armazenamento de imagens de referência e do resultado do atendimento na ficha do cliente. Qualquer divulgação dependerá da autorização de marketing indicada neste cadastro.",
  },
  lgpd: {
    titulo: "Termo de consentimento LGPD",
    texto:
      "Autorizo o tratamento dos meus dados cadastrais, preferências, histórico de atendimentos e registros fotográficos autorizados para agendamento, prestação dos serviços, comunicação e cumprimento de obrigações legais.",
  },
  marketing: {
    titulo: "Autorização de comunicação e marketing",
    texto:
      "Autorizo o envio de lembretes, novidades, condições comerciais e campanhas da barbearia pelos canais informados no cadastro. Sei que posso solicitar o cancelamento dessa autorização a qualquer momento.",
  },
  outro: {
    titulo: "",
    texto: "",
  },
};

export function ConsentimentoForm({ action, clienteId, clienteNome }) {
  const [tipo, setTipo] = useState("atendimento");
  const [titulo, setTitulo] = useState(TERMOS.atendimento.titulo);
  const [texto, setTexto] = useState(TERMOS.atendimento.texto);

  function handleTipoChange(event) {
    const nextTipo = event.target.value;
    const modelo = TERMOS[nextTipo] || TERMOS.outro;
    setTipo(nextTipo);
    setTitulo(modelo.titulo);
    setTexto(modelo.texto);
  }

  return (
    <form action={action} className="mt-4 space-y-3 rounded-lg bg-white/70 p-3">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <label className="block">
        <span className="text-sm font-medium text-neutral-700">Tipo de termo</span>
        <select
          name="tipo"
          value={tipo}
          onChange={handleTipoChange}
          className="mt-2 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition focus:border-[var(--clinic-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--clinic-primary)_18%,transparent)]"
        >
          <option value="atendimento">Atendimento</option>
          <option value="imagem">Uso de imagem</option>
          <option value="lgpd">LGPD</option>
          <option value="marketing">Comunicação e marketing</option>
          <option value="outro">Outro</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-neutral-700">Título</span>
        <input
          className="mt-2 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-[var(--clinic-primary)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--clinic-primary)_12%,transparent)] focus:ring-0"
          name="titulo"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-neutral-700">Versão</span>
        <input
          className="mt-2 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-[var(--clinic-primary)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--clinic-primary)_12%,transparent)] focus:ring-0"
          name="versao"
          defaultValue="v1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-neutral-700">Texto do termo</span>
        <textarea
          className="mt-2 min-h-44 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm leading-6 outline-none transition placeholder:text-neutral-400 focus:border-[var(--clinic-primary)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--clinic-primary)_12%,transparent)] focus:ring-0"
          name="texto"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          placeholder={tipo === "outro" ? "Escreva o termo personalizado do zero." : ""}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-neutral-700">Aceito por</span>
        <input
          className="mt-2 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-[var(--clinic-primary)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--clinic-primary)_12%,transparent)] focus:ring-0"
          name="aceito_por_nome"
          defaultValue={clienteNome || ""}
        />
      </label>
      <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
        <input className="mt-1" name="aceito" type="checkbox" required />
        Confirmo que o cliente leu/foi informado e aceitou este termo.
      </label>
      <label className="block">
        <span className="text-sm font-medium text-neutral-700">Observações do aceite</span>
        <textarea
          className="mt-2 min-h-24 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-neutral-400 focus:border-[var(--clinic-primary)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--clinic-primary)_12%,transparent)] focus:ring-0"
          name="observacoes"
        />
      </label>
      <SubmitButton>Registrar aceite</SubmitButton>
    </form>
  );
}
