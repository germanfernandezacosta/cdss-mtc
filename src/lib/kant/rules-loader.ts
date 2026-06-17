/**
 * KANT RULES LOADER v1.0.0 — Carga y validación de catálogos de reglas
 * Valida estructura JSON contra schema antes de cargar en motor.
 */

import { KantRule, RulesCatalog } from './types';

/**
 * Carga un catálogo de reglas desde JSON y valida su estructura.
 * Lanza error si el JSON es inválido o corrupto.
 */
export function loadRulesFromJSON(jsonData: string | object): KantRule[] {
  let catalog: RulesCatalog;

  if (typeof jsonData === 'string') {
    try {
      catalog = JSON.parse(jsonData);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(`KANT-RULES-001: JSON inválido — ${message}`);
    }
  } else {
    catalog = jsonData as RulesCatalog;
  }

  validateCatalog(catalog);

  return catalog.rules;
}

/**
 * Valida la estructura completa del catálogo de reglas.
 * Cada campo obligatorio se verifica con tipo correcto.
 */
export function validateCatalog(catalog: RulesCatalog): void {
  // Validar metadatos del catálogo
  if (!catalog.version || typeof catalog.version !== 'string') {
    throw new Error('KANT-RULES-002: Catálogo sin versión');
  }

  if (!catalog.jurisdiction || typeof catalog.jurisdiction !== 'string') {
    throw new Error('KANT-RULES-003: Catálogo sin jurisdicción');
  }

  if (!catalog.domain || typeof catalog.domain !== 'string') {
    throw new Error('KANT-RULES-004: Catálogo sin dominio');
  }

  if (!Array.isArray(catalog.rules)) {
    throw new Error('KANT-RULES-005: Catálogo sin array de reglas');
  }

  // Validar cada regla individualmente
  for (let i = 0; i < catalog.rules.length; i++) {
    validateRule(catalog.rules[i], i);
  }

  // Validar unicidad de IDs
  const ids = catalog.rules.map(r => r.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new Error(`KANT-RULES-006: IDs duplicados encontrados: ${duplicates.join(', ')}`);
  }
}

/**
 * Valida una regla individual.
 */
function validateRule(rule: KantRule, index: number): void {
  const prefix = `KANT-RULES-007[regla ${index}, id=${rule?.id ?? 'desconocido'}]`;

  if (!rule) {
    throw new Error(`${prefix}: Regla nula o indefinida`);
  }

  // ID obligatorio
  if (!rule.id || typeof rule.id !== 'string') {
    throw new Error(`${prefix}: ID de regla inválido`);
  }

  // Formato de ID: {JURISDICTION}-{DOMAIN}-{NNN}{letra opcional}
  const idPattern = /^[A-Z]{2}-[A-Z]+-\d{3}[a-z]?$/;
  if (!idPattern.test(rule.id)) {
    throw new Error(`${prefix}: Formato de ID inválido. Esperado: XX-XXXX-NNNa. Recibido: ${rule.id}`);
  }

  // Dominio
  if (!rule.domain || typeof rule.domain !== 'string') {
    throw new Error(`${prefix}: Dominio inválido`);
  }

  // Jurisdicción
  if (!rule.jurisdiction || typeof rule.jurisdiction !== 'string') {
    throw new Error(`${prefix}: Jurisdicción inválida`);
  }

  // Severidad
  const validSeverities = ['BLOCK', 'WARN', 'INFO'];
  if (!validSeverities.includes(rule.severity)) {
    throw new Error(`${prefix}: Severidad inválida: ${rule.severity}. Valores válidos: ${validSeverities.join(', ')}`);
  }

  // Condición
  if (!rule.condition || typeof rule.condition !== 'object') {
    throw new Error(`${prefix}: Condición inválida`);
  }

  const validConditionTypes = [
    'forbidden_point', 'forbidden_point_age', 'max_depth',
    'forbidden_combination', 'scope_limitation', 'pathology_restriction',
    'medication_interaction', 'technique_restriction', 'equipment_restriction',
    'documentation_required'
  ];

  if (!validConditionTypes.includes(rule.condition.type)) {
    throw new Error(`${prefix}: Tipo de condición inválido: ${rule.condition.type}`);
  }

  // Validar campos específicos según tipo de condición
  validateConditionFields(rule, prefix);

  // Mensaje y remediación
  if (!rule.message || typeof rule.message !== 'string' || rule.message.length < 10) {
    throw new Error(`${prefix}: Mensaje inválido o demasiado corto`);
  }

  if (!rule.remediation || typeof rule.remediation !== 'string' || rule.remediation.length < 10) {
    throw new Error(`${prefix}: Remediación inválida o demasiado corta`);
  }

  // Fuente
  if (!rule.source || typeof rule.source !== 'string') {
    throw new Error(`${prefix}: Fuente inválida`);
  }

  // Versión
  if (!rule.version || typeof rule.version !== 'string') {
    throw new Error(`${prefix}: Versión inválida`);
  }
}

