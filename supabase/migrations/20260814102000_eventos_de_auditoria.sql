-- Quem acessou ou alterou o quê.
--
-- Duas obrigações diferentes caem na mesma tabela:
--
--   LGPD — dado de empresa cliente e de pessoa física do quadro dela circula
--   aqui. Ser capaz de responder "quem viu isto e quando" é requisito, não
--   funcionalidade.
--
--   Confiança — a pergunta "por que este edital não apareceu para minha
--   empresa?" é respondida por `decisoes_de_triagem`; esta tabela responde a
--   irmã dela, "quem mexeu no meu perfil no dia em que os resultados mudaram".
--   Sem as duas, a resposta do suporte é "não sei", e o cliente cancela.

create table public.eventos_de_auditoria (
  -- Como na fila: escrita frequente, id que não sai daqui, então `identity`
  -- em vez de uuid.
  id bigint generated always as identity primary key,
  ocorrido_em timestamptz not null default now(),

  -- SET NULL nos dois: apagar cliente ou usuário não pode apagar o registro de
  -- que algo aconteceu. É exatamente o oposto do que a LGPD pede para dado
  -- pessoal — o fato fica, a identificação sai.
  empresa_id uuid references public.empresas (id) on delete set null,
  usuario_id uuid references auth.users (id) on delete set null,

  acao public.tipo_de_evento not null,
  -- Nome da tabela ou do recurso lógico ('oportunidades', 'relatorio_mensal').
  -- Texto e não enum: auditoria tem de conseguir registrar o que ainda não
  -- existe no schema, senão a primeira coisa esquecida é justamente auditar
  -- o recurso novo.
  recurso text not null check (length(btrim(recurso)) > 0),
  recurso_id text,

  detalhes jsonb not null default '{}'::jsonb check (jsonb_typeof(detalhes) = 'object'),
  -- `inet` e não texto: o tipo valida o formato e permite consulta por faixa,
  -- que é como se investiga acesso suspeito.
  endereco_ip inet,
  agente text
);

comment on table public.eventos_de_auditoria is
  'Trilha de auditoria. Append-only: sem policy de UPDATE ou DELETE para ninguém, nem para dono da empresa.';

-- "O que aconteceu na minha conta" e "quem tocou neste registro" — as duas
-- perguntas reais, ambas recentes-primeiro.
create index eventos_por_empresa on public.eventos_de_auditoria (empresa_id, ocorrido_em desc);
create index eventos_por_recurso on public.eventos_de_auditoria (recurso, recurso_id, ocorrido_em desc);
create index eventos_por_usuario
  on public.eventos_de_auditoria (usuario_id, ocorrido_em desc)
  where usuario_id is not null;

alter table public.eventos_de_auditoria enable row level security;

revoke all on table public.eventos_de_auditoria from anon;
revoke insert, update, delete on table public.eventos_de_auditoria from authenticated;
grant select on table public.eventos_de_auditoria to authenticated;

-- Só quem responde pela empresa lê a trilha: operador ver tudo que os colegas
-- fizeram é vigilância, não auditoria.
-- Não há policy de INSERT nem para `authenticated`: se o cliente pudesse
-- escrever na trilha, ela deixaria de ser prova. Quem grava é o servidor, com
-- `service_role`. Não há policy de UPDATE nem de DELETE para papel nenhum —
-- trilha que se edita não é trilha.
create policy "administracao le a auditoria"
  on public.eventos_de_auditoria for select to authenticated
  using (
    empresa_id is not null
    and public.usuario_tem_papel(empresa_id, array['dono', 'administrador']::public.papel_na_empresa[])
  );
