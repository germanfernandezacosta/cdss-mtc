import { EmpathicPdfData } from '../pdf-generators/empathic-pdf';
import { FoucaultInput, AHPRAFlag } from './types';
import { scanTextForAHPRA, sanitizeForAHPRA } from './ahpra-filter';

/**
 * Construye el objeto plano EmpathicPdfData para pdfmake.
 * AHPRA-safe: nunca crea expectativas irrazonables de beneficio.
 * Usa lenguaje condicional y tradicional, nunca declarativo.
 * NO incluye fitoterapia (Bug #5 resuelto).
 */
export function buildEmpathicData(input: FoucaultInput): EmpathicPdfData {
  const { patient, clinicalInput, fukuokaResult, kantResult, generatedAt } = input;
  const syndrome = fukuokaResult.data.syndrome_analysis[0];
  const proposal = fukuokaResult.data.treatment_proposal;

  const normalizedKantStatus = String(kantResult.verdict).toUpperCase();
  const isKantRed = normalizedKantStatus === 'ROJO' || normalizedKantStatus === 'RED';
  const isKantYellow = normalizedKantStatus === 'AMARILLO' || normalizedKantStatus === 'YELLOW';

  // ─── Construir narrative empático ───
  let empathicNarrative = '';

  if (isKantRed) {
    empathicNarrative = `Nuestro sistema de seguridad clínica ha detectado que algunos elementos de tu plan inicial requieren ajustes importantes antes de poder continuar. Esto es una medida de protección estándar. Tu terapeuta revisará contigo los detalles seguros y personalizados en tu próxima consulta. No te preocupes: este tipo de revisión es habitual y garantiza que todo lo que hagamos sea apropiado para ti en este momento.`;
  } else if (isKantYellow) {
    empathicNarrative = `Hemos preparado una propuesta inicial, pero tu terapeuta realizará algunas verificaciones adicionales antes de comenzar. Esto nos permite adaptar todo con la máxima precisión a tu situación actual.`;
  } else {
    empathicNarrative = `Gracias por confiar en nosotros con tu cuidado hoy. Hemos tomado tiempo para entender tu patrón único y hemos preparado un plan suave para apoyar la curación natural de tu cuerpo. Recuerda: la curación es un viaje, no una carrera. Cada pequeño paso cuenta.`;

    if (proposal.acupuncture_points && proposal.acupuncture_points.length > 0) {
      empathicNarrative += ` Hoy usamos puntos cuidadosamente seleccionados para ayudar a tu cuerpo a encontrar su equilibrio. Tu tratamiento fue adaptado específicamente a tus necesidades individuales y tu patrón.`;
    }
  }

  // ─── Home Care Guide ───
  const homeCareInstructions = `• Descansa bien después del tratamiento — tu cuerpo está procesando el trabajo que hicimos hoy.
• Mantente abrigado y evita corrientes de aire frío, especialmente sobre las áreas tratadas.
• Bebe agua tibia durante el día para apoyar tu sistema.
• Si notas cualquier molestia inusual, por favor contáctanos inmediatamente.
• Mantén un diario simple de cómo te sientes — esto nos ayuda a refinar tu cuidado.`;

  // ─── Red Flags ───
  const redFlags = `Si experimentas síntomas severos o empeorantes, reacciones inusuales, o cualquier preocupación que te inquiete, por favor comunícate con nosotros o con tu médico de cabecera inmediatamente. Tu seguridad es nuestra máxima prioridad.`;

  // ─── Follow-up Plan ───
  const followUpPlan = isKantRed
    ? `Tu terapeuta te explicará los ajustes de seguridad en persona. Se reprogramará una nueva propuesta adaptada a ti.`
    : `Recomendamos programar tu próxima visita para continuar construyendo sobre la base de hoy. La consistencia es clave para un cambio duradero. Por favor reserva a tu mayor conveniencia.`;

    return {
    patient: {
      name: (patient as any).name || 'Paciente',
      preferredName: (patient as any).preferredName || (patient as any).name || 'Paciente',
      age: patient.age,
      gender: patient.sex,
    },
    session: {
      date: new Date(generatedAt).toISOString(),
    },
    practitioner: {
      name: undefined,
      qualification: undefined,
      clinic: undefined,
      phone: undefined,
    },
    sectionC: `${empathicNarrative}\n\nCUIDADOS EN CASA\n${homeCareInstructions}\n\nSEGUIMIENTO\n${followUpPlan}\n\nSEÑALES DE ALERTA\n${redFlags}`,
    hasEvolution: false,
    previousSyndrome: null,
  };
}


/**
 * LEGACY: Construye el HTML empático para el paciente.
 * @deprecated Usar buildEmpathicData + generateEmpathicPDF en su lugar.
 */
