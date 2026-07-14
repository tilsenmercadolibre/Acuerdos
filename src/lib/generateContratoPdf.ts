/**
 * generateContratoPdfBase64
 *
 * Genera el PDF de un contrato a partir de los datos ya almacenados en Supabase
 * y lo devuelve como string en base64, listo para adjuntarse a un email de Brevo.
 *
 * @param contrato - Objeto del contrato con joins a cliente, aportes y descuentos
 * @param logoBase64 - Logo en base64 (Tilsen) para el header del PDF
 * @param logoAspect - Relación de aspecto del logo
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatItemName(ap: any): string {
  if (ap.articulo) return ap.articulo.nombre;
  const parts: string[] = [];
  if (ap.marca?.nombre) parts.push(ap.marca.nombre);
  if (ap.linea?.nombre) parts.push(ap.linea.nombre);
  if (ap.calibre?.nombre) parts.push(ap.calibre.nombre);
  return parts.join(' · ') || 'Combinación personalizada';
}

function formatItemCode(ap: any): string {
  return ap.articulo?.codigo || ap.codigo_interno || '-';
}

export async function generateContratoPdfBase64(
  contrato: any,
  logoBase64: string | null = null,
  logoAspect: number = 1
): Promise<string> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const clienteNombre  = contrato.cliente?.nombre || 'Sin Cliente';
  const clienteEmail   = contrato.cliente?.email  || '';
  const codigoCliente  = contrato.cliente?.codigo || '-';
  const fechaCreacion  = contrato.created_at ? new Date(contrato.created_at).toLocaleDateString() : new Date().toLocaleDateString();
  const org            = contrato.organizacion     || 'Tilsen';
  const creador        = contrato.creador          || '';
  const tipoAcuerdo    = contrato.tipo             || 'General';
  const fechaInicio    = contrato.fecha_inicio     || '';
  const fechaVenc      = contrato.fecha_vencimiento || '';

  // ── Header con logo ──
  if (logoBase64) {
    const logoH = 40;
    const logoW = logoH * logoAspect;
    const logoX = (pageWidth - logoW) / 2;
    doc.addImage(logoBase64, 'PNG', logoX, 10, logoW, logoH);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Acuerdo Comercial', pageWidth / 2, 58, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(
      `Organización: ${org}   |   Creado por: ${creador}   |   Fecha: ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      64,
      { align: 'center' }
    );
    doc.setTextColor(0);

    doc.setDrawColor(200);
    doc.line(14, 68, pageWidth - 14, 68);
  } else {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Acuerdo Comercial - ${org}`, 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString()}   |   Creado por: ${creador}`, 14, 28);
  }

  // ── Información del cliente ──
  const clientInfoY = logoBase64 ? 78 : 38;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Cliente', 14, clientInfoY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${clienteNombre}`, 14, clientInfoY + 8);
  doc.text(`Código de Cliente: ${codigoCliente}`, 14, clientInfoY + 14);
  doc.text(`Email: ${clienteEmail}`, 14, clientInfoY + 20);
  doc.text(`Fecha de Creación: ${fechaCreacion}`, 14, clientInfoY + 26);
  doc.text(`Categoría: ${contrato.categoria || '-'}`, 14, clientInfoY + 32);
  doc.text(`Tipo de Acuerdo: ${tipoAcuerdo}`, 14, clientInfoY + 38);
  doc.text(
    `Fecha de Inicio: ${fechaInicio ? new Date(fechaInicio).toLocaleDateString() : '-'}`,
    14, clientInfoY + 44
  );
  doc.text(
    `Fecha de Vencimiento: ${fechaVenc ? new Date(fechaVenc).toLocaleDateString() : '-'}`,
    14, clientInfoY + 50
  );

  let startY = clientInfoY + 60;

  // ── Tabla de Aportes ──
  const aportes: any[] = contrato.contrato_aportes || [];
  if (aportes.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Aporte (Productos/Servicios)', 14, startY);

    const aporteBody = aportes.map(ap => [
      formatItemCode(ap),
      formatItemName(ap),
      (ap.cantidad || 0).toString()
    ]);

    autoTable(doc, {
      startY: startY + 6,
      head: [['Código', 'Artículo / Detalle', 'Cantidad']],
      body: aporteBody,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0] }
    });
    startY = (doc as any).lastAutoTable.finalY + 14;
  }

  // ── Tabla de Descuentos ──
  const descuentos: any[] = contrato.contrato_descuentos || [];
  if (descuentos.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Descuentos Aplicados', 14, startY);

    const descuentoBody = descuentos.map(ap => [
      formatItemCode(ap),
      formatItemName(ap),
      `${ap.descuento || 0}%`
    ]);

    autoTable(doc, {
      startY: startY + 6,
      head: [['Código', 'Artículo / Detalle', 'Descuento (%)']],
      body: descuentoBody,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0] }
    });
  }

  // ── Firma ──
  const finalY = (doc as any).lastAutoTable?.finalY ?? startY;
  const signatureY = finalY + 28;
  const drawSignatureY = signatureY > pageHeight - 35 ? pageHeight - 35 : signatureY;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Firma de Autorización: ____________________________________________', 14, drawSignatureY);

  // ── Footer ──
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont('helvetica', 'normal');
  doc.text('Este documento es generado automáticamente por el sistema de gestión de acuerdos.', 14, pageHeight - 10);

  // Strip 'data:application/pdf;base64,' prefix to get raw base64
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1] ?? dataUri;
}

/**
 * Carga el logo de Tilsen como base64 desde una URL de imagen.
 * Útil cuando no hay acceso al estado del componente NuevoContrato.
 */
export async function loadLogoBase64(logoSrc: string): Promise<{ base64: string; aspect: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const base64 = canvas.toDataURL('image/png');
          resolve({ base64, aspect: img.width / img.height });
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = logoSrc;
  });
}
