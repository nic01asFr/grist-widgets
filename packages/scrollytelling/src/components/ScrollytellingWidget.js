import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GristWidgetBase } from './GristWidgetBase';
import { ColumnHelper } from '../utils/ColumnHelper';
import { DataValidator } from '../utils/DataValidator';
import { ensureTablesExist, getDefaultMappings } from '../utils/tableSetup';
import SceneRenderer from './SceneRenderer';

/**
 * ScrollytellingWidget - Main widget component
 */
export function ScrollytellingWidget() {
  const [scenes, setScenes] = useState([]);
  const [config, setConfig] = useState({
    scroll_mode: 'free',
    show_progress: true,
    show_navigation: true,
    keyboard_nav: true,
    auto_height: false
  });
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const widgetRef = useRef(null);
  const columnHelperRef = useRef(new ColumnHelper());
  const gristWidgetRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Handle records update from Grist
  const handleRecordsUpdate = useCallback((records) => {
    if (!records || records.length === 0) {
      setScenes([]);
      return;
    }

    const columnHelper = columnHelperRef.current;
    const processedScenes = records
      .map(record => ({
        id: record.id,
        scene_order: columnHelper.getValue(record, 'scene_order', 0),
        title: columnHelper.getValue(record, 'title', ''),
        image_url: columnHelper.getValue(record, 'image_url', ''),
        text_content: columnHelper.getValue(record, 'text_content', ''),
        text_position: DataValidator.validatePosition(
          columnHelper.getValue(record, 'text_position', 'center')
        ),
        text_alignment: columnHelper.getValue(record, 'text_alignment', 'center'),
        transition_type: DataValidator.validateTransition(
          columnHelper.getValue(record, 'transition_type', 'fade')
        ),
        transition_duration: DataValidator.validate(
          columnHelper.getValue(record, 'transition_duration', 800),
          'number',
          800
        ),
        text_color: DataValidator.validate(
          columnHelper.getValue(record, 'text_color', '#ffffff'),
          'color',
          '#ffffff'
        ),
        text_bg_color: DataValidator.validate(
          columnHelper.getValue(record, 'text_bg_color', 'rgba(0,0,0,0.6)'),
          'color',
          'rgba(0,0,0,0.6)'
        ),
        enabled: columnHelper.getValue(record, 'enabled', true)
      }))
      .filter(scene => scene.enabled)
      .sort((a, b) => a.scene_order - b.scene_order);

    setScenes(processedScenes);
  }, []);

  // Handle mappings update
  const handleMappingsUpdate = useCallback((mappings) => {
    columnHelperRef.current.updateMappings(mappings);
  }, []);

  // Load configuration from Grist
  const loadConfig = useCallback(async (docApi) => {
    try {
      const configTable = await docApi.fetchTable('Scrollytelling_Config');
      if (configTable && configTable[2]?.length > 0) {
        const firstRecordId = configTable[2][0];
        const configData = {};
        Object.keys(configTable[3]).forEach((key) => {
          const values = configTable[3][key];
          const index = configTable[2].indexOf(firstRecordId);
          if (index !== -1) {
            configData[key] = values[index];
          }
        });
        setConfig(prevConfig => ({ ...prevConfig, ...configData }));
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
  }, []);

  // Initialize Grist widget
  useEffect(() => {
    if (initialized) return;

    const initWidget = async () => {
      try {
        console.log('Initializing Scrollytelling Widget...');
        const widget = new GristWidgetBase();
        gristWidgetRef.current = widget;

        // Initialize with default mappings
        const success = await widget.initialize({
          mappings: getDefaultMappings(),
          onRecords: handleRecordsUpdate,
          onMappings: handleMappingsUpdate,
          onInit: async () => {
            // Ensure tables exist
            await ensureTablesExist(widget.docApi);
            // Load config
            await loadConfig(widget.docApi);
          }
        });

        if (success) {
          setInitialized(true);
          setLoading(false);
        } else {
          throw new Error('Failed to initialize widget');
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    initWidget();
  }, [initialized, handleRecordsUpdate, handleMappingsUpdate, loadConfig]);

  // Handle scroll event
  const handleScroll = useCallback((e) => {
    if (!scrollContainerRef.current || scenes.length === 0) return;

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    setScrollProgress(progress);

    // Calculate active scene based on scroll
    const sceneProgress = progress * scenes.length;
    const newActiveIndex = Math.min(
      Math.floor(sceneProgress),
      scenes.length - 1
    );

    if (newActiveIndex !== activeSceneIndex) {
      setActiveSceneIndex(newActiveIndex);
    }
  }, [scenes.length, activeSceneIndex]);

  // Go to specific scene
  const goToScene = useCallback((index) => {
    if (!scrollContainerRef.current || index < 0 || index >= scenes.length) return;

    const container = scrollContainerRef.current;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const targetScroll = (index / scenes.length) * scrollHeight;

    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  }, [scenes.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!config.keyboard_nav) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToScene(Math.min(activeSceneIndex + 1, scenes.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToScene(Math.max(activeSceneIndex - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.keyboard_nav, activeSceneIndex, scenes.length, goToScene]);

  // Render loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#ffffff'
      }}>
        <div>Loading Scrollytelling Widget...</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#ff6b6b',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (scenes.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div>
          <h2>No Scenes Found</h2>
          <p>Add scenes to the Scrollytelling_Scenes table to get started.</p>
        </div>
      </div>
    );
  }

  // Calculate scene-specific scroll progress
  const getSceneProgress = (index) => {
    const sceneProgress = scrollProgress * scenes.length;
    return sceneProgress - index;
  };

  return (
    <div
      ref={widgetRef}
      className="scrollytelling-widget"
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#000000'
      }}
    >
      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          width: '100%',
          height: '100%',
          overflowY: config.scroll_mode === 'free' ? 'scroll' : 'hidden',
          overflowX: 'hidden',
          scrollSnapType: config.scroll_mode === 'snapped' ? 'y mandatory' : 'none',
          position: 'relative'
        }}
      >
        {/* Spacer for scroll area */}
        <div style={{ height: `${scenes.length * 100}vh` }} />
      </div>

      {/* Scene Renderer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}>
        <AnimatePresence mode="sync">
          {scenes.map((scene, index) => {
            const sceneProgress = getSceneProgress(index);
            const isActive = index === activeSceneIndex;

            return (
              <SceneRenderer
                key={scene.id}
                scene={scene}
                isActive={isActive}
                scrollProgress={sceneProgress}
                index={index}
                config={config}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      {config.show_progress && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          zIndex: 1000,
          pointerEvents: 'none'
        }}>
          <div style={{
            height: '100%',
            width: `${scrollProgress * 100}%`,
            backgroundColor: '#4CAF50',
            transition: 'width 0.1s ease-out'
          }} />
        </div>
      )}

      {/* Navigation Dots */}
      {config.show_navigation && (
        <div style={{
          position: 'fixed',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 1000
        }}>
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              onClick={() => goToScene(index)}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                border: '2px solid #ffffff',
                backgroundColor: index === activeSceneIndex ? '#ffffff' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0
              }}
              aria-label={`Go to scene ${index + 1}: ${scene.title}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ScrollytellingWidget;
