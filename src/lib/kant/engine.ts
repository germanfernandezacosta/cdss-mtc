/**
 * KANT v2.2 — Motor de Seguridad Clínica + AHPRA Compliance
 * Fix: scoring ajustado para reflejar severidad clínica real + matching flexible de técnicas.
 * NUEVO: Integración AHPRA (advertising restrictions, scope of practice, mandatory referral)
 */

import * as fs from "fs";
import * as path from "path";
import {
  PatientSafetyProfile,
  ProposedTreatment,
  KantResult,
  SafetyAlert,
  SafetyContraindication,
  KantStatus,
  SafetySeverity,
  FukuokaProposal,
  PatientContext,
} from "./types";

const RULES_PATH = process.env.KANT_RULES_PATH ||
  path.resolve(process.cwd(), "data/kant/safety-rules.json");

const AHPRA_RULES_PATH = process.env.AHPRA_RULES_PATH ||
  path.resolve(process.cwd(), "data/kant/ahpra-rules.json");

let cachedRules: any = null;
let cachedAhpraRules: any = null;

function loadRules(): any {
  if (cachedRules) return cachedRules;
  const raw = fs.readFileSync(RULES_PATH, "utf-8");
  cachedRules = JSON.parse(raw);
  return cachedRules;
}

function loadAhpraRules(): any {
  if (cachedAhpraRules) return cachedAhpraRules;
  if (!fs.existsSync(AHPRA_RULES_PATH)) {
    console.warn("[KANT] AHPRA rules not found:", AHPRA_RULES_PATH);
    return null;
  }
  const raw = fs.readFileSync(AHPRA_RULES_PATH, "utf-8");
  cachedAhpraRules = JSON.parse(raw);
  return cachedAhpraRules;
}

export class KantEngine {
  private rules: any;
  private ahpraRules: any;

  constructor() {
    this.rules = loadRules();
    this.ahpraRules = loadAhpraRules();
  }

  // ═══════════════════════════════════════════════════════════════
  // NORMALIZACIÓN DE PUNTOS (método de clase, NO dentro de evaluate)
  // ═══════════════════════════════════════════════════════════════
  private normalizePoint(pointName: string): string {
    if (!pointName) return "";

    const clean = pointName.toUpperCase()
      .replace(/\s/g, "")           // quitar espacios
      .replace(/[()]/g, "")          // quitar paréntesis
      .replace(/-/g, "");           // quitar guiones

    // Mapa de sinónimos comunes
    const synonyms: Record<string, string> = {
      // Sanyinjiao / SP6
      "6BP": "SP6", "BP6": "SP6", "SP6": "SP6", "SANYINJIAO": "SP6",
      // Zusanli / ST36
      "36E": "ST36", "E36": "ST36", "ST36": "ST36", "ZUSANLI": "ST36",
      // Zhongwan / CV12
      "12RM": "CV12", "RM12": "CV12", "CV12": "CV12", "ZHONGWAN": "CV12",
      // Pishu / BL20
      "20V": "BL20", "V20": "BL20", "BL20": "BL20", "PISHU": "BL20",
      // Zhangmen / LR13
      "13H": "LR13", "H13": "LR13", "LR13": "LR13", "ZHANGMEN": "LR13",
      // Hegu / LI4
      "4GI": "LI4", "GI4": "LI4", "LI4": "LI4", "HEGU": "LI4",
      // Jianjing / GB21
      "21VB": "GB21", "VB21": "GB21", "GB21": "GB21", "JIANJING": "GB21",
      // Kunlun / BL60
      "60V": "BL60", "V60": "BL60", "BL60": "BL60", "KUNLUN": "BL60",
      // Zhiyin / BL67
      "67V": "BL67", "V67": "BL67", "BL67": "BL67", "ZHIYIN": "BL67",
      // Shaoze / SI1
      "1IG": "SI1", "IG1": "SI1", "SI1": "SI1", "SHAOZE": "SI1",
      // Quepen / ST12
      "12E": "ST12", "E12": "ST12", "ST12": "ST12", "QUEPEN": "ST12",
      // Daimai / GB26
      "26VB": "GB26", "VB26": "GB26", "GB26": "GB26", "DAIMAI": "GB26",
      // Wushu / GB27
      "27VB": "GB27", "VB27": "GB27", "GB27": "GB27", "WUSHU": "GB27",
      // Weidao / GB28
      "28VB": "GB28", "VB28": "GB28", "GB28": "GB28", "WEIDAO": "GB28",
      // Juliao / GB29
      "29VB": "GB29", "VB29": "GB29", "GB29": "GB29", "JULIAO": "GB29",
      // Huantiao / GB30
      "30VB": "GB30", "VB30": "GB30", "GB30": "GB30", "HUANTIAO": "GB30",
      // Baliao
      "BALIAO": "BL31-34", "8AGUJEROS": "BL31-34", "31-34V": "BL31-34",
      // Zhongji / CV3
      "3RM": "CV3", "RM3": "CV3", "CV3": "CV3", "ZHONGJI": "CV3",
      // Guanyuan / CV4
      "4RM": "CV4", "RM4": "CV4", "CV4": "CV4", "GUANYUAN": "CV4",
      // Shimen / CV5
      "5RM": "CV5", "RM5": "CV5", "CV5": "CV5", "SHIMEN": "CV5",
      // Qihai / CV6
      "6RM": "CV6", "RM6": "CV6", "CV6": "CV6", "QIHAO": "CV6",
      // Yinjiao / CV7
      "7RM": "CV7", "RM7": "CV7", "CV7": "CV7", "YINJIAO": "CV7",
    };

    return synonyms[clean] || clean;
  }