export function buildEmpathicHtml(input: FoucaultInput): { html: string; flags: AHPRAFlag[] } {
  const { clinicalInput, fukuokaResult, kantResult, generatedAt } = input;
  const syndrome = fukuokaResult.data.syndrome_analysis[0];
  const proposal = fukuokaResult.data.treatment_proposal;

  let empathicText = '';

  // ─── Saludo y contexto ───
  empathicText += 'Hola. Hemos revisado cuidadosamente lo que nos has compartido sobre tu salud. ';
  empathicText += 'Entendemos que has venido con ' + clinicalInput.symptoms.toLowerCase() + '. ';

  // ─── Síndrome MTC (siempre con disclaimer) ───
  if (syndrome) {
    empathicText += 'Desde la perspectiva de la Medicina Tradicional China, tu cuerpo nos esta mostrando un patron conocido como "' + syndrome.syndrome_name + '". ';
    empathicText += 'Esto describe como tu energia vital (Qi) necesita apoyo, especialmente en la digestion y el descanso. ';
    empathicText += 'No es un diagnostico medico occidental, sino una forma tradicional de entender tu equilibrio interno. ';
  }

  // ─── Estado KANT ───
  const normalizedKantStatus = String(kantResult.verdict).toUpperCase();
  const isKantRed = normalizedKantStatus === 'ROJO' || normalizedKantStatus === 'RED';
  const isKantYellow = normalizedKantStatus === 'AMARILLO' || normalizedKantStatus === 'YELLOW';

  if (isKantRed) {
    empathicText += '\n\nNuestro sistema de seguridad clinica ha detectado que algunos elementos de tu plan inicial requieren ajustes importantes antes de poder continuar. ';
    empathicText += 'Esto es una medida de proteccion estandar. Tu terapeuta revisara contigo los detalles seguros y personalizados en tu proxima consulta. ';
    empathicText += 'No te preocupes: este tipo de revision es habitual y garantiza que todo lo que hagamos sea apropiado para ti en este momento.';
  } else if (isKantYellow) {
    empathicText += '\n\nHemos preparado una propuesta inicial, pero tu terapeuta realizara algunas verificaciones adicionales antes de comenzar. ';
    empathicText += 'Esto nos permite adaptar todo con la maxima precision a tu situacion actual.';
  } else {
    // ─── Tratamiento (AHPRA-safe: condicional, nunca declarativo) ───
    empathicText += '\n\nBasandonos en nuestro analisis, hemos preparado un plan personalizado que incluye acupuntura y, si es apropiado, apoyo herbal. ';

    if (proposal.acupuncture_points && proposal.acupuncture_points.length > 0) {
      empathicText += 'Los puntos seleccionados se utilizan tradicionalmente para apoyar el equilibrio energetico y pueden ayudar a mejorar tu bienestar general. ';
    }

    if (proposal.herbal_formula) {
      empathicText += 'Se ha considerado un apoyo herbal personalizado basado en tu patron tradicional. ';
      empathicText += 'Tu terapeuta te explicara los detalles en la consulta si considera que es apropiado para tu caso. ';
    }
  }

  // ─── Próximos pasos ───
  empathicText += '\n\nProximos pasos:\n';
  if (isKantRed) {
    empathicText += '• Tu terapeuta te explicara los ajustes de seguridad en persona.\n';
    empathicText += '• Se reprogramara una nueva propuesta adaptada a ti.\n';
  } else {
    empathicText += '• Revision presencial con tu terapeuta registrado.\n';
    empathicText += '• Seguimiento de tu respuesta al tratamiento en 1-2 semanas.\n';
  }
  empathicText += '• Si tienes cualquier duda, contacta con la clinica antes de tu cita.';

  // ─── Disclaimer legal obligatorio AHPRA ───
  empathicText += '\n\nEste documento es informativo y no sustituye el consejo medico de tu medico de cabecera o especialista. ';
  empathicText += 'La acupuntura y la fitoterapia son terapias complementarias. Los resultados varian segun cada persona. ';
  empathicText += 'Nunca modifiques tu medicacion prescrita sin consultar a tu medico.';

  // ─── Sanitizar y escanear ───
  const { sanitized } = sanitizeForAHPRA(empathicText);
  const { flags } = scanTextForAHPRA(empathicText, "empathic_content");

  const kantColor = isKantRed ? '#dc2626' : isKantYellow ? '#d97706' : '#16a34a';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu plan de bienestar</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; color: #374151; line-height: 1.6; max-width: 600px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { font-size: 26px; color: #111827; margin: 0; }
    .header .date { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .content { font-size: 14px; text-align: justify; }
    .content p { margin: 12px 0; }
    .next-steps { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .next-steps h3 { margin-top: 0; font-size: 16px; color: #111827; }
    .next-steps ul { margin: 0; padding-left: 20px; }
    .next-steps li { margin: 6px 0; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
    .status { font-weight: bold; font-size: 13px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Tu plan de bienestar personalizado</h1>
    <div class="date">Fecha: ${new Date(generatedAt).toLocaleDateString('es-ES')}</div>
  </div>

  <div class="content">
    ${sanitized.split('\n').map((line: string) => {
      if (line.startsWith('•')) return `<p style="margin-left: 15px;">${line}</p>`;
      if (line.trim() === '') return '<br>';
      return `<p>${line}</p>`;
    }).join('')}
  </div>

  <div class="footer">
    <p>Este documento ha sido generado por un sistema de soporte clinico y revisado por filtros de seguridad. Tu terapeuta registrado tiene la ultima palabra sobre cualquier tratamiento.</p>
    <p class="status" style="color: ${kantColor};">Estado de validacion de seguridad: ${kantResult.verdict}</p>
  </div>
</body>
</html>`;

  return { html, flags };
}