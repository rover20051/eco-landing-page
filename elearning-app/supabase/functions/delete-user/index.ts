import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Safely decode JWT payload — handles URL-safe base64 and missing padding
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    // Convert URL-safe base64 to standard base64 and add padding
    const standard = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = standard.padEnd(standard.length + (4 - standard.length % 4) % 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Parse body
    let body: { userId?: string };
    try {
      body = await req.json();
    } catch {
      return respond({ error: 'Body inválido' }, 400);
    }

    const { userId } = body;
    if (!userId) return respond({ error: 'userId requerido' }, 400);

    // 2. Verify auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return respond({ error: 'Sin token de autorización' }, 401);

    const jwt = authHeader.replace('Bearer ', '');
    const payload = decodeJwt(jwt);
    if (!payload) return respond({ error: 'Token no se pudo decodificar' }, 401);

    const callerId = payload.sub as string;
    if (!callerId) return respond({ error: 'Token sin sub claim' }, 401);

    // 3. Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return respond({ error: 'Variables de entorno de Supabase no configuradas' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 4. Check caller is admin
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();

    if (profileError) {
      return respond({ error: 'Error verificando admin', detail: profileError.message, callerId }, 500);
    }
    if (callerProfile?.role !== 'admin') {
      return respond({ error: 'Solo admins pueden eliminar usuarios', role: callerProfile?.role }, 403);
    }

    // 5. Delete from Clerk
    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
    if (!clerkSecretKey) return respond({ error: 'CLERK_SECRET_KEY no configurado en Supabase secrets' }, 500);

    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${clerkSecretKey}` },
    });

    if (!clerkRes.ok && clerkRes.status !== 404) {
      const clerkText = await clerkRes.text();
      return respond({ error: `Clerk error ${clerkRes.status}: ${clerkText}` }, 500);
    }

    // 6. Delete from Supabase profiles (CASCADE borra todo lo relacionado)
    const { error: dbError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (dbError) return respond({ error: 'Error borrando perfil: ' + dbError.message }, 500);

    return respond({ success: true, deletedUserId: userId });

  } catch (err) {
    return respond({ error: 'Error inesperado: ' + (err as Error).message }, 500);
  }
});