  // ═══════════════════════════════════════════════════════════════
  // EVALUACIÓN PRINCIPAL
  // ═══════════════════════════════════════════════════════════════
  evaluate(
    patient: PatientSafetyProfile,
    treatment: ProposedTreatment = {},
    clinicalText?: string // NUEVO: texto clínico para scan AHPRA advertising
  ): KantResult {
    const alerts: SafetyAlert[] = [];
    const contraindications: SafetyContraindication[] = [];
    const auditTrail: string[] = [];

    // ─── AHPRA CHECKS (nuevo) ───
    if (this.ahpraRules && clinicalText) {
      auditTrail.push("AHPRA:advertisingRestrictions:evaluated");
      this.checkAhpraAdvertising(clinicalText, alerts, contraindications, auditTrail);

      auditTrail.push("AHPRA:scopeOfPractice:evaluated");
      this.checkAhpraScopeOfPractice(patient, treatment, alerts, contraindications, auditTrail);

      auditTrail.push("AHPRA:mandatoryReferral:evaluated");
      this.checkAhpraMandatoryReferral(patient, alerts, auditTrail);
    }

    // ─── SAFETY CHECKS (existentes) ───
    if (patient.pregnancy) {
      auditTrail.push("RULE:pregnancy:evaluated");
      this.checkPregnancy(patient, treatment, alerts, contraindications, auditTrail);
    }

    if (patient.currentPharmaceuticals && patient.currentPharmaceuticals.length > 0) {
      auditTrail.push("RULE:herbDrugInteractions:evaluated");
      this.checkHerbDrugInteractions(patient, treatment, alerts, contraindications, auditTrail);
    }

    this.checkDevices(patient, treatment, alerts, contraindications, auditTrail);

    if ((patient.anticoagulants && patient.anticoagulants.length > 0) ||
        (patient.antiplatelets && patient.antiplatelets.length > 0)) {
      auditTrail.push("RULE:anticoagulantPrecautions:evaluated");
      this.checkAnticoagulants(patient, treatment, alerts, contraindications, auditTrail);
    }

    if (patient.epilepsy) {
      auditTrail.push("RULE:epilepsy:evaluated");
      this.checkEpilepsy(patient, treatment, alerts, contraindications, auditTrail);
    }

    if (patient.chemotherapyActive || patient.radiationActive || patient.lymphedema) {
      auditTrail.push("RULE:oncoSafety:evaluated");
      this.checkOncology(patient, treatment, alerts, contraindications, auditTrail);
    }

    if (patient.age !== undefined && patient.age < 18) {
      auditTrail.push("RULE:pediatricSafety:evaluated");
      this.checkPediatric(patient, treatment, alerts, contraindications, auditTrail);
    }

    const score = this.calculateScore(contraindications, alerts);
    const status = this.determineStatus(score, contraindications, alerts);

    return {
      verdict: status,
      status,
      score,
      alerts,
      contraindications,
      clearedForTreatment: status === "green",
      requiresSupervision: status === "yellow",
      requiresPhysicianClearance: status === "red",
      auditTrail,
      engineVersion: "KANT-v2.2-AHPRA",
      evaluatedAt: new Date().toISOString(),
      totalRulesChecked: auditTrail.length,
      originalProposalHash: undefined,
      violations: undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // AHPRA SUB-MOTORES (nuevos)
  // ═══════════════════════════════════════════════════════════════

  private checkAhpraAdvertising(
    clinicalText: string,
    alerts: SafetyAlert[],
    contraindications: SafetyContraindication[],
    auditTrail: string[]
  ): void {
    if (!this.ahpraRules?.advertisingRestrictions?.prohibitedClaims) return;

    const textLower = clinicalText.toLowerCase();
    const prohibited = this.ahpraRules.advertisingRestrictions.prohibitedClaims;

    for (const claim of prohibited) {
      const claimLower = claim.claim.toLowerCase();
      // Match si el texto contiene la claim prohibida
      if (textLower.includes(claimLower)) {
        const severity = claim.severity as SafetySeverity;

        contraindications.push({
          item: claim.claim,
          type: "technique", // reutilizamos tipo existente
          reason: `AHPRA Advertising Restrictions: ${claim.reason}`,
          severity,
          alternative: claim.replacement || "Consultar AHPRA Guidelines",
        });

        alerts.push({
          code: `AHPRA-ADV-${claim.claim.substring(0, 3).toUpperCase()}`,
          category: "ahpraAdvertising",
          severity,
          message: `Claim prohibido por AHPRA: "${claim.claim}"`,
          sourceRule: `ahpra-rules.advertisingRestrictions.${claim.claim}`,
          recommendation: claim.replacement || "Revisar lenguaje según AHPRA Section 133",
          affectedItems: [claim.claim],
        });

        auditTrail.push(`ALERT:ahpra:advertising:${claim.claim}:${severity}`);
      }
    }
  }

  private checkAhpraScopeOfPractice(
    patient: PatientSafetyProfile,
    treatment: ProposedTreatment,
    alerts: SafetyAlert[],
    contraindications: SafetyContraindication[],
    auditTrail: string[]
  ): void {
    if (!this.ahpraRules?.scopeOfPractice?.prohibitedProcedures) return;

    const prohibited = this.ahpraRules.scopeOfPractice.prohibitedProcedures;

    for (const proc of prohibited) {
      // Si el tratamiento incluye técnicas prohibidas
      if (treatment.techniques) {
        for (const tech of treatment.techniques) {
          if (tech.toLowerCase().includes(proc.procedure.toLowerCase())) {
            contraindications.push({
              item: proc.procedure,
              type: "technique",
              reason: `AHPRA Scope of Practice: ${proc.reason}`,
              severity: proc.severity as SafetySeverity,
              alternative: "Fuera del scope del practicante de TCM registrado",
            });

            alerts.push({
              code: `AHPRA-SCOPE-${proc.procedure.substring(0, 3).toUpperCase()}`,
              category: "ahpraScope",
              severity: proc.severity as SafetySeverity,
              message: `Procedimiento fuera de scope AHPRA: ${proc.procedure}`,
              sourceRule: `ahpra-rules.scopeOfPractice.${proc.procedure}`,
              recommendation: "Requiere derivación a profesional médico registrado",
            });

            auditTrail.push(`ALERT:ahpra:scope:${proc.procedure}:${proc.severity}`);
          }
        }
      }
    }
  }

  private checkAhpraMandatoryReferral(
    patient: PatientSafetyProfile,
    alerts: SafetyAlert[],
    auditTrail: string[]
  ): void {
    if (!this.ahpraRules?.scopeOfPractice?.mandatoryReferral?.conditions) return;

    const conditions = this.ahpraRules.scopeOfPractice.mandatoryReferral.conditions;
    const searchText = (
  (patient.knownAllergies?.join(" ") || "") + " " +
  (patient.medicalHistory || "") + " " +
  (patient.currentPharmaceuticals?.join(" ") || "")
).toLowerCase();

    for (const condition of conditions) {
      const conditionLower = condition.condition.toLowerCase();
      // Match si el historial médico contiene la condición
      if (searchText.includes(conditionLower)) {
        alerts.push({
          code: `AHPRA-REF-${condition.condition.substring(0, 3).toUpperCase()}`,
          category: "ahpraReferral",
          severity: condition.severity as SafetySeverity,
          message: `Derivación médica obligatoria (AHPRA): ${condition.condition}`,
          sourceRule: `ahpra-rules.mandatoryReferral.${condition.condition}`,
          recommendation: `${condition.reason}. Urgencia: ${condition.referralUrgency}`,
          affectedItems: [condition.condition],
        });

        auditTrail.push(`ALERT:ahpra:referral:${condition.condition}:${condition.referralUrgency}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SUB-MOTORES EXISTENTES (sin cambios)
  // ═══════════════════════════════════════════════════════════════

  private checkPregnancy(
    patient: PatientSafetyProfile,
    treatment: ProposedTreatment,
    alerts: SafetyAlert[],
    contraindications: SafetyContraindication[],
    auditTrail: string[]
  ): void {
    const rules = this.rules.pregnancy;
    if (!rules) return;

    if (treatment.points) {
      for (const point of treatment.points) {
        const normalizedPoint = this.normalizePoint(point);

        const match = rules.forbiddenPoints.find(
          (fp: any) => {
            const fpNormalized = this.normalizePoint(fp.point);
            return fpNormalized === normalizedPoint ||
                   normalizedPoint.includes(fpNormalized) ||
                   fpNormalized.includes(normalizedPoint);
          }
        );

        if (match) {
          contraindications.push({
            item: point,
            type: "point",
            reason: `Punto prohibido en embarazo: ${match.reason}`,
            severity: match.severity as SafetySeverity,
            alternative: "Consultar puntos seguros: ST36, SP9, PC6, Yintang",
          });
          auditTrail.push(`ALERT:pregnancy:point:${point}:${match.severity}`);
        }
      }
    }

    if (treatment.herbs) {
      for (const herb of treatment.herbs) {
        const match = rules.forbiddenHerbs.find(
          (fh: any) => {
            const names = fh.herb.toLowerCase().split("/").map((s: string) => s.trim());
            return names.some((n: string) => herb.toLowerCase().includes(n) || n.includes(herb.toLowerCase()));
          }
        );
        if (match) {
          contraindications.push({
            item: herb,
            type: "herb",
            reason: `Hierba contraindicada en embarazo: ${match.reason}`,
            severity: match.severity as SafetySeverity,
            alternative: match.note || "Sustituir por Bai Shao / Shu Di Huang bajo supervisión",
          });
          auditTrail.push(`ALERT:pregnancy:herb:${herb}:${match.severity}`);
        }
      }
    }

    alerts.push({
      code: "KANT-PREG-001",
      category: "pregnancy",
      severity: "moderate",
      message: "Paciente en embarazo. Requiere protocolo de seguridad MTC-OB.",
      sourceRule: "pregnancy._description",
      recommendation: "Documentar trimestre. Evitar puntos/hierbas prohibidas. Preferir técnicas no invasivas (moxa, tuina suave).",
      affectedItems: treatment.points?.concat(treatment.herbs || []) || [],
    });
  }

  private checkHerbDrugInteractions(
    patient: PatientSafetyProfile,
    treatment: ProposedTreatment,
    alerts: SafetyAlert[],
    contraindications: SafetyContraindication[],
    auditTrail: string[]
  ): void {
    const rules = this.rules.herbDrugInteractions;
    if (!rules || !rules.interactions) return;

    const patientDrugs = (patient.currentPharmaceuticals || []).map((d) => d.toLowerCase());
    const proposedHerbs = (treatment.herbs || []).map((h) => h.toLowerCase());

    for (const interaction of rules.interactions) {
      const herbNames = interaction.herb.toLowerCase().split("/").map((s: string) => s.trim());
      const herbMatch = proposedHerbs.some((ph) =>
        herbNames.some((hn: string) => ph.includes(hn) || hn.includes(ph))
      );
      if (!herbMatch) continue;

      const drugMatch = patientDrugs.some((pd) =>
        interaction.drugs.some((d: string) => pd.includes(d.toLowerCase()) || d.toLowerCase().includes(pd))
      );
      if (!drugMatch) continue;

      const severity = interaction.severity as SafetySeverity;
      contraindications.push({
        item: `${interaction.herb} + ${interaction.drugClass}`,
        type: "drug",
        reason: interaction.mechanism,
        severity,
        alternative: interaction.recommendation,
      });

      alerts.push({
        code: `KANT-HDI-${interaction.herb.substring(0, 3).toUpperCase()}`,
        category: "herbDrug",
        severity,
        message: `Interacción hierba-fármaco detectada: ${interaction.herb} con ${interaction.drugClass}`,
        sourceRule: `herbDrugInteractions.${interaction.herb}`,
        recommendation: interaction.recommendation,
        affectedItems: [interaction.herb, ...interaction.drugs],
      });

      auditTrail.push(`ALERT:herbDrug:${interaction.herb}:${interaction.drugClass}:${severity}`);
    }
  }

  private checkDevices(
    patient: PatientSafetyProfile,
    treatment: ProposedTreatment,
    alerts: SafetyAlert[],
    contraindications: SafetyContraindication[],
    auditTrail: string[]
  ): void {
    const rules = this.rules.deviceContraindications;
    if (!rules) return;

    const devices: Array<{ key: string; label: string }> = [
      { key: "pacemaker", label: "Marcapasos" },
      { key: "cochlearImplant", label: "Implante coclear" },
      { key: "insulinPump", label: "Bomba de insulina" },
      { key: "deepBrainStimulator", label: "Estimulador cerebral profundo (DBS)" },
      { key: "spinalCordStimulator", label: "Estimulador de médula espinal" },
      { key: "intracranialMetal", label: "Metal intracraneal" },
    ];

    for (const device of devices) {
      if (!(patient as any)[device.key]) continue;
      const rule = rules[device.key];
      if (!rule) continue;

      auditTrail.push(`RULE:device:${device.key}:evaluated`);

      if (rule.forbidden && treatment.techniques) {
        for (const tech of treatment.techniques) {
          const techLower = tech.toLowerCase();
          const matched = rule.forbidden.some((f: string) => {
            const fLower = f.toLowerCase();
            const forbiddenKeywords = ["electroacupuntura", "tens", "laseracupuntura", "magnetoterapia", "sangrado", "wet cupping"];
            return forbiddenKeywords.some((kw) => fLower.includes(kw) && techLower.includes(kw));
          });

          if (matched) {
            contraindications.push({
              item: tech,
              type: "technique",
              reason: `${device.label}: ${rule.reason}`,
              severity: rule.severity as SafetySeverity,
              alternative: rule.allowed?.join(", ") || "Acupuntura manual",
            });
            auditTrail.push(`ALERT:device:${device.key}:technique:${tech}`);
          }
        }
      }

      const hasNeedles = treatment.points && treatment.points.length > 0;
      const isHighRiskDevice = ["pacemaker", "deepBrainStimulator", "spinalCordStimulator"].includes(device.key);
      if (isHighRiskDevice && hasNeedles && !contraindications.some(c => c.type === "technique")) {
        alerts.push({
          code: `KANT-DEV-${device.key.substring(0, 3).toUpperCase()}`,
          category: "device",
          severity: "high",
          message: `Dispositivo médico de alto riesgo: ${device.label}. ${rule.reason}`,
          sourceRule: `deviceContraindications.${device.key}`,
          recommendation: rule.recommendation || rule.note || "Confirmar compatibilidad con especialista antes de punción.",
        });
      } else {
        alerts.push({
          code: `KANT-DEV-${device.key.substring(0, 3).toUpperCase()}`,
          category: "device",
          severity: rule.severity as SafetySeverity,
          message: `Dispositivo médico detectado: ${device.label}. ${rule.reason}`,
          sourceRule: `deviceContraindications.${device.key}`,
          recommendation: rule.recommendation || rule.note || "Usar solo técnicas permitidas.",
        });
      }
    }
  }

  private checkAnticoagulants(
    patient: PatientSafetyProfile,
    treatment: ProposedTreatment,
    alerts: SafetyAlert[],
    contraindications: SafetyContraindication[],
    auditTrail: string[]
  ): void {
    const rules = this.rules.anticoagulantPrecautions;
    if (!rules) return;

    const anticoags = patient.anticoagulants || [];
    const antiplats = patient.antiplatelets || [];

    if (anticoags.some((a) => a.toLowerCase().includes("warfarina"))) {
      alerts.push({
        code: "KANT-AC-WAR",
        category: "anticoagulant",
        severity: "high",
        message: "Paciente con warfarina. Requiere INR <3.0 para punción segura.",
        sourceRule: "anticoagulantPrecautions.warfarin",
        recommendation: rules.warfarin.recommendation,
        affectedItems: anticoags,
      });

      if (treatment.techniques) {
        for (const tech of treatment.techniques) {
          if (rules.warfarin.avoidTechniques.some((at: string) => tech.toLowerCase().includes(at.toLowerCase()))) {
            contraindications.push({
              item: tech,
              type: "technique",
              reason: "Técnica de alto riesgo de sangrado en paciente con warfarina",
              severity: "high",
              alternative: rules.warfarin.allowed?.join(", ") || "Punción superficial",
            });
          }
        }
      }
    }

    if (anticoags.some((a) => ["apixaban", "rivaroxaban", "dabigatrán", "edoxaban"].some((d) => a.toLowerCase().includes(d)))) {
      alerts.push({
        code: "KANT-AC-DOAC",
        category: "anticoagulant",
        severity: "moderate",
        message: "Paciente con anticoagulante oral directo (DOAC).",
        sourceRule: "anticoagulantPrecautions.directOralAnticoagulants",
        recommendation: rules.directOralAnticoagulants.recommendation,
      });
    }

    if (antiplats && antiplats.length > 0) {
      alerts.push({
        code: "KANT-AC-PLT",
        category: "anticoagulant",
        severity: "moderate",
        message: `Paciente con antiagregante plaquetario: ${antiplats.join(", ")}`,
        sourceRule: "anticoagulantPrecautions.antiplatelets",
        recommendation: rules.antiplatelets.recommendation,
      });
    }
  }

  private checkEpilepsy(
    patient: PatientSafetyProfile,
    treatment: ProposedTreatment,
    alerts: SafetyAlert[],
    contraindications: SafetyContraindication[],
    auditTrail: string[]
  ): void {
    const rules = this.rules.epilepsy;
    if (!rules) return;

    if (treatment.techniques) {
      for (const tech of treatment.techniques) {
        const absForbidden = rules.absoluteContraindications.find((ac: string) =>
          tech.toLowerCase().includes(ac.toLowerCase().split(" ")[0])
        );
        if (absForbidden) {
          contraindications.push({
            item: tech,
            type: "technique",
            reason: `Contraindicación absoluta en epilepsia: ${absForbidden}`,
            severity: "absolute",
          });
          auditTrail.push(`ALERT:epilepsy:absolute:${tech}`);
        }
      }
    }

    if (treatment.points) {
      for (const point of treatment.points) {
        const precaution = rules.relativePrecautions.find((rp: any) =>
          rp.item.toUpperCase().includes(point.toUpperCase())
        );
        if (precaution) {
          alerts.push({
            code: "KANT-EPI-PNT",
            category: "epilepsy",
            severity: "moderate",
            message: `Precaución en epilepsia: ${precaution.item}`,
            sourceRule: "epilepsy.relativePrecautions",
            recommendation: precaution.note,
            affectedItems: [point],
          });
        }
      }
    }

    alerts.push({
      code: "KANT-EPI-001",
      category: "epilepsy",
      severity: patient.epilepsyControlled ? "low" : "high",
      message: patient.epilepsyControlled
        ? "Epilepsia controlada. Acupuntura manual segura."
        : "Epilepsia no controlada. Requiere evaluación neurológica previa.",
      sourceRule: "epilepsy._description",
      recommendation: rules.recommendation,
    });
  }

  private checkOncology(
    patient: PatientSafetyProfile,
    treatment: ProposedTreatment,
    alerts: SafetyAlert[],
    contraindications: SafetyContraindication[],
    auditTrail: string[]
  ): void {
    const rules = this.rules.oncologySafety;
    if (!rules) return;

    if (patient.lymphedema) {
      contraindications.push({
        item: "Punción/ventosas en extremidad con linfedema",
        type: "technique",
        reason: rules.lymphedema.recommendation,
        severity: "absolute",
        alternative: "Puntos distales o extremidad contralateral",
      });
      auditTrail.push("ALERT:onco:lymphedema:absolute");
    }

    if (patient.chemotherapyActive) {
      alerts.push({
        code: "KANT-ONCO-CHT",
        category: "oncology",
        severity: "high",
        message: "Quimioterapia activa. Requiere hemograma previo a cada sesión.",
        sourceRule: "oncologySafety.activeChemotherapy",
        recommendation: rules.activeChemotherapy.recommendation,
      });
    }

    if (patient.radiationActive) {
      alerts.push({
        code: "KANT-ONCO-RT",
        category: "oncology",
        severity: "moderate",
        message: "Radioterapia activa. Evitar punción sobre campo irradiado.",
        sourceRule: "oncologySafety.radiationFields",
        recommendation: rules.radiationFields.recommendation,
      });
    }
  }

  private checkPediatric(
    patient: PatientSafetyProfile,
    treatment: ProposedTreatment,
    alerts: SafetyAlert[],
    contraindications: SafetyContraindication[],
    auditTrail: string[]
  ): void {
    const rules = this.rules.pediatricSafety;
    if (!rules || patient.age === undefined) return;

    if (patient.age < 7) {
      alerts.push({
        code: "KANT-PED-007",
        category: "pediatric",
        severity: "high",
        message: `Paciente pediátrico (${patient.age} años). Preferir técnicas no invasivas.`,
        sourceRule: "pediatricSafety.ageLimits.under7",
        recommendation: rules.ageLimits.under7.recommendation,
      });
    } else if (patient.age < 12) {
      alerts.push({
        code: "KANT-PED-012",
        category: "pediatric",
        severity: "moderate",
        message: `Paciente pediátrico (${patient.age} años). Agujas finas, retención ≤15 min.`,
        sourceRule: "pediatricSafety.ageLimits.under12",
        recommendation: `Agujas ${rules.ageLimits.under12.needleGauge}. Retención máxima ${rules.ageLimits.under12.needleRetention}.`,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SCORING Y STATUS
  // ═══════════════════════════════════════════════════════════════

  private calculateScore(
  contraindications: SafetyContraindication[],
  alerts: SafetyAlert[]
): number {
  const severityWeights: Record<SafetySeverity, number> = {
    low: 5,
    moderate: 15,
    high: 35,
    absolute: 60,
  };

  let score = 100;

  // Restar por contraindicaciones (penalización fuerte)
  for (const c of contraindications) {
    score -= severityWeights[c.severity] || 0;
  }

  // Restar por alerts (penalización moderada según categoría)
  for (const a of alerts) {
    // Categorías manejables: penalización reducida
    const isManageable = a.category === "device" || 
                         a.category === "pediatric" || 
                         a.category === "anticoagulant" ||
                         a.category === "epilepsy";
    const multiplier = isManageable ? 0.5 : 0.75;
    score -= (severityWeights[a.severity] || 0) * multiplier;
  }

  return Math.max(0, Math.min(100, score));
}

  private determineStatus(
  score: number,
  contraindications: SafetyContraindication[],
  alerts: SafetyAlert[]
): KantStatus {
  // Contraindicación absoluta = ROJO siempre
  if (contraindications.some((c) => c.severity === "absolute")) {
    return "red";
  }

  // Score bajo = ROJO (muchos riesgos acumulados)
  if (score < 30) return "red";
  
  // Score medio-bajo = YELLOW (precauciones necesarias)
  if (score < 70) return "yellow";
  
  // Score alto = VERDE (seguro o riesgos manejables)
  return "green";
}
}

export function evaluateSafety(
  patient: PatientSafetyProfile,
  treatment: ProposedTreatment,
  clinicalText?: string
): KantResult {
  const engine = new KantEngine();
  return engine.evaluate(patient, treatment, clinicalText);
}

// ─── API LEGACY: validateClinicalProposal ───────────────────────────────

export function validateClinicalProposal(
  proposal: FukuokaProposal,
  context: PatientContext
): KantResult {
  const patient: PatientSafetyProfile = {
    age: context.age,
    pregnancy: context.isPregnant,
    pregnancyTrimester: context.trimester as 1 | 2 | 3,
    currentPharmaceuticals: context.medications,
    knownAllergies: context.knownAllergies,
    pacemaker: context.pacemaker,
    epilepsy: context.epilepsy,
    epilepsyControlled: context.epilepsyControlled,
    lymphedema: context.lymphedema,
    anticoagulants: context.anticoagulants,
    antiplatelets: context.antiplatelets,
  };

  const treatment: ProposedTreatment = {
    points: proposal.treatment_proposal.acupuncture_points,
    herbs: proposal.treatment_proposal.herbal_formula ? [proposal.treatment_proposal.herbal_formula] : undefined,
  };

  const engine = new KantEngine();
  return engine.evaluate(patient, treatment);
}

export function isValidFukuokaProposal(obj: unknown): obj is FukuokaProposal {
  if (!obj || typeof obj !== "object") return false;
  const p = obj as Record<string, unknown>;
  return (
    Array.isArray(p.syndrome_analysis) &&
    p.treatment_proposal !== null &&
    typeof p.treatment_proposal === "object" &&
    Array.isArray((p.treatment_proposal as Record<string, unknown>).acupuncture_points)
  );
}