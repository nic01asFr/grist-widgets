/**
 * Table Setup Utilities
 * Auto-creates necessary tables for Scrollytelling widget
 */

export const TABLE_DEFINITIONS = {
  SCENES: {
    name: 'Scrollytelling_Scenes',
    columns: [
      { id: 'scene_order', type: 'Numeric', label: 'Order' },
      { id: 'title', type: 'Text', label: 'Title' },
      { id: 'image_url', type: 'Text', label: 'Image URL' },
      { id: 'text_content', type: 'Text', label: 'Text Content' },
      { id: 'text_position', type: 'Choice', label: 'Text Position',
        options: ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'] },
      { id: 'text_alignment', type: 'Choice', label: 'Text Alignment',
        options: ['left', 'center', 'right', 'justify'] },
      { id: 'transition_type', type: 'Choice', label: 'Transition Type',
        options: ['fade', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out', 'crossfade'] },
      { id: 'transition_duration', type: 'Numeric', label: 'Transition Duration (ms)' },
      { id: 'text_color', type: 'Text', label: 'Text Color' },
      { id: 'text_bg_color', type: 'Text', label: 'Text Background Color' },
      { id: 'enabled', type: 'Bool', label: 'Enabled' }
    ]
  },
  CONFIG: {
    name: 'Scrollytelling_Config',
    columns: [
      { id: 'scroll_mode', type: 'Choice', label: 'Scroll Mode',
        options: ['free', 'snapped'] },
      { id: 'show_progress', type: 'Bool', label: 'Show Progress Bar' },
      { id: 'show_navigation', type: 'Bool', label: 'Show Navigation Dots' },
      { id: 'keyboard_nav', type: 'Bool', label: 'Enable Keyboard Navigation' },
      { id: 'auto_height', type: 'Bool', label: 'Auto Height' }
    ]
  }
};

export async function ensureTablesExist(docApi) {
  try {
    console.log('📋 Checking for Scrollytelling tables...');

    // Check if tables exist
    const tables = await docApi.fetchTable('_grist_Tables');
    const tableNames = tables.tableId || [];
    console.log('Existing tables:', tableNames);

    const actions = [];

    // Create Scenes table if it doesn't exist
    if (!tableNames.includes(TABLE_DEFINITIONS.SCENES.name)) {
      console.log('📝 Creating Scrollytelling_Scenes table...');

      // Format columns for AddTable (only id and type)
      const sceneColumns = TABLE_DEFINITIONS.SCENES.columns.map(col => ({
        id: col.id,
        type: col.type
      }));

      actions.push([
        'AddTable',
        TABLE_DEFINITIONS.SCENES.name,
        sceneColumns
      ]);

      // Add sample data
      actions.push([
        'BulkAddRecord',
        TABLE_DEFINITIONS.SCENES.name,
        [null, null, null],
        {
          scene_order: [1, 2, 3],
          title: ['Welcome', 'Explore', 'Discover'],
          image_url: [
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1500',
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1500',
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1500'
          ],
          text_content: [
            '# Welcome to Scrollytelling\n\nScroll down to explore your story',
            '## Beautiful Transitions\n\nSmooth animations between scenes',
            '### Your Story Awaits\n\nCreate amazing visual narratives'
          ],
          text_position: ['center', 'bottom-center', 'top-right'],
          text_alignment: ['center', 'center', 'left'],
          transition_type: ['fade', 'slide-up', 'zoom-in'],
          transition_duration: [800, 800, 800],
          text_color: ['#ffffff', '#ffffff', '#ffffff'],
          text_bg_color: ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.6)'],
          enabled: [true, true, true]
        }
      ]);
    }

    // Create Config table if it doesn't exist
    if (!tableNames.includes(TABLE_DEFINITIONS.CONFIG.name)) {
      console.log('📝 Creating Scrollytelling_Config table...');

      // Format columns for AddTable (only id and type)
      const configColumns = TABLE_DEFINITIONS.CONFIG.columns.map(col => ({
        id: col.id,
        type: col.type
      }));

      actions.push([
        'AddTable',
        TABLE_DEFINITIONS.CONFIG.name,
        configColumns
      ]);

      // Add default config
      actions.push([
        'AddRecord',
        TABLE_DEFINITIONS.CONFIG.name,
        null,
        {
          scroll_mode: 'free',
          show_progress: true,
          show_navigation: true,
          keyboard_nav: true,
          auto_height: false
        }
      ]);
    }

    if (actions.length > 0) {
      console.log(`🔨 Applying ${actions.length} actions to create tables...`);
      await docApi.applyUserActions(actions);
      console.log('✅ Tables created successfully!');
      return true;
    } else {
      console.log('✓ All tables already exist');
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
}

export function getDefaultMappings() {
  return {
    // Scenes table mappings
    scene_order: 'scene_order',
    title: 'title',
    image_url: 'image_url',
    text_content: 'text_content',
    text_position: 'text_position',
    text_alignment: 'text_alignment',
    transition_type: 'transition_type',
    transition_duration: 'transition_duration',
    text_color: 'text_color',
    text_bg_color: 'text_bg_color',
    enabled: 'enabled'
  };
}
