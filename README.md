# sandbox-nexi

Telas de experimento em HTML, CSS e JavaScript puros, com dados fictícios — sem dependências nem login.

| Tela | O que mostra |
|---|---|
| `index.html` | 5 regras de negócio de uma loja fictícia (arquivo único) |
| `leads.html` | Lista de leads fictícios com busca, filtro por status e UF; dados em `data/leads.json` |

## Rodar

    npx http-server -p 8080 -c-1 .

Abra `http://localhost:8080/leads.html`. A tela de leads precisa de servidor porque lê o JSON
com `fetch`; aberta direto do disco, ela mostra a mensagem de erro.

Para editar as regras, altere o array `REGRAS` em `index.html`. Para editar os leads, altere
`data/leads.json`. Convenções em `CLAUDE.md`.

## Supabase

A pasta `supabase/` tem experimentos de banco e edge function num projeto Supabase pessoal:

- `migrations/` — tabela `notas` com RLS (cada usuário só vê e cria as próprias notas) e o
  grant separado, mais um ajuste de segurança.
- `functions/ola-nexi/` — função de exemplo: 200 com nome, 400 sem nome, 401 sem token válido.
  Lê `SUPABASE_URL` e `SUPABASE_ANON_KEY` do ambiente. Como rodar local: ver `CLAUDE.md`.

Nenhuma chave, URL ou id de projeto fica no repositório.
