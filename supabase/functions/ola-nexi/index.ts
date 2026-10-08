// ola-nexi — função de exemplo do sandbox.
//   200 → { mensagem: "Olá, <nome>!", usuario: "<id do usuário logado>" }
//   400 → sem "nome" (corpo JSON { "nome": "..." } no POST, ou ?nome=... no GET)
//   401 → sem Authorization: Bearer <token>, ou com token inválido/expirado
//   500 → SUPABASE_URL / SUPABASE_ANON_KEY não configurados
//   503 → o Auth do projeto não respondeu (falha de rede ou mais de 5s)
//
// O 401 é checado AQUI no código, não só no gateway (verify_jwt): rodando com Deno direto
// não existe gateway, e em produção o certo é ter as duas camadas. O token é validado de
// verdade no Auth do projeto (GET /auth/v1/user — o mesmo que `supabase.auth.getUser(token)`).
//
// SUPABASE_URL e SUPABASE_ANON_KEY são injetados automaticamente pelo Supabase quando a função
// roda lá. Rodando local, passe por variável de ambiente — nunca escreva a chave neste arquivo.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(corpo: unknown, status: number): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

const NAO_AUTORIZADO = "Não autorizado: envie o cabeçalho Authorization: Bearer <token> com um token válido.";

// Pergunta ao Auth do projeto de quem é o token. null = token ausente, inválido ou expirado.
async function usuarioDoToken(auth: string, url: string, chave: string): Promise<{ id: string } | null> {
  if (!/^Bearer\s+\S+$/i.test(auth.trim())) return null;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: auth.trim(), apikey: chave },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const usuario = await res.json();
  return typeof usuario?.id === "string" ? { id: usuario.id } : null;
}

async function lerNome(req: Request): Promise<string> {
  const daUrl = new URL(req.url).searchParams.get("nome");
  if (daUrl) return daUrl.trim();
  if (req.method !== "POST") return "";
  try {
    const corpo = await req.json();
    return typeof corpo?.nome === "string" ? corpo.nome.trim() : "";
  } catch {
    return ""; // corpo vazio ou JSON inválido = sem nome
  }
}

export async function tratar(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ erro: "Método não permitido. Use GET ou POST." }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const chave = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !chave) {
    return json({ erro: "Função sem configuração: defina SUPABASE_URL e SUPABASE_ANON_KEY." }, 500);
  }

  let usuario: { id: string } | null;
  try {
    usuario = await usuarioDoToken(req.headers.get("Authorization") ?? "", url, chave);
  } catch {
    return json({ erro: "Não foi possível validar o token agora (Auth indisponível)." }, 503);
  }
  if (!usuario) return json({ erro: NAO_AUTORIZADO }, 401);

  const nome = await lerNome(req);
  if (!nome) {
    return json({ erro: "Campo 'nome' é obrigatório." }, 400);
  }

  return json({ mensagem: `Olá, ${nome}!`, usuario: usuario.id }, 200);
}

if (import.meta.main) Deno.serve(tratar);
