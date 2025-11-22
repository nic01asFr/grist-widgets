/**
 * ParamsForm - Formulaire dynamique de paramètres d'outils
 *
 * Génère automatiquement les inputs selon la définition du paramètre:
 * - choice: select dropdown
 * - number: input number avec min/max/step
 * - geometry_picker: sélecteur de géométrie
 */

import React from 'react';
import './ParamsForm.css';

const ParamsForm = ({ params, values, onChange }) => {
  const handleChange = (paramName, value) => {
    onChange({
      ...values,
      [paramName]: value
    });
  };

  const renderParam = (param) => {
    const currentValue = values[param.name] !== undefined
      ? values[param.name]
      : param.default;

    switch (param.type) {
      case 'choice':
        return (
          <div key={param.name} className="param-field">
            <label htmlFor={param.name}>{param.label}</label>
            <select
              id={param.name}
              value={currentValue}
              onChange={(e) => handleChange(param.name, e.target.value)}
            >
              {param.options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {param.help && <p className="param-help">{param.help}</p>}
          </div>
        );

      case 'number':
        return (
          <div key={param.name} className="param-field">
            <label htmlFor={param.name}>
              {param.label}
              {param.unit && <span className="param-unit"> ({param.unit})</span>}
            </label>
            <input
              type="number"
              id={param.name}
              value={currentValue}
              min={param.min}
              max={param.max}
              step={param.step || 1}
              onChange={(e) => handleChange(param.name, parseFloat(e.target.value))}
            />
            {param.help && <p className="param-help">{param.help}</p>}
          </div>
        );

      case 'geometry_picker':
        return (
          <div key={param.name} className="param-field">
            <label htmlFor={param.name}>{param.label}</label>
            <div className="geometry-picker">
              <input
                type="text"
                id={param.name}
                value={currentValue || ''}
                placeholder="WKT geometry..."
                onChange={(e) => handleChange(param.name, e.target.value)}
              />
              <button
                type="button"
                className="btn-pick"
                onClick={() => alert('Sélection sur carte - à implémenter')}
                title="Sélectionner sur la carte"
              >
                📍
              </button>
            </div>
            {param.help && <p className="param-help">{param.help}</p>}
          </div>
        );

      default:
        return (
          <div key={param.name} className="param-field">
            <label htmlFor={param.name}>{param.label}</label>
            <input
              type="text"
              id={param.name}
              value={currentValue || ''}
              onChange={(e) => handleChange(param.name, e.target.value)}
            />
            {param.help && <p className="param-help">{param.help}</p>}
          </div>
        );
    }
  };

  return (
    <div className="params-form">
      {params.map(renderParam)}
    </div>
  );
};

export default ParamsForm;