/**
 * Valida campos específicos según el tipo de condición.
 */
function validateConditionFields(rule: KantRule, prefix: string): void {
  const condition = rule.condition;

  switch (condition.type) {
    case 'forbidden_point':
      if (!condition.point) {
        throw new Error(`${prefix}: forbidden_point requiere campo 'point'`);
      }
      break;

    case 'forbidden_point_age':
      if (!condition.point) {
        throw new Error(`${prefix}: forbidden_point_age requiere campo 'point'`);
      }
      if (!condition.age_constraint) {
        throw new Error(`${prefix}: forbidden_point_age requiere 'age_constraint'`);
      }
      const validOperators = ['<', '<=', '>', '>=', '='];
      if (!validOperators.includes(condition.age_constraint.operator)) {
        throw new Error(`${prefix}: Operador de edad inválido`);
      }
      if (typeof condition.age_constraint.value !== 'number' || condition.age_constraint.value <= 0) {
        throw new Error(`${prefix}: Valor de edad inválido`);
      }
      const validUnits = ['years', 'months', 'weeks', 'days'];
      if (!validUnits.includes(condition.age_constraint.unit)) {
        throw new Error(`${prefix}: Unidad de edad inválida`);
      }
      break;

    case 'max_depth':
      if (!condition.point) {
        throw new Error(`${prefix}: max_depth requiere campo 'point'`);
      }
      if (typeof condition.max_depth_mm !== 'number' || condition.max_depth_mm <= 0) {
        throw new Error(`${prefix}: max_depth requiere 'max_depth_mm' numérico positivo`);
      }
      break;

    case 'forbidden_combination':
      if (!Array.isArray(condition.points) || condition.points.length < 2) {
        throw new Error(`${prefix}: forbidden_combination requiere array 'points' con mínimo 2 elementos`);
      }
      break;

    case 'scope_limitation':
      if (!condition.action) {
        throw new Error(`${prefix}: scope_limitation requiere campo 'action'`);
      }
      break;

    case 'pathology_restriction':
      if (!condition.pathology) {
        throw new Error(`${prefix}: pathology_restriction requiere campo 'pathology'`);
      }
      break;

    case 'medication_interaction':
      if (!condition.medication) {
        throw new Error(`${prefix}: medication_interaction requiere campo 'medication'`);
      }
      if (!Array.isArray(condition.forbidden_herbs) || condition.forbidden_herbs.length === 0) {
        throw new Error(`${prefix}: medication_interaction requiere array 'forbidden_herbs'`);
      }
      break;
  }
}

/**
 * Carga múltiples catálogos y los fusiona en un solo array de reglas.
 * Útil para cargar todos los dominios de una jurisdicción.
 */
export function loadMultipleCatalogs(catalogs: (string | object)[]): KantRule[] {
  const allRules: KantRule[] = [];

  for (const catalog of catalogs) {
    const rules = loadRulesFromJSON(catalog);
    allRules.push(...rules);
  }

  // Verificar que no haya IDs duplicados entre catálogos
  const ids = allRules.map(r => r.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new Error(`KANT-RULES-008: IDs duplicados entre catálogos: ${duplicates.join(', ')}`);
  }

  return allRules;
}