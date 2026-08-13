-- Fecha o buraco que a RLS não cobre: TRUNCATE.
--
-- O Supabase concede ALL nas tabelas novas de `public` para `anon` e
-- `authenticated` por default privileges, e ALL inclui TRUNCATE — que NÃO passa
-- por row level security. Uma policy perfeita em todas as tabelas não
-- impediria `truncate oportunidades`. Hoje isso não é alcançável pela API
-- (PostgREST não expõe TRUNCATE), o que torna a revogação barata e a exposição
-- futura, cara: basta um caminho novo com esses papéis para o problema existir.
--
-- TRIGGER e REFERENCES vão junto pelo mesmo motivo: são privilégios de DDL que
-- nenhum papel de aplicação usa, e que permitem amarrar objeto próprio a tabela
-- alheia.

revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- E para as tabelas que ainda não existem. Vale para o que for criado pelo
-- papel que aplica as migrações — que é o mesmo que criou tudo aqui. Uma
-- migração futura que crie tabela em `public` já nasce sem esses privilégios;
-- se algum dia uma delas precisar de TRIGGER para `authenticated`, o grant tem
-- de ser explícito, que é exatamente o ponto.
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;

-- `anon` não tem papel nenhum neste produto depois do login: todo dado de
-- cliente exige sessão. A varredura abaixo é a garantia de que nenhuma tabela
-- ficou com privilégio residual por esquecimento em alguma migração.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
