-- Os dois planos de lista, cobráveis.
--
-- `lib/precos.ts` é a fonte do preço PUBLICADO; esta tabela é a fonte do preço
-- COBRADO. `divergenciasDePreco` confere que os dois dizem o mesmo, e reprova
-- plano anunciado que ninguém consegue assinar — que é o estado em que o
-- repositório ficaria sem esta migração.
--
-- Preço decidido pelo dono em 25/08: R$ 59 e R$ 249. O eixo continua sendo
-- quantas empresas cabem na conta, e o desconto por empresa (R$ 49,80 contra
-- R$ 59) é o que dá motivo ao contador para trazer os clientes dele.
--
-- ## O `0` que é a diferença do produto
--
-- `limite_de_analises_profundas = 0` não é limite apertado: é a definição do
-- plano. Os planos pagos têm `null` (sem limite) porque lêem o documento de
-- todo edital que passa; o leve não lê nenhum, e é por isso que ele custa R$ 59
-- em vez de R$ 800. Escrever isso na tabela de cobrança, e não só na página,
-- é o que impede a leitura cara de ser disparada para quem não pagou por ela.
--
-- ## Por que `leve_escritorio` com sublinhado, e não hífen
--
-- `planos_codigo_check` exige `^[a-z0-9_]+$`. Descobri isso do jeito difícil:
-- `leve-escritorio` foi recusado pelo banco depois de passar no teste de
-- TypeScript, que exigia `^[a-z-]+$` — as duas regras se contradiziam, e
-- qualquer código com hífen OU com sublinhado falharia numa das duas. O teste
-- foi alinhado ao banco, com guarda para não divergirem de novo.
insert into planos (
  codigo, nome, ativo, mensalidade_em_centavos, limite_de_empresas,
  limite_de_analises_profundas
)
values
  ('leve', 'Leve', true, 5900, 1, 0),
  ('leve_escritorio', 'Leve Escritório', true, 24900, 5, 0)
on conflict (codigo) do update
  set nome = excluded.nome,
      ativo = excluded.ativo,
      mensalidade_em_centavos = excluded.mensalidade_em_centavos,
      limite_de_empresas = excluded.limite_de_empresas,
      limite_de_analises_profundas = excluded.limite_de_analises_profundas;
