import Link from "next/link";

export const metadata = { title: "Política de Privacidade | Clínica SaaS" };

const company = {
  productName: "Clínica SaaS - NexaWi",
  legalName: "NexaWi",
  document: "54.954.915/0001-65",
  contactEmail: "contato@nexawi.com.br",
  contactEmail: "contato@nexawi.com.br",
  whatsapp: "(77) 9 8865-6394",
};

const sections = [
  ["Controlador e operador", `${company.productName} atua como plataforma de apoio operacional para clinicas de estetica. A clinica contratante normalmente atua como controladora dos dados dos seus clientes, enquanto a plataforma pode atuar como operadora, conforme contrato e configuracao do servico.`],
  ["Dados tratados", "Podemos tratar dados cadastrais da clinica, usuarios autorizados, clientes, agendamentos, prontuario, anamnese, fotos de evolucao, pagamentos, logs operacionais e registros de consentimento."],
  ["Dados sensiveis", "Dados de saude, anamnese, alergias, contraindicacoes, fotos antes/depois e informacoes clinicas devem ser acessados apenas por usuarios autorizados pela clinica e usados exclusivamente para atendimento, acompanhamento, obrigacoes legais e defesa de direitos."],
  ["Finalidade", "Os dados sao utilizados para operar agenda, atendimento, relacionamento com clientes, controle financeiro, cumprimento de obrigacoes legais, suporte tecnico, seguranca e melhoria do servico."],
  ["Base legal", "O tratamento pode ocorrer por execucao de contrato, legitimo interesse, obrigacao legal e consentimento, especialmente para dados sensiveis, fotos, anamnese e termos de autorizacao."],
  ["Seguranca", "O sistema usa autenticacao, segregacao por clinica, controles de acesso por papel e armazenamento privado para fotos clinicas. Usuarios da clinica devem manter senhas protegidas e conceder acesso apenas a pessoas autorizadas."],
  ["Direitos dos titulares", "Clientes podem solicitar confirmacao de tratamento, acesso, correcao, exclusao, portabilidade, informacao sobre compartilhamento e revisao de consentimento diretamente a clinica responsavel pelos dados."],
  ["Retencao", "Os dados sao mantidos enquanto necessarios para a prestacao do servico, obrigacoes legais, defesa de direitos ou conforme orientacao da clinica controladora."],
];

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] px-5 py-10 text-neutral-950 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-3xl rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="text-sm font-semibold text-emerald-700">Voltar</Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">LGPD</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
        <p className="mt-4 text-sm leading-7 text-neutral-600">Este termo é uma versão inicial, podendo ser alterado a qualquer momento sem aviso prévio.</p>

        <section className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-7 text-neutral-700">
          <h2 className="font-semibold text-neutral-950">Empresa responsável pelo produto</h2>
          <p className="mt-2">Produto: {company.productName}</p>
          <p>Razão social: {company.legalName}</p>
          <p>CNPJ: {company.document}</p>
          <p>E-mail de privacidade: {company.contactEmail}</p>
          <p>E-mail comercial: {company.commercialEmail}</p>
          <p>WhatsApp comercial: {company.whatsapp}</p>
        </section>

        <div className="mt-8 space-y-6">
          {sections.map(([title, text]) => <section key={title}><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-7 text-neutral-600">{text}</p></section>)}
        </div>
        <p className="mt-8 rounded-lg bg-amber-50 p-4 text-sm leading-7 text-amber-900">Para mais informações, entre em contato com o suporte.</p>
      </section>
    </main>
  );
}
