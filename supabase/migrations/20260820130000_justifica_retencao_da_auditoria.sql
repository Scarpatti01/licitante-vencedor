-- Estas duas tabelas já nasceram sem policy de UPDATE/DELETE para nenhum
-- papel — a política sempre foi "nunca apaga". O que faltava era o motivo
-- por escrito: a decisão de manter mesmo sob pedido de exclusão (LGPD)
-- ficava só implícita no comportamento, sem registro de por quê.
--
-- Ver `src/lib/lgpd/exclusao.ts`: um pedido explícito de exclusão apaga
-- documento, atestado, perfil declarado e histórico de triagem da empresa,
-- mas NUNCA estas duas tabelas.

comment on table acoes_na_oportunidade is
  'Histórico do que o cliente fez. Append-only: sem policy de UPDATE nem de '
  'DELETE, para nenhum papel. Sobrevive até a um pedido de exclusão (LGPD, '
  'art. 18, IX) sob a exceção do art. 16, IV — uso exclusivo do controlador, '
  'sem repasse a terceiro: é a prova de o que o cliente fez com cada '
  'oportunidade, caso uma disputa apareça depois do cancelamento.';

comment on table eventos_de_auditoria is
  'Trilha de auditoria. Append-only: sem policy de UPDATE ou DELETE para '
  'ninguém, nem para dono da empresa. Sobrevive até a um pedido de exclusão '
  '(LGPD, art. 18, IX) sob a exceção do art. 16, IV — uso exclusivo do '
  'controlador, sem repasse a terceiro: é o registro de quem fez o quê, e '
  'quando, para responder por uma ação da própria plataforma se for preciso.';
