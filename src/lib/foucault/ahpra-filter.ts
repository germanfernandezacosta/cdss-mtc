import { AHPRAFlag } from './types';

interface AHPRARule {
  id: string;
  pattern: RegExp;
  severity: 'CRITICAL' | 'WARNING';
  replacement: string;
  category: 'MEDICAL_CLAIM' | 'ALARMISM' | 'TITLE_MISUSE' | 'UNVERIFIED';
}

const AHPRA_RULES: AHPRARule[] = [
  {
    id: 'AHPRA-001',
    pattern: /\b(cure|cures|cured|curative)\b/gi,
    severity: 'CRITICAL',
    replacement: 'support management of',
    category: 'MEDICAL_CLAIM',
  },
  {
    id: 'AHPRA-002',
    pattern: /\b(heal completely|complete healing|total recovery guaranteed)\b/gi,
    severity: 'CRITICAL',
    replacement: 'support your body\'s natural balance',
    category: 'MEDICAL_CLAIM',
  },
  {
    id: 'AHPRA-003',
    pattern: /\b(100% effective|guaranteed results|always works|miracle)\b/gi,
    severity: 'CRITICAL',
    replacement: 'individual results may vary; we aim to support your wellbeing',
    category: 'UNVERIFIED',
  },
  {
    id: 'AHPRA-004',
    pattern: /\b(eliminates? (all |every )?toxins?|detoxifies? completely)\b/gi,
    severity: 'WARNING',
    replacement: 'supports the body\'s natural processes',
    category: 'ALARMISM',
  },
  {
    id: 'AHPRA-005',
    pattern: /\b(treats diabetes|cures cancer|fixes blood pressure|reverses [a-z]+ permanently)\b/gi,
    severity: 'CRITICAL',
    replacement: '[REDACTED — requires medical specialist oversight]',
    category: 'MEDICAL_CLAIM',
  },
  {
    id: 'AHPRA-006',
    pattern: /\b(stop your medication|replace your drugs|doctors don['']t want you to know)\b/gi,
    severity: 'CRITICAL',
    replacement: 'complementary approach — never discontinue prescribed medication without consulting your GP',
    category: 'MEDICAL_CLAIM',
  },
  {
    id: 'AHPRA-007',
    pattern: /\b(Dr\.? [A-Z][a-z]+(?: [A-Z][a-z]+)* (?:acupuncturist|therapist))\b/gi,
    severity: 'WARNING',
    replacement: 'your registered practitioner',
    category: 'TITLE_MISUSE',
  },
];

export function scanTextForAHPRA(text: string, location: 'empathic_content' | 'original_input'): { sanitized: string; flags: AHPRAFlag[] } {
  let sanitized = text;
  const flags: AHPRAFlag[] = [];

  for (const rule of AHPRA_RULES) {
    const matches = text.match(rule.pattern);
    if (matches) {
      for (const match of matches) {
        flags.push({
          ruleId: rule.id,
          term: match,
          location,
          severity: rule.severity,
          replacement: rule.replacement,
        });
      }
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
  }

  return { sanitized, flags };
}
