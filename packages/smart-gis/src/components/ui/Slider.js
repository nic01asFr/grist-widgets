/**
 * Slider Component
 * Smart GIS Widget v3.0
 */

import React from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

const Slider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  label,
  disabled = false,
  showValue = true,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const styles = getSliderStyles(percentage, disabled);

  return (
    <div style={styles.container}>
      {(label || showValue) && (
        <div style={styles.header}>
          {label && <span style={styles.label}>{label}</span>}
          {showValue && (
            <span style={styles.value}>
              {value}
              {unit}
            </span>
          )}
        </div>
      )}

      <div style={styles.sliderContainer}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          style={styles.slider}
        />
        <div style={styles.track}>
          <div
            style={{
              ...styles.trackFilled,
              width: `${percentage}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

const getSliderStyles = (percentage, disabled) => ({
  container: {
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    fontFamily: 'monospace',
  },
  sliderContainer: {
    position: 'relative',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    height: '6px',
    borderRadius: borderRadius.sm,
    outline: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    background: 'transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    position: 'relative',
    zIndex: 2,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '6px',
    backgroundColor: colors.grayLight,
    borderRadius: borderRadius.sm,
    pointerEvents: 'none',
    zIndex: 1,
  },
  trackFilled: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: disabled ? colors.gray : colors.primary,
    borderRadius: borderRadius.sm,
    transition: 'width 0.1s ease',
  },
});

// Add global styles for slider thumb
const sliderThumbStyles = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${colors.white};
    border: 2px solid ${colors.primary};
    cursor: pointer;
    box-shadow: 0 2px 4px ${colors.shadow};
    transition: all 0.2s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 6px ${colors.shadowMedium};
  }

  input[type="range"]::-webkit-slider-thumb:active {
    transform: scale(0.95);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${colors.white};
    border: 2px solid ${colors.primary};
    cursor: pointer;
    box-shadow: 0 2px 4px ${colors.shadow};
    transition: all 0.2s ease;
  }

  input[type="range"]::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 6px ${colors.shadowMedium};
  }

  input[type="range"]::-moz-range-thumb:active {
    transform: scale(0.95);
  }

  input[type="range"]:disabled::-webkit-slider-thumb {
    border-color: ${colors.gray};
    cursor: not-allowed;
  }

  input[type="range"]:disabled::-moz-range-thumb {
    border-color: ${colors.gray};
    cursor: not-allowed;
  }
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('slider-thumb-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'slider-thumb-styles';
  styleSheet.textContent = sliderThumbStyles;
  document.head.appendChild(styleSheet);
}

export default Slider;
