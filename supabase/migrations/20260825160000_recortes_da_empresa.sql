-- O recorte: uma abrangência geográfica com filtro próprio, e no máximo três.
--
-- ## Por que uma tabela nova em vez de mais colunas no perfil
--
-- Hoje a geografia mora em `perfis_da_empresa.ufs_atendidas` e
-- `municipios_prioritarios`, dois arrays soltos, e o resto do filtro (palavras,
-- ticket) vale para tudo ao mesmo tempo. Isso impede o caso mais comum: "na
-- minha cidade eu quero tudo; no resto do estado só obra grande". Array não
-- carrega filtro por item.
--
-- E impede a conta do plano barato. A triagem grava uma linha em
-- `decisoes_de_triagem` para TODO edital avaliado, inclusive descartado — é
-- assim que o produto responde "por que este edital não apareceu para mim?".
-- Medido em 25/08: 623 bytes por linha com índice. Sem limite de abrangência,
-- quem marca o Brasil manda avaliar 2.725 editais por dia, o que dá quase 1
-- milhão de linhas e uns 646 MB por ano. Para um cliente de R$ 59.
--
-- ## O perfil continua existindo, e isto NÃO o substitui
--
-- `perfis_da_empresa` segue sendo quem a empresa é: CNAE, porte, atestados,
-- documentos. O recorte é onde ela quer procurar. Misturar os dois faria a
-- empresa reescrever quem ela é toda vez que muda de cidade.

create type abrangencia_do_recorte as enum ('municipio', 'uf', 'brasil');

create table if not exists recortes_da_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,

  -- O nome que a própria empresa deu. É o que ela lê no assunto do e-mail, e
  -- por isso não pode ser vazio nem gerado por nós.
  nome text not null check (length(btrim(nome)) between 1 and 60),

  abrangencia abrangencia_do_recorte not null,

  -- `uf` e `municipio_ibge` são nulos conforme a abrangência, e a trava abaixo
  -- é o que impede o estado impossível de "município sem município".
  uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  municipio_ibge text check (municipio_ibge is null or municipio_ibge ~ '^\d{7}$'),
  municipio_nome text,

  palavras_chave text[] not null default '{}',
  palavras_excluidas text[] not null default '{}',

  ticket_minimo numeric check (ticket_minimo is null or ticket_minimo >= 0),
  ticket_maximo numeric check (ticket_maximo is null or ticket_maximo >= 0),

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- A abrangência determina quais colunas de lugar precisam estar preenchidas.
  -- Escrito como CHECK e não como confiança no código porque o banco é o
  -- último lugar onde a regra ainda vale quando alguém chama a API direto.
  constraint lugar_coerente_com_abrangencia check (
    case abrangencia
      when 'brasil' then uf is null and municipio_ibge is null
      when 'uf' then uf is not null and municipio_ibge is null
      when 'municipio' then uf is not null and municipio_ibge is not null
    end
  ),

  -- Faixa invertida não deixaria nada passar, e o cliente concluiria que o
  -- produto não funciona em vez de que ele digitou ao contrário.
  constraint faixa_de_valor_coerente check (
    ticket_minimo is null or ticket_maximo is null or ticket_minimo <= ticket_maximo
  )
);

-- Dois recortes cobrindo a mesma coisa dobram o custo de avaliação e entregam o
-- mesmo edital duas vezes no mesmo e-mail. O índice único usa `coalesce` porque
-- em Postgres `null` nunca é igual a `null`, e sem isso dois recortes "Brasil"
-- passariam.
create unique index recorte_sem_abrangencia_repetida
  on recortes_da_empresa (
    empresa_id,
    abrangencia,
    coalesce(uf, ''),
    coalesce(municipio_ibge, '')
  );

create index recorte_por_empresa on recortes_da_empresa (empresa_id);

-- ## O limite de três, cobrado pelo banco
--
-- A regra também mora em `dominio/recorte.ts#conferirConjunto`, que é quem dá a
-- mensagem que a tela mostra. Duplicar aqui não é desleixo: a validação da tela
-- é o que explica, e esta trava é o que sobra quando alguém chama a API direto
-- ou quando um caminho novo esquece de validar. Regra de negócio que só mora na
-- tela é regra que a próxima tela não tem.
--
-- Trigger e não CHECK porque um CHECK não enxerga as outras linhas da tabela.
create or replace function recorte_respeita_o_limite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quantos int;
  limite constant int := 3;
begin
  select count(*) into quantos
  from recortes_da_empresa
  where empresa_id = new.empresa_id
    and (tg_op = 'INSERT' or id <> new.id);

  if quantos >= limite then
    raise exception
      'empresa % já tem % recortes, e o limite é %', new.empresa_id, quantos, limite
      using errcode = 'check_violation',
            hint = 'Apague um recorte antes de criar outro.';
  end if;

  return new;
end;
$$;

create trigger recorte_respeita_o_limite
  before insert or update of empresa_id on recortes_da_empresa
  for each row execute function recorte_respeita_o_limite();

create trigger recortes_da_empresa_marcar_atualizacao
  before update on recortes_da_empresa
  for each row execute function marcar_atualizacao();

-- ## Isolamento entre empresas
--
-- Mesma disciplina das outras tabelas de cliente: a empresa só enxerga o que é
-- dela, e quem escreve é o service role do pipeline.
alter table recortes_da_empresa enable row level security;

create policy "membros leem os recortes"
  on recortes_da_empresa for select
  using (usuario_pertence_a (empresa_id));

create policy "membros criam recortes"
  on recortes_da_empresa for insert
  with check (usuario_pertence_a (empresa_id));

create policy "membros editam recortes"
  on recortes_da_empresa for update
  using (usuario_pertence_a (empresa_id))
  with check (usuario_pertence_a (empresa_id));

-- Apagar é o que libera vaga no limite de três, então segue a mesma régua do
-- perfil: quem apaga é quem responde pela conta, não qualquer membro.
create policy "administracao apaga recortes"
  on recortes_da_empresa for delete
  using (usuario_tem_papel (empresa_id, array['dono'::papel_na_empresa, 'administrador'::papel_na_empresa]));

comment on table recortes_da_empresa is
  'Abrangência geográfica com filtro próprio. Máximo de três por empresa, cobrado por trigger. Ver src/lib/dominio/recorte.ts.';
