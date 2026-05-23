import { FoucaultInput, AHPRAFlag } from './types';
import { scanTextForAHPRA } from './ahpra-filter';

export function buildEmpathicHtml(input: FoucaultInput): { html: string; flags: AHPRAFlag[] } {
  const { clinicalInput, fukuokaResult, kantResult, generatedAt } = input;
  const syndrome = fukuokaResult.data.syndrome_analysis[0];
  const proposal = fukuokaResult.data.treatment_proposal;

  let empathicText = '';
  empathicText += 'Hola. Hemos revisado cuidadosamente lo que nos has compartido sobre tu salud. ';
  empathicText += 'Entendemos que has venido con ' + clinicalInput.symptoms.toLowerCase() + '. ';

  if (syndrome) {
    empathicText += 'Desde la perspectiva de la Medicina Tradicional China, tu cuerpo nos esta mostrando un patron conocido como "' + syndrome.syndrome_name + '". ';
    empathicText += 'Esto describe como tu energia vital (Qi) necesita apoyo, especialmente en la digestion y el descanso. ';
    empathicText += 'No es un diagnostico medico occidental, sino una forma tradicional de entender tu equilibrio interno. ';
  }

  if (kantResult.verdict === 'ROJO') {
    empathicText += '\n\nNuestro sistema de seguridad clinica ha detectado que algunos elementos de tu plan inicial requieren ajustes importantes antes de poder continuar. ';
    empathicText += 'Esto es una medida de proteccion estandar. Tu terapeuta revisara contigo los detalles seguros y personalizados en tu proxima consulta. ';
    empathicText += 'No te preocupes: este tipo de revision es habitual y garantiza que todo lo que hagamos sea apropiado para ti en este momento.';
  } else if (kantResult.verdict === 'AMARILLO') {
    empathicText += '\n\nHemos preparado una propuesta inicial, pero tu terapeuta realizara algunas verificaciones adicionales antes de comenzar. ';
    empathicText += 'Esto nos permite adaptar todo con la maxima precision a tu situacion actual.';
  } else {
    empathicText += '\n\nBasandonos en nuestro analisis, hemos preparado un plan personalizado que incluye acupuntura y, si es apropiado, apoyo herbal. ';
    empathicText += 'Los puntos seleccionados trabajan para tonificar tu energia y mejorar tu descanso. ';
    if (proposal.herbal_formula) {
      empathicText += 'La formula ' + proposal.herbal_formula + ' se utiliza tradicionalmente para nutrir el bazo y el corazon, promoviendo mejor sueno y digestion. ';
    }
  }

  empathicText += '\n\nProximos pasos:\n';
  if (kantResult.verdict === 'ROJO') {
    empathicText += '• Tu terapeuta te explicara los ajustes de seguridad en persona.\n';
    empathicText += '• Se reprogramara una nueva propuesta adaptada a ti.\n';
  } else {
    empathicText += '• Revision presencial con tu terapeuta registrado.\n';
    empathicText += '• Seguimiento de tu respuesta al tratamiento en 1-2 semanas.\n';
  }
  empathicText += '• Si tienes cualquier duda, contacta con la clinica antes de tu cita.';

  empathicText += '\n\nEste documento es informativo y no sustituye el consejo medico de tu medico de cabecera o especialista. ';
  empathicText += 'La acupuntura y la fitoterapia son terapias complementarias. Los resultados varian segun cada persona. ';
  empathicText += 'Nunca modifiques tu medicacion prescrita sin consultar a tu medico.';

  const { sanitized, flags } = scanTextForAHPRA(empathicText, 'empathic_content');

  const kantColor = kantResult.verdict === 'ROJO' ? '#dc2626' : kantResult.verdict === 'AMARILLO' ? '#d97706' : '#16a34a';

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
    ${sanitized.split('\n').map(line => {
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