import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ result: 'error', code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405);

  try {
    const payload = await req.json();
    const action = String(payload?.action || '').trim();
    if (!action) return json({ result: 'error', code: 'INVALID_REQUEST', message: 'Ação obrigatória.' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Corte definitivo: contas sem credencial Supabase nunca seguem para a API de autenticação.
    if (action === 'loginUser') {
      const email = String(payload?.email || '').trim().toLowerCase();
      if (!email) return json({ result: 'error', code: 'INVALID_CREDENTIALS', message: 'E-mail, senha ou acesso inválido.' }, 401);

      const { data: account, error } = await sb
        .from('accounts')
        .select('id,status,legacy_password_hash')
        .ilike('email', email)
        .maybeSingle();

      if (error) throw error;
      if (!account || account.status !== 'approved' || !account.legacy_password_hash) {
        return json({ result: 'error', code: 'INVALID_CREDENTIALS', message: 'E-mail, senha ou acesso inválido.' }, 401);
      }
    }

    const upstream = await fetch(`${supabaseUrl}/functions/v1/cba-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await upstream.text();
    return new Response(body, { status: upstream.status, headers: cors });
  } catch (error) {
    console.error(error);
    return json({ result: 'error', code: 'INTERNAL_ERROR', message: 'Falha interna no gateway.' }, 500);
  }
});
