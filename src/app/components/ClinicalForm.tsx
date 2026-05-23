'use client';

import { useState } from 'react';
import { submitTreatment, type TreatmentRequest, type TreatmentResponse } from '@/lib/api';

interface ClinicalFormProps {
  onResult: (result: TreatmentResponse) => void;
  onLoading: (loading: boolean) => void;
}

export default function ClinicalForm({ onResult, onLoading }: ClinicalFormProps) {
  const [formData, setFormData] = useState<TreatmentRequest>({
    symptoms: '',
    pulse: '',
    tongue: '',
    ryodoraku: '',
    patient: {
      id: '',
      age: undefined,
      sex: '',
      pregnancy: { active: false, trimester: undefined, weeks: undefined },
    },
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    onLoading(true);

    try {
      // Limpiar campos vacíos de patient para no enviar datos incompletos
      const payload: TreatmentRequest = {
        symptoms: formData.symptoms,
        pulse: formData.pulse,
        tongue: formData.tongue,
        ryodoraku: formData.ryodoraku || undefined,
      };

      if (formData.patient?.age || formData.patient?.sex || formData.patient?.pregnancy?.active) {
        payload.patient = {
          ...formData.patient,
          pregnancy: formData.patient.pregnancy?.active ? formData.patient.pregnancy : undefined,
        };
      }

      const result = await submitTreatment(payload);
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      onLoading(false);
    }
  };

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updatePatient = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      patient: { ...prev.patient, [field]: value },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Datos clínicos */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Datos Clínicos</h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Síntomas *</label>
          <textarea
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Insomnia, loose stools in the morning, fatigue"
            value={formData.symptoms}
            onChange={(e) => updateField('symptoms', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pulso *</label>
          <input
            required
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Weak at left Cun, Slippery at right Guan"
            value={formData.pulse}
            onChange={(e) => updateField('pulse', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lengua *</label>
          <input
            required
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Red tongue with peeled coating, teeth marks on edges"
            value={formData.tongue}
            onChange={(e) => updateField('tongue', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ryodoraku (opcional)</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ej: Lung L: +35, Lung R: +28, Spleen L: +18..."
            value={formData.ryodoraku}
            onChange={(e) => updateField('ryodoraku', e.target.value)}
          />
        </div>
      </div>

      {/* Datos del paciente */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Datos del Paciente</h2>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Paciente ID"
              value={formData.patient?.id || ''}
              onChange={(e) => updatePatient('id', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Años"
              value={formData.patient?.age || ''}
              onChange={(e) => updatePatient('age', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={formData.patient?.sex || ''}
              onChange={(e) => updatePatient('sex', e.target.value)}
            >
              <option value="">--</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded"
              checked={formData.patient?.pregnancy?.active || false}
              onChange={(e) => updatePatient('pregnancy', {
                active: e.target.checked,
                trimester: formData.patient?.pregnancy?.trimester,
                weeks: formData.patient?.pregnancy?.weeks,
              })}
            />
            <span className="text-sm font-medium text-gray-700">Embarazo activo</span>
          </label>

          {formData.patient?.pregnancy?.active && (
            <div className="flex space-x-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Trimestre</label>
                <select
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                  value={formData.patient?.pregnancy?.trimester || ''}
                  onChange={(e) => updatePatient('pregnancy', {
                    ...formData.patient?.pregnancy,
                    trimester: Number(e.target.value),
                  })}
                >
                  <option value="">--</option>
                  <option value={1}>1°</option>
                  <option value={2}>2°</option>
                  <option value={3}>3°</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Semanas</label>
                <input
                  type="number"
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Ej: 18"
                  value={formData.patient?.pregnancy?.weeks || ''}
                  onChange={(e) => updatePatient('pregnancy', {
                    ...formData.patient?.pregnancy,
                    weeks: e.target.value ? Number(e.target.value) : undefined,
                  })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
      >
        Analizar y Generar Propuesta
      </button>
    </form>
  );
}