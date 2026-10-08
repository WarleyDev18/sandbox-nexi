# CLAUDE.md — sandbox-nexi

Repositório **público** de experimentos em HTML, CSS e JavaScript puros, com **dados fictícios**.
As telas são estáticas (sem banco nem login). A pasta `supabase/` guarda experimentos de banco
e de edge function feitos num projeto Supabase **pessoal e gratuito** — não é projeto de empresa.

## Regra nº 1 — só conteúdo fictício

Nenhum dado, regra, marca, identidade visual, nome de sistema, documento ou referência de
empresa real entra aqui. Antes de gravar ou subir qualquer arquivo, conferir isso. Na dúvida, inventar.

## Telas

| Arquivo | O que é | Dados |
|---|---|---|
| `index.html` | 5 regras de negócio de uma loja fictícia, em cards | array `REGRAS` (arquivo único, CSS/JS embutidos) |
| `leads.html` | Lista de leads com busca e filtros | `data/leads.json`, via `fetch` |

Arquivos separados da tela de leads: `leads.html` → `css/leads.css` → `js/leads.js` → `data/leads.json`.

## Como rodar

`leads.html` lê o JSON com `fetch`, que não funciona abrindo o arquivo do disco (`file://`):
a tela mostra o erro, com dica. Use um servidor local na raiz:

    npx http-server -p 8080 -c-1 .

e abra `http://localhost:8080/leads.html`. `index.html` funciona com duplo clique.
Para ver o estado de erro: `leads.html?fonte=data/nao-existe.json` (só aceita `data/<nome>.json`).

## Convenções

- Sem framework, sem build, sem dependência além do Google Fonts (Inter + JetBrains Mono).
- JS em IIFE `(function () { "use strict"; ... }())`, com `var`.
- Texto vindo de dado entra por `textContent` (`createElement` + `textContent`, `new Option`),
  nunca por `innerHTML`. Texto fixo com marcação fica no HTML, escondido com `hidden`.
  Ícones ficam num sprite SVG (`<symbol id="i-nome">`) no HTML; o JS cria `<svg><use href="#i-nome">`.
- Cor só por token `var(--...)`; cor literal só dentro do `:root`. Os tokens estão
  duplicados em `index.html` e `css/leads.css` — mudou um, mude o outro.
- Ícones: SVG Lucide (MIT). Layout funciona em celular (≤640px).
- Todo `fetch` tem tempo limite (`AbortController`), teste de `res.ok` e erro **na tela**.

## Skill `revisar-tela`

`.claude/skills/revisar-tela/SKILL.md` revisa uma tela contra 4 regras: texto com
`textContent`, cor só por variável, funciona no celular, erro de rede na tela. Rodar antes
de subir qualquer tela nova ou alterada. `leads.html` e `index.html` passaram nas 4 em 08/10/2026.

## Supabase (`supabase/`)

Migrations aplicadas pelo MCP do Supabase; cada arquivo local tem a **mesma versão** que o
projeto registrou (`list_migrations`). Migration aplicada é salva aqui na mesma hora.

| Arquivo | O que faz |
|---|---|
| `migrations/20261008192521_notas.sql` | Tabela `notas`, RLS, policies de select/insert (`user_id = auth.uid()`), `revoke` de anon/authenticated |
| `migrations/20261008192545_notas_grant.sql` | `grant select, insert` para `authenticated` |
| `migrations/20261008192946_rls_auto_enable_sem_api.sql` | Tira `rls_auto_enable()` da API (alerta do Security Advisor) |
| `functions/ola-nexi/index.ts` | Edge function de exemplo: 200 / 400 sem nome / 401 sem token ou token inválido |

**Nunca** escrever no repo: id do projeto, URL, chave publishable/anon, service_role, senha.
A função lê `SUPABASE_URL` e `SUPABASE_ANON_KEY` do ambiente (o Supabase injeta sozinho).

Rodar a função local, sem Docker (Deno via npx):

    cd supabase/functions/ola-nexi
    SUPABASE_URL=... SUPABASE_ANON_KEY=... npx -y deno run --allow-net --allow-env=SUPABASE_URL,SUPABASE_ANON_KEY index.ts

Ela sobe em `http://127.0.0.1:8000`. ⚠️ Matar o `npx` não mata o `deno.exe` filho — conferir
a porta 8000 e encerrar o processo `deno` depois. **Não publicar** (`deploy`) sem pedido explícito.

### Testar RLS no SQL (sem login de verdade)

    begin;
    set local role authenticated;
    select set_config('request.jwt.claims', '{"sub":"<uuid do usuário>","role":"authenticated"}', true);
    select * from public.notas;   -- vê só as linhas desse usuário
    rollback;

Usuários de teste criados em `auth.users` para isso são **apagados no fim** (o `on delete cascade`
leva as notas junto).

## Contrato de `data/leads.json`

Lista de objetos: `id` (número), `empresa`, `cnpj` (formatado, fictício), `cidade` (inventada),
`uf`, `segmento`, `valor_estimado` (número, em reais), `status` (`Qualificado` | `Quente` | `Morno` | `Frio`).

## Aprendizados (não repetir)

1. **Erro de carga ≠ lista vazia.** Falha ao ler o JSON mostra a causa e "Tentar novamente";
   "Nenhum lead encontrado" é só para filtro sem resultado.
2. **`file://` bloqueia `fetch`** — testar por servidor local.
3. **Conteúdo real já vazou aqui uma vez** e o histórico do repositório teve de ser
   reescrito. Por isso a Regra nº 1.
4. **Git no Windows:** caminhos muito longos (pasta temporária) dão `Filename too long`.
   O clone local fica em `C:\Users\Warley Ruivo\sandbox-nexi`.
5. **Comandos git destrutivos:** usar `set -e`, conferir o commit (`git show --stat`) antes do push.
6. **Fluxo:** mostrar o código → validar no navegador → só então commit + push.
7. **Navegador headless no Windows engana em dois testes:** a janela não fica mais estreita
   que ~500px (screenshot de "celular" sai cortado sem a tela estar quebrada) e os timers
   não andam enquanto há requisição pendente (teste de tempo limite parece falhar). Os
   jeitos certos de testar estão na skill `revisar-tela`.
8. **Policy sem grant não funciona.** Sem `grant`, o Postgres barra com
   `permission denied for table` *antes* de olhar o RLS. E o contrário também vale: o Supabase
   dá **todos** os privilégios a `anon`/`authenticated` em toda tabela nova do `public` —
   por isso a migration faz `revoke all` antes do `grant` mínimo. Medido em 08/10/2026.
9. **`revoke ... from anon` não basta em função.** O Postgres dá `EXECUTE` a `PUBLIC` em toda
   função nova; tem que revogar de `public` também, senão anon continua executando.
10. **401 de verdade valida o token** no Auth (`GET /auth/v1/user`), não só a presença do
    `Bearer`. Testado: token inventado, adulterado e a chave publishable no lugar do token → 401.
