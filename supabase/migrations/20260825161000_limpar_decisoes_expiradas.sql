-- A decisão de triagem sai quando o edital dela já não interessa a ninguém.
--
-- ## A régua é o ciclo de vida do edital, não o calendário
--
-- `decisoes_de_triagem` responde "por que este edital NÃO apareceu para mim?".
-- Ela precisa sobreviver ao cancelamento da assinatura (é o que
-- `lgpd/retencao.ts` diz, e está certo), mas "sobreviver ao cancelamento" não é
-- "viver para sempre". Ninguém pergunta por que não recebeu um edital que
-- encerrou há três meses: a proposta não pode mais ser entregue, e a resposta
-- não muda decisão nenhuma.
--
-- Trinta dias depois do encerramento é o ponto em que a pergunta deixa de ser
-- operacional. A régua em TypeScript mora em `retencao/decisoes.ts`, e o teste
-- de lá confere dia a dia que as duas escritas concordam.
--
-- ## O que esta função NÃO apaga
--
-- `oportunidades`. Aquilo é o que o cliente VÊ e sobre o que ele agiu: salvou,
-- descartou, marcou que participou. Apagar seria apagar o trabalho dele. Só a
-- decisão sai, e a oportunidade correspondente fica com `oportunidade_id`
-- intacto do lado dela.
--
-- ## Por que em lotes, e por que devolve quantas apagou
--
-- Um `DELETE` de um milhão de linhas numa transação só segura lock demais e
-- incha o WAL. O chamador (`scripts/limpar-decisoes.ts`) chama em laço até vir
-- zero, e cada chamada é uma transação curta que o autovacuum consegue seguir.
--
-- E o `DELETE` do Postgres não devolve espaço ao disco: ele marca a linha como
-- morta, e o autovacuum libera para reuso DENTRO da tabela. O efeito é que a
-- tabela para de crescer, não que o medidor do Supabase desça. Para o objetivo
-- (não chegar no teto do plano) o platô basta, e é bom que isto esteja escrito
-- aqui para ninguém achar que a limpeza falhou ao ver o número parado.

create or replace function limpar_decisoes_expiradas(dias int, teto int default 5000)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  apagadas int;
begin
  if dias < 0 then
    raise exception 'dias não pode ser negativo (recebi %)', dias
      using errcode = 'check_violation';
  end if;

  with expiradas as (
    select d.id
    from decisoes_de_triagem d
    join editais e on e.id = d.edital_id
    -- Sem prazo publicado não dá para saber se acabou, e apagar por suposição
    -- destrói a resposta de uma pergunta que o cliente ainda pode fazer.
    where e.encerramento_proposta is not null
      and e.encerramento_proposta <= now() - make_interval(days => dias)
    limit teto
  )
  delete from decisoes_de_triagem d
  using expiradas x
  where d.id = x.id;

  get diagnostics apagadas = row_count;
  return apagadas;
end;
$$;

comment on function limpar_decisoes_expiradas(int, int) is
  'Apaga decisões de triagem de editais encerrados há mais de N dias, em lotes. Devolve quantas saíram. Ver src/lib/retencao/decisoes.ts.';

-- O índice que faz o `join` acima não virar varredura da tabela inteira toda
-- madrugada. Sem ele a limpeza fica mais cara que o problema que resolve.
create index if not exists edital_por_encerramento
  on editais (encerramento_proposta)
  where encerramento_proposta is not null;

-- A contagem que o `--simular` usa.
--
-- Existe porque simular chamando a função de apagar com teto zero devolveria
-- zero sempre, e uma simulação que sempre diz "nada a fazer" é pior que não ter
-- simulação: ela dá confiança falsa antes de rodar de verdade.
create or replace function contar_decisoes_expiradas(dias int)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from decisoes_de_triagem d
  join editais e on e.id = d.edital_id
  where e.encerramento_proposta is not null
    and e.encerramento_proposta <= now() - make_interval(days => dias);
$$;
