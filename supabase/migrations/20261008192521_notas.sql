-- notas: cada usuário logado lê e cria SÓ as próprias notas.
--
-- Duas camadas, as duas obrigatórias:
--   1) GRANT  → o papel `authenticated` pode tocar na tabela (sem isso: "permission denied for table notas").
--   2) RLS    → dentro da tabela, só as linhas com user_id = auth.uid().
-- Policy sem grant não funciona; grant sem RLS expõe tudo.
--
-- O revoke explícito existe porque o Supabase costuma dar privilégios padrão a anon/authenticated
-- em tabelas novas do schema public: sem ele, o "grant" abaixo não estaria provando nada.

create table public.notas (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto      text not null check (char_length(texto) between 1 and 2000),
  criado_em  timestamptz not null default now()
);

create index notas_user_id_idx on public.notas (user_id);

alter table public.notas enable row level security;

-- (select auth.uid()) em vez de auth.uid(): avaliado uma vez por consulta, não por linha.
create policy notas_select_proprias on public.notas
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy notas_insert_proprias on public.notas
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Sem policy de update/delete: ninguém (exceto service_role) altera ou apaga nota.

revoke all on public.notas from anon, authenticated;
-- O grant vem na migration seguinte (20261008192545_notas_grant.sql), de propósito:
-- entre as duas, a tabela existe com RLS e policies mas o authenticated recebe
-- "permission denied for table notas" — prova de que policy sozinha não basta.
