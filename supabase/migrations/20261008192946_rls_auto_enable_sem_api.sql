-- rls_auto_enable(): event trigger criado pelo Supabase junto com o projeto (opção "ligar RLS
-- automaticamente"). Liga o RLS em toda tabela nova do schema public — é útil e continua ativo.
--
-- O problema (alerta 0028/0029 do Security Advisor): por ser SECURITY DEFINER no schema public,
-- ela fica exposta em /rest/v1/rpc/rls_auto_enable para anon e authenticated. Não há motivo
-- para ninguém chamá-la pela API.
--
-- Revogar de PUBLIC é obrigatório: o Postgres dá EXECUTE a PUBLIC por padrão em toda função
-- nova, e `revoke ... from anon` sozinho não remove o que é herdado de PUBLIC.
-- O event trigger continua disparando: privilégio de EXECUTE não é checado no disparo.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
