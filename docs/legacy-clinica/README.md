# Arquivo legado de clínica

Esta pasta preserva as migrations e o seed do produto anterior de clínicas.

Os arquivos foram retirados de `supabase/migrations` e `supabase/seeds` para que o ambiente local da Barbearia seja reconstruído somente com entidades `barbearia_*`.

## Regras

- Não mover estes arquivos de volta para `supabase/migrations` no produto Barbearia.
- Não executar o seed legado no banco da Barbearia.
- Não apagar este arquivo histórico sem revisão explícita.
- Novas mudanças de banco da Barbearia devem ser migrations incrementais em `supabase/migrations`.

Data do arquivamento: 10 de julho de 2026.
