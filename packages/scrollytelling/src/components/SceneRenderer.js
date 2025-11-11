import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

/**
 * SceneRenderer - Renders a single scrollytelling scene with image and text
 */
export function SceneRenderer({ scene, isActive, scrollProgress, index, config }) {
  const {
    image_url,
    image_attachment,
    text_content,
    text_position = 'center',
    text_alignment = 'center',
    transition_type = 'fade',
    transition_duration = 800,
    text_color = '#ffffff',
    text_bg_color = 'rgba(0,0,0,0.6)'
  } = scene;

  // Get image URL - prefer attachment if available
  const getImageUrl = () => {
    // If attachment exists, use Grist attachment URL
    if (image_attachment && Array.isArray(image_attachment) && image_attachment.length > 0) {
      // Grist attachments are arrays of objects with [filename, url]
      return image_attachment[0]; // Use first attachment URL
    }
    // Otherwise use image_url field
    return image_url || '';
  };

  const finalImageUrl = getImageUrl();

  // Debug log
  if (!finalImageUrl) {
    console.warn(`Scene ${index}: No image URL found`, scene);
  }

  // Calculate opacity based on scroll progress for smooth transitions
  const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(scrollProgress) * 2);

  // Get transition variants based on type
  const getImageVariants = () => {
    const duration = transition_duration / 1000;

    switch (transition_type) {
      case 'slide-up':
        return {
          initial: { opacity: 0, y: 100 },
          animate: { opacity, y: 0, transition: { duration } },
          exit: { opacity: 0, y: -100, transition: { duration } }
        };
      case 'slide-down':
        return {
          initial: { opacity: 0, y: -100 },
          animate: { opacity, y: 0, transition: { duration } },
          exit: { opacity: 0, y: 100, transition: { duration } }
        };
      case 'zoom-in':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity, scale: 1, transition: { duration } },
          exit: { opacity: 0, scale: 1.2, transition: { duration } }
        };
      case 'zoom-out':
        return {
          initial: { opacity: 0, scale: 1.2 },
          animate: { opacity, scale: 1, transition: { duration } },
          exit: { opacity: 0, scale: 0.8, transition: { duration } }
        };
      case 'crossfade':
        return {
          initial: { opacity: 0 },
          animate: { opacity, transition: { duration: duration * 1.5 } },
          exit: { opacity: 0, transition: { duration: duration * 1.5 } }
        };
      case 'fade':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity, transition: { duration } },
          exit: { opacity: 0, transition: { duration } }
        };
    }
  };

  // Get text position styles
  const getTextPositionStyles = () => {
    const positions = {
      'top-left': { top: '5%', left: '5%', alignItems: 'flex-start' },
      'top-center': { top: '5%', left: '50%', transform: 'translateX(-50%)', alignItems: 'center' },
      'top-right': { top: '5%', right: '5%', alignItems: 'flex-end' },
      'center-left': { top: '50%', left: '5%', transform: 'translateY(-50%)', alignItems: 'flex-start' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', alignItems: 'center' },
      'center-right': { top: '50%', right: '5%', transform: 'translateY(-50%)', alignItems: 'flex-end' },
      'bottom-left': { bottom: '5%', left: '5%', alignItems: 'flex-start' },
      'bottom-center': { bottom: '5%', left: '50%', transform: 'translateX(-50%)', alignItems: 'center' },
      'bottom-right': { bottom: '5%', right: '5%', alignItems: 'flex-end' }
    };
    return positions[text_position] || positions['center'];
  };

  const textStyles = {
    position: 'absolute',
    maxWidth: '90%',
    padding: '2rem',
    borderRadius: '8px',
    backgroundColor: text_bg_color,
    color: text_color,
    textAlign: text_alignment,
    zIndex: 10,
    ...getTextPositionStyles()
  };

  const textVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: isActive ? 1 : 0,
      y: isActive ? 0 : 20,
      transition: { duration: transition_duration / 1000, delay: 0.2 }
    }
  };

  return (
    <div className="scene-container" style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Background Image */}
      {finalImageUrl ? (
        <motion.img
          key={`image-${index}`}
          src={finalImageUrl}
          alt={scene.title || `Scene ${index + 1}`}
          variants={getImageVariants()}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center'
          }}
          onError={(e) => {
            console.error(`Failed to load image for scene ${index}:`, finalImageUrl);
            e.target.style.backgroundColor = '#1a1a1a';
          }}
          onLoad={() => {
            console.log(`Image loaded successfully for scene ${index}:`, finalImageUrl);
          }}
        />
      ) : (
        <motion.div
          key={`placeholder-${index}`}
          variants={getImageVariants()}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '1.5rem'
          }}
        >
          No Image
        </motion.div>
      )}

      {/* Text Overlay */}
      <motion.div
        key={`text-${index}`}
        variants={textVariants}
        initial="initial"
        animate="animate"
        style={textStyles}
        className="scene-text-content"
      >
        <ReactMarkdown>{text_content || ''}</ReactMarkdown>
      </motion.div>
    </div>
  );
}

export default SceneRenderer;
