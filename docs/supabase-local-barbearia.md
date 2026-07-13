# Supabase local — Barbearia

## Pré-requisitos

- Docker Desktop com o engine Linux/WSL 2 ativo.
- Node.js 20 ou superior.
- Supabase CLI instalada como dependência de desenvolvimento.

## Fluxo local

```cmd
cd /d "C:\Users\james\OneDrive\Documentos\NexaWi Sistemas\Barbearia"
npx supabase start
npx supabase db reset
npx supabase status
```

O Studio local fica normalmente em `http://127.0.0.1:54323`.

O site público da barbearia demo fica em:

```txt
http://localhost:3000/b/navalha-nobre-demo
```

Antes de iniciar o Next.js, copie a URL, a chave anon e a chave service role retornadas por `npx supabase status` para `.env.local`.

Nunca use `supabase db reset --linked` neste projeto sem revisão e autorização explícitas.
