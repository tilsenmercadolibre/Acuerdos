// Supabase Edge Function: check-expirations
// ─────────────────────────────────────────────────────────────────────────────
// Se ejecuta diariamente a las 08:00 via pg_cron o Supabase Scheduled Functions.
// 1. Detecta contratos que vencen en 60 / 30 / 7 días
// 2. Envía email via Brevo usando las plantillas configuradas
// 3. Marca el flag de aviso enviado para evitar duplicados
// 4. Marca contratos ya vencidos con estado = VENCIDO
//
// Deploy:
//   supabase functions deploy check-expirations
//
// Cron en Supabase Dashboard → Database → Extensions → pg_cron:
//   SELECT cron.schedule(
//     'daily-expiration-check',
//     '0 8 * * *',
//     $$SELECT net.http_post(
//       url := 'https://pekhxbahfdqcnmfxukem.supabase.co/functions/v1/check-expirations',
//       headers := '{"Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb
//     )$$
//   );
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BREVO_API   = 'https://api.brevo.com/v3/smtp/email';
const BREVO_KEY   = Deno.env.get('BREVO_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const TEMPLATES: Record<string, number> = {
  DOS_MESES:  Number(Deno.env.get('BREVO_TPL_2_MESES')   ?? 3),
  UN_MES:     Number(Deno.env.get('BREVO_TPL_1_MES')     ?? 4),
  SIETE_DIAS: Number(Deno.env.get('BREVO_TPL_7_DIAS')    ?? 5),
};

const FLAG_COLUMN: Record<string, string> = {
  DOS_MESES:  'aviso_2_meses_enviado',
  UN_MES:     'aviso_1_mes_enviado',
  SIETE_DIAS: 'aviso_7_dias_enviado',
};

async function sendBrevo(to: { email: string; name: string }, templateId: number, params: Record<string, string>) {
  if (!BREVO_KEY) return;
  await fetch(BREVO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
    body: JSON.stringify({
      sender: { email: 'tilsenbranding@gmail.com', name: 'Tilsen Acuerdos' },
      to: [to],
      templateId,
      params,
    }),
  });
}

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Marcar contratos vencidos
  await supabase.rpc('marcar_contratos_vencidos');

  // 2. Obtener contratos que necesitan recordatorio
  const { data: pendientes, error } = await supabase.rpc('contratos_para_recordatorio');
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results: string[] = [];

  for (const c of pendientes ?? []) {
    if (!c.tipo_aviso || !c.cliente_email) continue;

    const params = {
      cliente:           c.cliente_nombre ?? 'Cliente',
      numero_acuerdo:    c.numero_acuerdo ?? c.id,
      fecha_vencimiento: c.fecha_vencimiento ?? '',
    };

    try {
      await sendBrevo(
        { email: c.cliente_email, name: c.cliente_nombre ?? 'Cliente' },
        TEMPLATES[c.tipo_aviso],
        params
      );

      // Marcar flag para no duplicar
      const flag = FLAG_COLUMN[c.tipo_aviso];
      await supabase
        .from('contratos')
        .update({ [flag]: true })
        .eq('id', c.id);

      results.push(`✓ ${c.tipo_aviso} → ${c.cliente_email}`);
    } catch (e: any) {
      results.push(`✗ ${c.tipo_aviso} → ${c.cliente_email}: ${e.message}`);
    }
  }

  return new Response(
    JSON.stringify({ processed: results.length, details: results }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
