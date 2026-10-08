-- Libera a tabela notas para usuários logados. Sem isto, as policies da migration anterior
-- nunca chegam a ser avaliadas: o Postgres barra antes, com "permission denied for table notas".
-- Só select e insert — não há policy de update/delete, então não há por que conceder.

grant select, insert on public.notas to authenticated;
grant all on public.notas to service_role;
