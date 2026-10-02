-- Fecha o EXECUTE das quatro funções de 25/08 que nasceram abertas.
--
-- ## Como passaram
--
-- `funcoes-nao-nascem-publicas.test.ts` existe para que nenhuma função nova
-- fique em `/rest/v1/rpc/` sem alguém ter decidido. Só que o padrão dela
-- procurava `create function public.<nome>(`, e as quatro migrações de 25/08
-- escreveram `create function <nome>(`, sem o schema. O Postgres aceita (a
-- função cai no primeiro schema do `search_path`, que é `public`), e a guarda
-- não viu nenhuma. O padrão foi corrigido no mesmo commit desta migração, e
-- reprova as quatro sem ela.
--
-- O advisor de segurança do Supabase apontou em 02/10, e o ACL de produção
-- confirmava: as quatro com `=X` (PUBLIC), `anon=X` e `authenticated=X`.
--
-- ## O que estava exposto, uma a uma
--
-- `limpar_decisoes_expiradas` é a grave. É `security definer` e APAGA: com a
-- chave anônima, que está no JavaScript do site, qualquer visitante chamava com
-- `dias = 0` e apagava as decisões de triagem de todo edital já encerrado, sem
-- esperar os 30 dias de `retencao/decisoes.ts`. Quem precisa chamá-la é só
-- `scripts/limpar-decisoes.ts`, com a chave de serviço.
--
-- `contar_decisoes_expiradas` só conta, mas é `security definer` sobre uma
-- tabela que `anon` não lê. Mesmo chamador, mesma regra.
--
-- `recorte_respeita_o_limite` é função de trigger. Chamada por RPC o plpgsql
-- recusa, então o risco era nenhum; fecha pelo mesmo motivo de
-- `20260814120000`: `security definer` alcançável é hábito, não exceção. A
-- trigger continua disparando, porque o Postgres confere EXECUTE na criação da
-- trigger e não a cada disparo.
--
-- `salvar_recortes_da_empresa` é `security invoker` e a RLS de
-- `recortes_da_empresa` confere quem chama, então `anon` não conseguia gravar
-- nada. Mas ela é chamada pela tela de recortes com a sessão do usuário, e
-- `authenticated` precisa continuar podendo. Fica o par de sempre: revoga de
-- `public` e `anon`, concede a `authenticated`.
--
-- ## Por que `public, anon, authenticated` juntos
--
-- São concessões independentes (ver `20260814120000`): o Postgres dá EXECUTE
-- ao PUBLIC em toda função nova, e o Supabase dá nominalmente a `anon` e
-- `authenticated` por default privileges. Revogar uma deixa as outras de pé.
-- `service_role` tem concessão nominal própria, que nenhum destes revokes toca:
-- é ela que `limpar-decisoes.ts` usa.

revoke execute on function public.limpar_decisoes_expiradas(int, int) from public, anon, authenticated;
revoke execute on function public.contar_decisoes_expiradas(int) from public, anon, authenticated;
revoke execute on function public.recorte_respeita_o_limite() from public, anon, authenticated;

revoke execute on function public.salvar_recortes_da_empresa(uuid, jsonb) from public, anon;
grant execute on function public.salvar_recortes_da_empresa(uuid, jsonb) to authenticated;
