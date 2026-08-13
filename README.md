# Licitante Vencedor

Autopilot de inteligência em licitações para PMEs. Todo dia útil, a empresa
recebe apenas os editais que fazem sentido para ela — já triados, pontuados,
com checklist de documentação e a próxima ação escrita.

O produto não é um agregador de editais. A pergunta que ele responde não é
"o que foi publicado hoje?", e sim **"o que eu preciso fazer hoje?"**.

## O que existe

Dois sistemas convivem no mesmo repositório, de propósito:

**O site público** (`/`, `/lei-14133/`, `/habilitacao/`, `/blog/`…) — nove guias
de conteúdo, duas páginas de produto e o mapa de recuperação do acervo
2016–2025: 339 endereços antigos redirecionando 301 para o hub do assunto certo
e 7 respondendo 410. É o canal de aquisição.

**O produto** (`/painel/`, `/oportunidades/`, `/perfil/`) — a aplicação em si.

Estado detalhado, item a item, em [`docs/produto/roadmap.md`](docs/produto/roadmap.md).
Ele descreve o que existe, não o que está planejado parecer que existe.

## Como o produto pensa

Três leituras antes de mexer em qualquer coisa:

- [`docs/produto/arquitetura.md`](docs/produto/arquitetura.md) — as decisões e o porquê de cada uma.
- [`docs/produto/posicionamento-e-limites.md`](docs/produto/posicionamento-e-limites.md) — o que o produto pode e não pode afirmar.
- [`src/lib/dominio/procedencia.ts`](src/lib/dominio/procedencia.ts) — a primitiva da qual tudo herda.

O resumo em uma regra: **ausência de informação nunca vira afirmação**. Um edital
publicado sem valor estimado não é "pouco aderente" — é um edital cujo valor não
sabemos, e o produto diz isso com essas palavras. O motor de score tira o
critério da conta em vez de zerá-lo, e publica quanto da avaliação teve base.

## Rodar localmente

```bash
npm install
npm run dev          # http://localhost:3000
```

O produto sobe funcionando, sem banco e sem chave de IA: `src/lib/dados/` devolve
um repositório de demonstração com dados sintéticos, e a interface exibe o aviso
enquanto ele estiver em uso. Nenhum registro de demonstração se disfarça de real
— todos têm `fonte: "exemplo"` e `id` prefixado por `EXEMPLO-`.

### Verificação

```bash
npm run verificar    # tsc + eslint + vitest
npm test             # só os testes
npm run build        # build de produção
```

### Coleta do PNCP

```bash
npm run pncp:testar                      # sonda rápida da API
npm run pncp:ingerir -- --uf PE --dias 90
```

A coleta roda sozinha todo dia às 06:10 UTC pelo GitHub Actions
(`.github/workflows/coletar-pncp.yml`), versionando o agregado por município e o
relatório de revisão. O snapshot completo sai como artefato, não como commit.

O PNCP cai — não é hipótese, foi medido. Por isso a coleta é isolada por UF,
declara cobertura parcial em vez de fingir que coletou tudo, e não deixa uma
coleta degradada sobrescrever a última coleta boa.

## Variáveis de ambiente

Nenhuma é obrigatória para rodar. Cada ausência desliga uma capacidade de forma
declarada, nunca silenciosa.

| Variável | O que liga | Sem ela |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Persistência e autenticação | Repositório de demonstração |
| `SUPABASE_SERVICE_ROLE_KEY` | Coleta e jobs gravando no banco | Coleta só grava arquivo |
| `GEMINI_API_KEY` | Leitura profunda do edital | Análise fica no nível da publicação, declarado na interface |
| `LEADS_DESTINO` | Captura de leads do site público | Formulário responde 503 e a página avisa |

## Estrutura

```
src/
├─ app/
│  ├─ (app)/          produto: painel, oportunidades, perfil, onboarding
│  ├─ api/            rotas de servidor
│  └─ *               site público (hubs, LPs, institucionais)
├─ lib/
│  ├─ dominio/        score, checklist, recomendação, procedência — lógica pura
│  ├─ pipeline/       triagem e o registro de por que cada edital entrou ou não
│  ├─ fontes/         porta FonteDeEditais + adaptador do PNCP
│  ├─ ia/             provedor trocável, prompts versionados, controle de custo
│  ├─ alertas/        o que merece alerta e como a mensagem é escrita
│  ├─ dados/          porta do produto (empresaId obrigatório) + demonstração
│  └─ legacy/         mapa de recuperação do acervo
├─ components/
supabase/migrations/  esquema multi-tenant com RLS
docs/produto/         arquitetura, roadmap, posicionamento
```

## Licença

Privado. Todos os direitos reservados.
