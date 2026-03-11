import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is an admin using their JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Check that the caller is an admin
    const jwt = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(jwt.split('.')[1]));
    const callerId = payload.sub;

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo admins pueden eliminar usuarios' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Delete from Clerk
    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
    if (!clerkSecretKey) {
      return new Response(JSON.stringify({ error: 'CLERK_SECRET_KEY no configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${clerkSecretKey}` },
    });

    if (!clerkRes.ok) {
      const clerkError = await clerkRes.json();
      // If user not found in Clerk (404), still proceed to delete from Supabase
      if (clerkRes.status !== 404) {
        return new Response(JSON.stringify({ error: 'Error en Clerk: ' + JSON.stringify(clerkError) }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Delete from Supabase profiles (CASCADE handles all related data)
    const { error: dbError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (dbError) {
      return new Response(JSON.stringify({ error: 'Error en Supabase: ' + dbError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
