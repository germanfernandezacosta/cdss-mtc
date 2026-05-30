📋 TGA Compliance Checklist — CDSS MTC Premium v2.1
Software as Medical Device (SaMD) — Essential Principles
________________________________________
1. CLASIFICACIÓN DEL DISPOSITIVO
1.1 ¿Es CDSS MTC un dispositivo médico según TGA?
Sí. Según Therapeutic Goods Act 1989 y Therapeutic Goods (Medical Devices) Regulations 2002:
Un “dispositivo médico” incluye software que pretende ser usado para diagnosticar, prevenir, monitorear, tratar o aliviar una enfermedad.
Clasificación: Class IIa (mínimo) o Class IIb (si el riesgo es mayor).
Factor	CDSS MTC	Impacto clasificación
Tipo de decisión	Recomienda tratamiento (acupuntura + hierbas)	↑ Riesgo
Condición tratada	Cefalea, dolor (no vida/muerte)	↓ Riesgo
Intervención sugerida	Invasiva (agujas) + sistémica (hierbas)	↑ Riesgo
Supervisión humana	Requiere terapeuta registrado	↓ Riesgo
Clasificación estimada		Class IIa
1.2 Número de artículo (ARTG)
•	☐ Solicitar inclusión en el Australian Register of Therapeutic Goods (ARTG)
•	☐ Preparar Application for Inclusion (Formulario TGA)
•	☐ Designar Australian Sponsor (entidad legal en Australia)
________________________________________
2. ESSENTIAL PRINCIPLES (EP) — Schedule 1, Therapeutic Goods Regulations
EP 1: Uso previsto
•	☐ Documentar Intended Purpose Statement claro
•	☐ Definir población objetivo (adultos, excluir embarazo sin supervisión)
•	☐ Definir condiciones tratadas (cefalea, dolor musculoesquelético, insomnio)
•	☐ Definir contraindicaciones explícitas (embarazo, anticoagulantes, epilepsia)
EP 2: Diseño y construcción seguros
•	☐ KANT v2.1 como safety engine determinístico (documentado)
•	☐ Anonimización SHA-256 antes de API externa (privacidad)
•	☐ RAG con citaciones (evidencia documental trazable)
•	☐ Foucault PDFs como audit trail inmutable (hashes SHA-256)
EP 3: Propiedades biológicas
•	☐ N/A para software (marcar como no aplicable)
EP 4: Propiedades ambientales
•	☐ Documentar requisitos de infraestructura (Node.js 18+, SQLite, RAM mínima)
•	☐ Documentar compatibilidad con sistemas hospitalarios (HL7 FHIR opcional)
EP 5: Compatibilidad con condiciones de uso
•	☐ Documentar uso en entorno clínico (no doméstico sin supervisión)
•	☐ Documentar requisitos de formación del operador (terapeuta registrado)
EP 6: Entrega, instalación y uso seguros
•	☐ Manual de usuario (español + inglés AU)
•	☐ Guía de instalación (Docker/Node.js)
•	☐ Quick start guide para clínicos
EP 7: Materiales de construcción
•	☐ N/A para software (marcar como no aplicable)
EP 8: Dispositivos con función de medición
•	☐ N/A (no mide parámetros fisiológicos directamente)
EP 9: Protección contra radiación
•	☐ N/A para software
EP 10: Requisitos para dispositivos con fuente de energía
•	☐ N/A para software
EP 11: Protección contra riesgos mecánicos
•	☐ N/A para software
EP 12: Protección contra riesgos de suministro de energía o sustancias
•	☐ Documentar que el software NO suministra energía ni sustancias directamente
•	☐ Documentar que las recomendaciones requieren intervención humana (agujas/hierbas)
EP 13: Información proporcionada con el dispositivo
•	☐ Labeling: Nombre del dispositivo, versión, sponsor australiano, ARTG number
•	☐ Instructions for Use (IFU): Uso previsto, contraindicaciones, warnings, precauciones
•	☐ Clinical evidence summary: Referencias a estudios que respaldan acupuntura para cefalea
EP 14: Construcción e integridad clínica
•	☐ Clinical evidence: Meta-análisis de acupuntura para cefalea tensional (Cochrane, etc.)
•	☐ Clinical validation: Estudio piloto en España (datos anonimizados)
•	☐ Clinical performance: Métricas de precisión del sistema (sensitivity, specificity de KANT)
EP 15: Dispositivos que incorporan medicamentos o materiales biológicos
•	☐ N/A (el software recomienda hierbas pero no las suministra)
EP 16: Construcción e integridad microbiológica
•	☐ N/A para software
________________________________________
3. SOFTWARE AS MEDICAL DEVICE (SaMD) — TGA Guidance
3.1 Ciclo de vida del software
•	☐ Plan de desarrollo: Documentar metodología (agile con sprints de 2 semanas)
•	☐ Control de versiones: Git + tags semánticos (v2.1.0, v2.1.1)
•	☐ Gestión de cambios: Change control log (cada modificación documentada)
•	☐ Configuración management: Entornos separados (dev, test, prod)
3.2 Calidad del software
•	☐ Code reviews: Todos los PRs revisados por segundo desarrollador
•	☐ Static analysis: ESLint + TypeScript strict mode
•	☐ Testing: Unit tests (KANT), integration tests (RAG + LLM), E2E tests (Treatment API)
•	☐ Traceability: Cada requisito clínico mapeado a código y test
3.3 Seguridad cibernética
•	☐ Anonimización: SHA-256 irreversible antes de API externa
•	☐ Cifrado: HTTPS obligatorio, SQLite encriptada (opcional)
•	☐ Autenticación: JWT para API endpoints (futuro)
•	☐ Auditoría: Chain of custody en cada consulta (Foucault)
3.4 Gestión de riesgos (ISO 14971)
•	☐ Risk Management File: Documento maestro de riesgos
•	☐ Hazard analysis: Identificar hazards (diagnóstico erróneo, contraindicación omitida)
•	☐ Risk control: KANT como mitigación principal
•	☐ Residual risk: Documentar riesgos aceptables vs. inaceptables
•	☐ Post-market surveillance: Plan de vigilancia post-lanzamiento
________________________________________
4. CLINICAL EVIDENCE
4.1 Evidencia científica (RAG sources)
•	☐ CEMeTC — Dolor y Cefalea: Referencia académica española
•	☐ Bensky — Materia Medica: Referencia farmacopea estándar
•	☐ Cochrane Reviews: Acupuntura para cefalea tensional y migraña
•	☐ NHMRC Guidelines: Australian guidelines para manejo del dolor
4.2 Validación clínica (estudio piloto España)
•	☐ Protocolo de estudio: Diseño, población, endpoints
•	☐ Consentimiento informado: Anonimizado, derecho a borrado
•	☐ Recogida de datos: EHR con is_test: true
•	☐ Análisis de resultados: Eficacia, seguridad, usabilidad
•	☐ Publicación: Paper en revista indexada (opcional pero recomendado)
4.3 Clinical Performance
•	☐ Sensitivity de KANT: % de contraindicaciones detectadas correctamente
•	☐ Specificity de KANT: % de falsos positivos
•	☐ Precision de RAG: Relevancia de citaciones recuperadas
•	☐ Aceptabilidad clínica: Encuesta a terapeutas (Likert 1-5)
________________________________________
5. POST-MARKET SURVEILLANCE
5.1 Vigilancia post-lanzamiento
•	☐ Adverse Event Reporting: Sistema de reporte de eventos adversos
•	☐ Periodic Safety Update Report (PSUR): Informe anual de seguridad
•	☐ Trend analysis: Análisis de tendencias en KANT alerts
5.2 Corrective actions
•	☐ CAPA system: Corrective And Preventive Actions
•	☐ Field safety notices: Notificaciones de seguridad si se detecta hazard
•	☐ Recalls: Procedimiento de retirada del mercado (si aplica)
________________________________________
6. DOCUMENTACIÓN REQUERIDA PARA ARTG
Documento	Estado	Responsable
Intended Purpose Statement	⏳ Pendiente	Clínico + Legal
Clinical Evidence Summary	⏳ Pendiente	Clínico
Risk Management File (ISO 14971)	⏳ Pendiente	QA
Software Lifecycle Documentation	⏳ Pendiente	Dev
Instructions for Use (IFU)	⏳ Pendiente	Clínico + UX
Labeling	⏳ Pendiente	Legal
Post-Market Surveillance Plan	⏳ Pendiente	QA
Australian Sponsor Designation	⏳ Pendiente	Legal
________________________________________
7. TIMELINE ESTIMADO
Fase	Duración	Hitos
Preparación documentación	4-6 semanas	Todos los documentos del punto 6
Clinical validation (España)	8-12 semanas	Estudio piloto, recogida de datos
Application ARTG	4-8 semanas	TGA review, posibles queries
Total	4-6 meses	ARTG inclusion + lanzamiento AU
________________________________________
8. PRÓXIMOS PASOS INMEDIATOS
1.	☐ Designar Australian Sponsor (abogado/empresa en Australia)
2.	☐ Redactar Intended Purpose Statement
3.	☐ Completar Risk Management File (ISO 14971)
4.	☐ Preparar Clinical Evidence Summary
5.	☐ Implementar campo is_test en schema EHR (para validación España)
