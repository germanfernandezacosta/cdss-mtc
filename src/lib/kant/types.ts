/**
 * KANT TYPES v1.0.0 — Tipos estrictos para el motor de reglas duras
 * Todo es inmutable, serializable y auditable.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SEVERIDAD
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = 'BLOCK' | 'WARN' | 'INFO';

// BLOCK = tratamiento NO autorizado (fail-safe)
// WARN = tratamiento autorizado con advertencia documentada
// INFO = información contextual, no afecta aprobación

// ─────────────────────────────────────────────────────────────────────────────
// CONDICIONES DE REGLAS
// ─────────────────────────────────────────────────────────────────────────────

export interface AgeConstraint {
  operator: '<' | '<=' | '>' | '>=' | '=';
  value: number;
  unit: 'years' | 'months' | 'weeks' | 'days';
}

export interface PointDetail {
  point: string;           // Ej: "9E", "4RM"
  name?: string;            // Nombre del punto en pinyin
  depth?: number;          // Profundidad en mm
  technique?: string;      // Técnica: tonificación, dispersión, equilibrado
  duration?: number;       // Tiempo de retención en minutos
  moxa?: boolean;          // ¿Se aplica moxibustión?
  electro?: boolean;        // ¿Se aplica electroacupuntura?
}

export interface HerbDetail {
  name: string;            // Nombre en pinyin
  latinName?: string;      // Nombre científico
  dosage?: number;          // Dosis en gramos
  form?: string;           // Forma: decocción, polvo, píldora, etc.
  duration?: number;       // Duración en días
}

export type ConditionType =
  | 'forbidden_point'           // Punto prohibido absolutamente
  | 'forbidden_point_age'       // Punto prohibido por edad
  | 'max_depth'                 // Profundidad máxima permitida
  | 'forbidden_combination'     // Combinación de puntos prohibida
  | 'scope_limitation'          // Limitación de alcance de práctica
  | 'pathology_restriction'     // Restricción por patología
  | 'medication_interaction'    // Interacción medicamento-hierba
  | 'technique_restriction'     // Restricción técnica
  | 'equipment_restriction'   // Restricción de equipamiento
  | 'documentation_required';   // Documentación obligatoria

export interface KantRuleCondition {
  type: ConditionType;

  // Campos comunes
  point?: string;
  name?: string;
  reason?: string;
  source?: string;
  applies_to?: string[];

  // Campos específicos por tipo
  age_constraint?: AgeConstraint;
  max_depth_mm?: number;
  risk?: string;
  points?: string[];              // Para forbidden_combination
  action?: string;                // Para scope_limitation
  pathology?: string;             // Para pathology_restriction
  restricted_action?: string;     // Para pathology_restriction
  restricted_points?: string[];     // Para pathology_restriction
  medication?: string;             // Para medication_interaction
  forbidden_herbs?: string[];      // Para medication_interaction
  interaction_mechanism?: string;  // Para medication_interaction
}

// ─────────────────────────────────────────────────────────────────────────────
// REGLA KANT
// ─────────────────────────────────────────────────────────────────────────────

export interface KantRule {
  id: string;                    // Ej: "AU-SAFETY-001a"
  domain: string;                // Ej: "contraindication_absolute"
  jurisdiction: string;          // Ej: "AU", "CA", "UK", "US"
  severity: Severity;
  condition: KantRuleCondition;
  message: string;               // Mensaje para el terapeuta
  remediation: string;           // Qué hacer en caso de violación
  source: string;              // Fuente de la regla (CEMETC, AHPRA, etc.)
  version: string;               // Versión del set de reglas
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXTO DEL PACIENTE
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientContext {
  id: string;                    // ID del paciente en EHR
  age?: number;                  // Edad en años (para cálculos)
  ageInMonths?: number;          // Para pediatría precisa
  gender?: 'male' | 'female' | 'other';
  weight?: number;               // Peso en kg

  // Condiciones médicas
  pathologies?: string[];        // Ej: ["diabetes_type_2", "hypertension"]
  allergies?: string[];          // Alergias conocidas

  // Medicación
  medications?: string[];         // Ej: ["warfarin", "metformin"]

  // Estado de embarazo
  pregnancy?: {
    isPregnant: boolean;
    trimester?: 1 | 2 | 3;
    weeks?: number;
  };

  // Historial MTC
  previousTreatments?: string[]; // IDs de tratamientos previos
  reactions?: string[];          // Reacciones adversas previas

  // Datos específicos MTC
  constitution?: string;         // Constitución MTC
  ryodoraku?: Record<string, number>; // Valores Ryodoraku por meridiano
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPUESTA DE TRATAMIENTO
// ─────────────────────────────────────────────────────────────────────────────

export interface TreatmentProposal {
  id: string;                    // ID único de la propuesta
  patientId: string;             // Referencia al paciente
  generatedBy: 'fukuoka-h' | 'human' | 'manual'; // Quién generó la propuesta
  generatedAt: string;          // ISO 8601 timestamp

  // Componentes del tratamiento
  points: PointDetail[];
  herbs?: HerbDetail[];
  techniques?: string[];          // Técnicas adicionales (moxa, ventosas, etc.)
  actions?: string[];            // Acciones del terapeuta (diagnóstico, etc.)

  // Metadatos
  diagnosis?: string;           // Diagnóstico MTC propuesto
  confidence?: number;          // Confianza de Fukuoka-H (0-1)
}

// ─────────────────────────────────────────────────────────────────────────────
// VEREDICTO KANT
// ─────────────────────────────────────────────────────────────────────────────

export interface KantViolation {
  ruleId: string;
  domain: string;
  severity: Severity;
  message: string;
  remediation: string;
  source: string;
  version: string;
  context?: Record<string, unknown>; // Datos contextuales de la violación
}

export interface KantVerdict {
  approved: boolean;             // true = tratamiento autorizado
  violations: KantViolation[];   // Solo BLOCK
  warnings: KantViolation[];     // WARN e INFO

  // Metadatos de auditoría
  timestamp: string;             // ISO 8601
  engineVersion: string;         // Versión del motor Kant
  jurisdiction: string;          // Jurisdicción evaluada
  ruleSetVersion: string;        // Versión del catálogo de reglas
  hash: string;                 // Hash criptográfico del veredicto

  // Huella humana (se completa en capa superior)
  humanOverride?: {
    overriddenBy: string;       // ID del terapeuta
    overriddenAt: string;        // Timestamp
    reason: string;             // Justificación legal obligatoria
    originalVerdict: boolean;   // Veredicto original de Kant
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CARGADOR DE REGLAS
// ─────────────────────────────────────────────────────────────────────────────

export interface RulesCatalog {
  version: string;
  jurisdiction: string;
  domain: string;
  description: string;
  validatedBy: string;
  validationDate: string;
  rules: KantRule[];
}

export interface RulesLoader {
  load(jurisdiction: string, domain: string): Promise<KantRule[]>;
  loadAll(jurisdiction: string): Promise<KantRule[]>;
  validateCatalog(catalog: RulesCatalog): boolean;
}