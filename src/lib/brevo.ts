// ─── Brevo (Sendinblue) Email Service ─────────────────────────────────────────
// Envía transaccionales directamente desde el frontend usando la API de Brevo.
// La API key está en VITE_BREVO_API_KEY (solo uso interno).

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
const API_KEY = import.meta.env.VITE_BREVO_API_KEY ?? '';

const SENDER = {
  email: import.meta.env.VITE_BREVO_SENDER_EMAIL ?? 'b17197001@smtp-brevo.com',
  name: 'Tilsen Acuerdos',
};

export const TEMPLATES = {
  PENDIENTE:  Number(import.meta.env.VITE_BREVO_TPL_PENDIENTE ?? 1),
  APROBADO:   Number(import.meta.env.VITE_BREVO_TPL_APROBADO  ?? 2),
  DOS_MESES:  Number(import.meta.env.VITE_BREVO_TPL_2_MESES   ?? 3),
  UN_MES:     Number(import.meta.env.VITE_BREVO_TPL_1_MES     ?? 4),
  SIETE_DIAS: Number(import.meta.env.VITE_BREVO_TPL_7_DIAS    ?? 5),
};

const JOSE_EMAIL = import.meta.env.VITE_JOSE_EMAIL ?? 'tilsenbranding@gmail.com';
const JOSE_NAME  = import.meta.env.VITE_JOSE_NAME  ?? 'José Zubillaga';

interface Recipient { email: string; name?: string }
interface SendParams {
  to: Recipient[];
  templateId: number;
  params: Record<string, string | number>;
}

async function send({ to, templateId, params }: SendParams): Promise<void> {
  if (!API_KEY || API_KEY === 'TU_API_KEY_AQUI') {
    console.warn('[Brevo] API key no configurada. El email NO se envió.', { to, templateId, params });
    return;
  }

  const body = {
    sender: SENDER,
    to,
    templateId,
    params,
  };

  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error ${res.status}: ${err}`);
  }
}

// ─── Funciones de alto nivel ──────────────────────────────────────────────────

/**
 * 1) Acuerdo creado → email interno a José + email al cliente
 */
export async function notificarAcuerdoCreado(opts: {
  clienteNombre: string;
  clienteEmail: string;
  numeroAcuerdo: string;
  fechaVencimiento: string;
  creador: string;
}) {
  const params = {
    cliente:            opts.clienteNombre,
    numero_acuerdo:     opts.numeroAcuerdo,
    fecha_vencimiento:  opts.fechaVencimiento || 'Sin vencimiento',
    creador:            opts.creador,
  };

  // Email a José (notificación interna)
  await send({
    to: [{ email: JOSE_EMAIL, name: JOSE_NAME }],
    templateId: TEMPLATES.PENDIENTE,
    params,
  });

  // Email al cliente
  if (opts.clienteEmail) {
    await send({
      to: [{ email: opts.clienteEmail, name: opts.clienteNombre }],
      templateId: TEMPLATES.PENDIENTE,
      params,
    });
  }
}

/**
 * 2) José aprueba → email al cliente
 */
export async function notificarAcuerdoAprobado(opts: {
  clienteNombre: string;
  clienteEmail: string;
  numeroAcuerdo: string;
  fechaVencimiento: string;
}) {
  if (!opts.clienteEmail) return;
  await send({
    to: [{ email: opts.clienteEmail, name: opts.clienteNombre }],
    templateId: TEMPLATES.APROBADO,
    params: {
      cliente:           opts.clienteNombre,
      numero_acuerdo:    opts.numeroAcuerdo,
      fecha_vencimiento: opts.fechaVencimiento || 'Sin vencimiento',
    },
  });
}

/**
 * 3–5) Recordatorio de vencimiento (2 meses / 1 mes / 7 días)
 */
export async function notificarRecordatorio(opts: {
  clienteNombre: string;
  clienteEmail: string;
  numeroAcuerdo: string;
  fechaVencimiento: string;
  tipo: 'DOS_MESES' | 'UN_MES' | 'SIETE_DIAS';
}) {
  if (!opts.clienteEmail) return;
  await send({
    to: [{ email: opts.clienteEmail, name: opts.clienteNombre }],
    templateId: TEMPLATES[opts.tipo],
    params: {
      cliente:           opts.clienteNombre,
      numero_acuerdo:    opts.numeroAcuerdo,
      fecha_vencimiento: opts.fechaVencimiento,
    },
  });
}
