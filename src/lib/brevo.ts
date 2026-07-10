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
  attachment?: { content: string; name: string }[];
}

async function send({ to, templateId, params, attachment }: SendParams): Promise<void> {
  if (!API_KEY || API_KEY === 'TU_API_KEY_AQUI') {
    console.warn('[Brevo] API key no configurada. El email NO se envió.', { to, templateId, params });
    return;
  }

  const body: any = {
    sender: SENDER,
    to,
    templateId,
    params,
  };

  if (attachment) {
    body.attachment = attachment;
  }

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

export async function notificarAcuerdoCreado(opts: {
  clienteNombre: string;
  clienteEmail: string;
  numeroAcuerdo: string;
  fechaVencimiento: string;
  creador: string;
  pdfBase64?: string;
}) {
  const params = {
    cliente:            opts.clienteNombre,
    numero_acuerdo:     opts.numeroAcuerdo,
    fecha_vencimiento:  opts.fechaVencimiento || 'Sin vencimiento',
    creador:            opts.creador,
  };

  const attachment = opts.pdfBase64 ? [{
    content: opts.pdfBase64,
    name: `Acuerdo_Comercial_${opts.numeroAcuerdo}.pdf`
  }] : undefined;

  await send({
    to: [{ email: JOSE_EMAIL, name: JOSE_NAME }],
    templateId: TEMPLATES.PENDIENTE,
    params,
    attachment,
  });

  if (opts.clienteEmail) {
    await send({
      to: [{ email: opts.clienteEmail, name: opts.clienteNombre }],
      templateId: TEMPLATES.PENDIENTE,
      params,
      attachment,
    });
  }
}

export async function notificarAcuerdoAprobado(opts: {
  clienteNombre: string;
  clienteEmail: string;
  numeroAcuerdo: string;
  fechaVencimiento: string;
  pdfBase64?: string;
}) {
  if (!opts.clienteEmail) return;

  const attachment = opts.pdfBase64 ? [{
    content: opts.pdfBase64,
    name: `Acuerdo_Comercial_${opts.numeroAcuerdo}_Aprobado.pdf`
  }] : undefined;

  await send({
    to: [{ email: opts.clienteEmail, name: opts.clienteNombre }],
    templateId: TEMPLATES.APROBADO,
    params: {
      cliente:           opts.clienteNombre,
      numero_acuerdo:    opts.numeroAcuerdo,
      fecha_vencimiento: opts.fechaVencimiento || 'Sin vencimiento',
    },
    attachment,
  });
}

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