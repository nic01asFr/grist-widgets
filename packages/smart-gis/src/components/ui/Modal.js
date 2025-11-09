/**
 * Modal Component
 * Smart GIS Widget v3.0
 */

import React, { useEffect } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius, zIndex } from '../../constants/styles';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'medium', // small | medium | large
  closeOnOverlayClick = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const styles = getModalStyles(size);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        {title && (
          <div style={styles.header}>
            <h2 style={styles.title}>{title}</h2>
            <button onClick={onClose} style={styles.closeButton} title="Fermer">
              ×
            </button>
          </div>
        )}

        <div style={styles.content}>{children}</div>

        {footer && <div style={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
};

const getModalStyles = (size) => {
  const sizeStyles = {
    small: { maxWidth: '400px' },
    medium: { maxWidth: '600px' },
    large: { maxWidth: '900px' },
  };

  const modalSize = sizeStyles[size] || sizeStyles.medium;

  return {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.bgOverlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: zIndex.modal,
      animation: 'fadeIn 0.2s ease',
    },
    modal: {
      ...modalSize,
      width: '90%',
      maxHeight: '90vh',
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      boxShadow: `0 8px 24px ${colors.shadowStrong}`,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp 0.3s ease',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottom: `1px solid ${colors.border}`,
    },
    title: {
      margin: 0,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '32px',
      color: colors.textSecondary,
      cursor: 'pointer',
      padding: 0,
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.sm,
      transition: 'background-color 0.2s',
    },
    content: {
      flex: 1,
      padding: spacing.lg,
      overflowY: 'auto',
    },
    footer: {
      padding: spacing.lg,
      borderTop: `1px solid ${colors.border}`,
      display: 'flex',
      gap: spacing.md,
      justifyContent: 'flex-end',
    },
  };
};

// Add animation styles
if (typeof document !== 'undefined' && !document.getElementById('modal-animations')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'modal-animations';
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default Modal;
