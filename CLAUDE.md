# CLAUDE.md — sandbox-nexi

Repositório **público** de experimentos de tela em HTML, CSS e JavaScript puros.
Nada aqui fala com banco, API ou login: são telas estáticas com **dados fictícios**.

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
