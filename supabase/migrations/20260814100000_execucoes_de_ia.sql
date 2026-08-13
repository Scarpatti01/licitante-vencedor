-- Toda chamada de modelo que o sistema faz, com o que ela custou.
--
-- Existe por uma razão só: neste produto o custo variável é token, e um erro de
-- prompt que dobre o consumo não aparece em nenhum lugar até a fatura chegar.
-- Sem esta tabela, "quanto custa analisar um edital" e "qual cliente consome
-- mais do que paga" são perguntas sem resposta — e as duas decidem preço.

create table public.execucoes_de_ia (
  id uuid primary key default gen_random_uuid(),
  finalidade public.finalidade_da_ia not null,

  -- Nulos são normais e significativos: análise de edital não pertence a
  -- empresa nenhuma (é compartilhada), triagem pertence. SET NULL nos dois
  -- porque apagar cliente ou edital não pode apagar o gasto já realizado —
  -- contabilidade não se apaga junto com o cadastro.
  empresa_id uuid references public.empresas (id) on delete set null,
  edital_id uuid references public.editais (id) on delete set null,

  modelo text not null,
  versao_do_prompt text,

  tokens_de_entrada integer check (tokens_de_entrada >= 0),
  tokens_de_saida integer check (tokens_de_saida >= 0),
  -- Cache de prompt muda a conta em uma ordem de grandeza e é registrado à
  -- parte: sem separar, uma queda de custo por cache passaria por queda de uso.
  tokens_em_cache integer check (tokens_em_cache >= 0),

  -- Estimado a partir da tabela de preços do fornecedor no momento da chamada.
  -- Centavos inteiros pela mesma razão de `planos`; "estimado" no nome porque a
  -- fatura real só fecha no fim do mês e não vale fingir precisão que não há.
  custo_em_centavos integer check (custo_em_centavos >= 0),
  duracao_em_ms integer check (duracao_em_ms >= 0),

  sucesso boolean not null,
  -- O resultado, quando guardá-lo evita repetir a chamada. Não é o lugar da
  -- análise (essa mora em `analises_de_edital`) — é depuração.
  resultado jsonb,
  erro text,

  criado_em timestamptz not null default now(),

  -- Falha sem mensagem é uma linha que só diz "algo deu errado", e a próxima
  -- pessoa a investigar não terá o log da execução.
  constraint falha_tem_mensagem check (sucesso or erro is not null)
);

comment on table public.execucoes_de_ia is
  'Uma linha por chamada de modelo. É o custo variável do produto medido, não estimado por planilha.';

-- Painel de custo: por dia, por cliente, por modelo. As três são varreduras de
-- período, então todas começam por tempo.
create index execucoes_de_ia_por_data on public.execucoes_de_ia (criado_em desc);
create index execucoes_de_ia_por_empresa
  on public.execucoes_de_ia (empresa_id, criado_em desc)
  where empresa_id is not null;
create index execucoes_de_ia_por_modelo on public.execucoes_de_ia (modelo, criado_em desc);
-- Investigar falha é sempre "as últimas que quebraram", nunca a tabela toda.
create index execucoes_de_ia_falhas
  on public.execucoes_de_ia (criado_em desc)
  where not sucesso;
create index execucoes_de_ia_por_edital
  on public.execucoes_de_ia (edital_id)
  where edital_id is not null;

alter table public.execucoes_de_ia enable row level security;

revoke all on table public.execucoes_de_ia from anon;
revoke insert, update, delete on table public.execucoes_de_ia from authenticated;
grant select on table public.execucoes_de_ia to authenticated;

-- O cliente vê o que foi gasto por conta dele — é o que sustenta a conversa
-- sobre limite de plano. Operador não: consumo é assunto de contrato.
-- Linhas sem `empresa_id` (análise compartilhada, coleta) não são de ninguém e
-- não aparecem para nenhum usuário; só `service_role` as lê.
create policy "administracao le o consumo de ia"
  on public.execucoes_de_ia for select to authenticated
  using (
    empresa_id is not null
    and public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[])
  );
