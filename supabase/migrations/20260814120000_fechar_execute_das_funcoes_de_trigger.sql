-- Tira do `PUBLIC` o EXECUTE das quatro funções de trigger.
--
-- Encontrado ao aplicar o schema num Postgres de verdade pela primeira vez: o
-- advisor do Supabase apontou que `aplicar_acao_na_oportunidade()` — que é
-- `security definer` — estava exposta em `/rest/v1/rpc/` para `anon` e para
-- `authenticated`.
--
-- São DUAS concessões diferentes, e revogar uma só não resolve — descoberto na
-- prática, revogando a primeira e vendo o aviso continuar de pé:
--
--   1. O Postgres concede EXECUTE ao pseudo-papel `PUBLIC` em toda função nova.
--      `anon` herda dele, e por isso `revoke all on all functions ... from anon`
--      (migração `20260814104000`) não adiantou nada: revogar do papel nominal
--      deixa a concessão herdada intacta.
--   2. O Supabase, por default privileges do projeto, concede EXECUTE
--      diretamente a `anon` e `authenticated` nas funções criadas em `public`.
--      Essa é nominal e sobrevive ao revoke do `PUBLIC`.
--
-- É por isso que as funções de autorização (`empresas_do_usuario` e as duas
-- irmãs) revogam explicitamente `from public` antes de conceder. Estas quatro
-- nasceram sem esse par e ninguém notou, porque SQL que nunca rodou não tem
-- como reclamar.
--
-- As três funções de autorização continuam concedidas a `authenticated`, e isso
-- não é descuido: a avaliação de policy exige EXECUTE do papel que consulta.
-- Ficam alcançáveis por RPC, e o que elas respondem é "de quais empresas EU
-- sou membro" — a própria informação que o chamador já tem.
--
-- **O risco real era pequeno, e o motivo de fechar mesmo assim não é teórico.**
-- Chamar uma função de trigger por RPC falha: o plpgsql recusa execução fora de
-- contexto de trigger, e as três `invoker` ainda seriam barradas pelos
-- privilégios de quem chama. O que não sobrevive a essa análise é o hábito de
-- deixar `security definer` alcançável e confiar que a camada seguinte segura.
-- `aplicar_acao_na_oportunidade` roda como dona da tabela justamente porque
-- `authenticated` não tem UPDATE em `oportunidades`; uma função assim precisa
-- ser inalcançável por porta que não seja a trigger.
--
-- Não há `grant` depois do `revoke`, e a ausência é intencional: quem executa
-- função de trigger é o próprio Postgres, ao disparar a trigger, com os
-- privilégios do dono do objeto. Nenhum papel de aplicação precisa chamá-las.

-- Revogar de `public` NÃO cobre `anon` e `authenticated` aqui, pelo motivo 2
-- acima. Os três papéis vão juntos, e a trigger continua disparando: o Postgres
-- confere EXECUTE na criação da trigger, não a cada disparo.
revoke execute on function public.marcar_atualizacao() from public, anon, authenticated;
revoke execute on function public.preencher_prazo_da_oportunidade() from public, anon, authenticated;
revoke execute on function public.sincronizar_prazo_das_oportunidades() from public, anon, authenticated;
revoke execute on function public.aplicar_acao_na_oportunidade() from public, anon, authenticated;
