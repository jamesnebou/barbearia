# Checklist comercial antes da venda

## Dados legais

- Definir nome definitivo do produto.
- Definir razao social da empresa responsavel.
- Definir CNPJ.
- Definir e-mail oficial para suporte/comercial.
- Definir e-mail oficial para privacidade/LGPD.
- Revisar juridicamente Termos de Uso e Politica de Privacidade.

## Dominio e Vercel

- Comprar ou separar dominio proprio.
- Adicionar dominio no projeto da Vercel.
- Configurar DNS conforme Vercel:
  - apex/root com A record ou CNAME flattening conforme provedor;
  - www com CNAME para cname.vercel-dns.com.
- Definir dominio canonico, por exemplo www.produto.com.br.
- Testar HTTPS emitido automaticamente pela Vercel.
- Atualizar links publicos de privacidade, termos e login.

## Identidade

- Definir nome de produto que sera exibido na landing e login.
- Criar logo simples em SVG/PNG.
- Definir paleta principal e cor de destaque.
- Configurar remetente/e-mail profissional.
- Configurar WhatsApp comercial.

## SaaS e seguranca

- Aplicar migrations pendentes no Supabase.
- Validar que usuarios recepcao/financeiro nao acessam prontuario sensivel.
- Validar consentimentos no fluxo real de atendimento.
- Validar upload e exclusao de fotos antes/depois.
- Validar backup/exportacao ou politica de retencao antes de operar clientes reais.

## Pendencias juridicas minimas

- Contrato de prestacao do SaaS.
- DPA/termo de operador de dados, se aplicavel.
- Politica de privacidade revisada.
- Termos de uso revisados.
- Modelo de termo de consentimento para clinicas adaptarem aos procedimentos.
