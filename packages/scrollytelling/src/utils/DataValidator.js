/**
 * DataValidator - Validate and sanitize data
 */
export class DataValidator {
  static validate(value, type, defaultValue = null) {
    if (value === undefined || value === null) {
      return defaultValue;
    }

    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      case 'boolean':
        return Boolean(value);
      case 'url':
        try {
          new URL(value);
          return String(value);
        } catch {
          return defaultValue;
        }
      case 'color':
        // Validate hex color or rgba
        if (/^#([0-9A-F]{3}){1,2}$/i.test(value) || /^rgba?\(/.test(value)) {
          return String(value);
        }
        return defaultValue;
      default:
        return value;
    }
  }

  static sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
  }

  static validatePosition(position) {
    const validPositions = [
      'top-left', 'top-center', 'top-right',
      'center-left', 'center', 'center-right',
      'bottom-left', 'bottom-center', 'bottom-right'
    ];
    return validPositions.includes(position) ? position : 'center';
  }

  static validateTransition(transition) {
    const validTransitions = [
      'fade', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out', 'crossfade'
    ];
    return validTransitions.includes(transition) ? transition : 'fade';
  }
}
