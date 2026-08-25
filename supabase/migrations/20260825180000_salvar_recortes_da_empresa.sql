-- Grava a lista INTEIRA de recortes de uma empresa, ou nada.
--
-- ## Por que substituir o conjunto em vez de editar um a um
--
-- `recorte_respeita_o_limite` conta as linhas que EXISTEM na hora do insert.
-- Editando um por um, trocar três recortes por outros três exigiria apagar
-- antes de inserir — e qualquer falha no meio deixaria a empresa com menos
-- recortes do que ela tinha, sem ela ter pedido isso.
--
-- Substituir o conjunto inteiro numa transação faz o estado final ser
-- exatamente o que a tela mostrou, ou nada. É a mesma disciplina de
-- `salvar_perfil_da_empresa`, e pela mesma razão.
--
-- ## `security invoker`, e isso é a decisão de segurança
--
-- A função roda com o papel de quem chamou, então a RLS de
-- `recortes_da_empresa` confere de novo do lado de cá. `p_empresa_id` vem de
-- `empresaAtual()` no servidor e nunca do formulário; mesmo assim, se algum dia
-- vier de outro lugar, a política é quem recusa.
create or replace function salvar_recortes_da_empresa(
  p_empresa_id uuid,
  p_recortes jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  quantos int;
begin
  if jsonb_typeof(p_recortes) <> 'array' then
    raise exception 'p_recortes precisa ser um array (recebi %)', jsonb_typeof(p_recortes)
      using errcode = 'invalid_parameter_value';
  end if;

  quantos := jsonb_array_length(p_recortes);

  -- A trava por linha já existe e continua valendo. Esta confere o conjunto
  -- ANTES de apagar o que estava lá: sem ela, mandar quatro apagaria os três
  -- atuais e só então falharia no quarto insert, deixando a empresa com dois.
  if quantos > 3 then
    raise exception 'são % recortes, e o limite é 3', quantos
      using errcode = 'check_violation',
            hint = 'Apague um recorte antes de criar outro.';
  end if;

  delete from recortes_da_empresa where empresa_id = p_empresa_id;

  insert into recortes_da_empresa (
    empresa_id, nome, abrangencia, uf, municipio_ibge, municipio_nome,
    palavras_chave, palavras_excluidas, ticket_minimo, ticket_maximo
  )
  select
    p_empresa_id,
    r ->> 'nome',
    (r ->> 'abrangencia')::abrangencia_do_recorte,
    r ->> 'uf',
    r ->> 'municipio_ibge',
    r ->> 'municipio_nome',
    coalesce(
      (select array_agg(value #>> '{}') from jsonb_array_elements(r -> 'palavras_chave')),
      '{}'
    ),
    coalesce(
      (select array_agg(value #>> '{}') from jsonb_array_elements(r -> 'palavras_excluidas')),
      '{}'
    ),
    (r ->> 'ticket_minimo')::numeric,
    (r ->> 'ticket_maximo')::numeric
  from jsonb_array_elements(p_recortes) as r;
end;
$$;

comment on function salvar_recortes_da_empresa(uuid, jsonb) is
  'Substitui a lista de recortes de uma empresa numa transação. Ver src/lib/dados/supabase.ts#salvarRecortes.';
