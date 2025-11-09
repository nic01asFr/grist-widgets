/**
 * StatsPanel Component
 * Smart GIS Widget v3.0
 *
 * Displays layer statistics and metadata
 */

import React, { useMemo } from 'react';
import { colors } from '../../constants/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

const StatsPanel = ({
  layerName = '',
  entities = [],
}) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const geometryTypes = {};
    let totalVertices = 0;
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    entities.forEach(entity => {
      // Count geometry types
      const geomType = extractGeometryType(entity.geometry);
      if (geomType) {
        geometryTypes[geomType] = (geometryTypes[geomType] || 0) + 1;
      }

      // Calculate bounding box
      const coords = extractCoordinates(entity.geometry);
      coords.forEach(([lon, lat]) => {
        if (!isNaN(lon) && !isNaN(lat)) {
          minLon = Math.min(minLon, lon);
          maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }
      });

      totalVertices += coords.length;
    });

    // Calculate layer extent
    const hasExtent = isFinite(minLat) && isFinite(maxLat) && isFinite(minLon) && isFinite(maxLon);
    const extent = hasExtent ? {
      minLat,
      maxLat,
      minLon,
      maxLon,
      centerLat: (minLat + maxLat) / 2,
      centerLon: (minLon + maxLon) / 2,
      width: maxLon - minLon,
      height: maxLat - minLat,
    } : null;

    return {
      totalEntities: entities.length,
      geometryTypes,
      totalVertices,
      averageVertices: entities.length > 0 ? (totalVertices / entities.length).toFixed(1) : 0,
      extent,
    };
  }, [entities]);

  const geometryIcons = {
    POINT: '📍',
    LINESTRING: '〰️',
    POLYGON: '▭',
    MULTIPOINT: '📍📍',
    MULTILINESTRING: '〰️〰️',
    MULTIPOLYGON: '▭▭',
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Statistiques</h3>
        <p style={styles.subtitle}>{layerName}</p>
      </div>

      {/* General Stats */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Général</h4>
        <div style={styles.statGrid}>
          <StatItem
            label="Entités totales"
            value={stats.totalEntities}
            icon="📊"
          />
          <StatItem
            label="Sommets totaux"
            value={stats.totalVertices}
            icon="🔷"
          />
          <StatItem
            label="Moyenne sommets/entité"
            value={stats.averageVertices}
            icon="📐"
          />
        </div>
      </div>

      {/* Geometry Types */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Types de géométrie</h4>
        {Object.keys(stats.geometryTypes).length === 0 ? (
          <p style={styles.emptyText}>Aucune géométrie</p>
        ) : (
          <div style={styles.geomTypesList}>
            {Object.entries(stats.geometryTypes).map(([type, count]) => (
              <div key={type} style={styles.geomTypeItem}>
                <div style={styles.geomTypeLeft}>
                  <span style={styles.geomTypeIcon}>
                    {geometryIcons[type] || '❓'}
                  </span>
                  <span style={styles.geomTypeName}>{type}</span>
                </div>
                <div style={styles.geomTypeRight}>
                  <span style={styles.geomTypeCount}>{count}</span>
                  <div style={styles.geomTypeBar}>
                    <div
                      style={{
                        ...styles.geomTypeBarFill,
                        width: `${(count / stats.totalEntities) * 100}%`,
                      }}
                    />
                  </div>
                  <span style={styles.geomTypePercent}>
                    {((count / stats.totalEntities) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extent */}
      {stats.extent && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Emprise géographique</h4>
          <div style={styles.extentBox}>
            <div style={styles.extentRow}>
              <span style={styles.extentLabel}>Centre:</span>
              <span style={styles.extentValue}>
                {stats.extent.centerLat.toFixed(6)}, {stats.extent.centerLon.toFixed(6)}
              </span>
            </div>
            <div style={styles.extentRow}>
              <span style={styles.extentLabel}>Latitude:</span>
              <span style={styles.extentValue}>
                {stats.extent.minLat.toFixed(6)} → {stats.extent.maxLat.toFixed(6)}
              </span>
            </div>
            <div style={styles.extentRow}>
              <span style={styles.extentLabel}>Longitude:</span>
              <span style={styles.extentValue}>
                {stats.extent.minLon.toFixed(6)} → {stats.extent.maxLon.toFixed(6)}
              </span>
            </div>
            <div style={styles.extentRow}>
              <span style={styles.extentLabel}>Dimensions:</span>
              <span style={styles.extentValue}>
                {(stats.extent.width * 111).toFixed(2)} km × {(stats.extent.height * 111).toFixed(2)} km
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={styles.summary}>
        <p style={styles.summaryText}>
          Cette couche contient <strong>{stats.totalEntities}</strong> entité{stats.totalEntities > 1 ? 's' : ''} de{' '}
          <strong>{Object.keys(stats.geometryTypes).length}</strong> type{Object.keys(stats.geometryTypes).length > 1 ? 's' : ''} différent{Object.keys(stats.geometryTypes).length > 1 ? 's' : ''}.
        </p>
      </div>
    </div>
  );
};

/**
 * StatItem Component
 */
const StatItem = ({ label, value, icon }) => (
  <div style={statItemStyles.container}>
    <div style={statItemStyles.icon}>{icon}</div>
    <div style={statItemStyles.content}>
      <div style={statItemStyles.value}>{value}</div>
      <div style={statItemStyles.label}>{label}</div>
    </div>
  </div>
);

const statItemStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
  },
  icon: {
    fontSize: '32px',
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: '2px',
  },
};

/**
 * Helper: Extract geometry type from WKT
 */
const extractGeometryType = (wkt) => {
  if (!wkt) return null;
  const match = wkt.match(/^([A-Z]+)/i);
  return match ? match[1].toUpperCase() : null;
};

/**
 * Helper: Extract coordinates from WKT
 */
const extractCoordinates = (wkt) => {
  if (!wkt) return [];

  const cleaned = wkt.replace(/^[A-Z]+\s*\(/i, '').replace(/\)$/, '');
  const regex = /([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)/g;
  const matches = [];
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    const lon = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    if (!isNaN(lon) && !isNaN(lat)) {
      matches.push([lon, lat]);
    }
  }

  return matches;
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'auto',
  },
  header: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
  },
  title: {
    margin: 0,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    margin: `${spacing.xs} 0 0 0`,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.md,
    borderBottom: `1px solid ${colors.border}`,
  },
  sectionTitle: {
    margin: `0 0 ${spacing.md} 0`,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  geomTypesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  },
  geomTypeItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
  },
  geomTypeLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  geomTypeIcon: {
    fontSize: fontSize.lg,
  },
  geomTypeName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  geomTypeRight: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: '150px',
  },
  geomTypeCount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    minWidth: '30px',
    textAlign: 'right',
  },
  geomTypeBar: {
    flex: 1,
    height: '8px',
    backgroundColor: colors.grayLight,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  geomTypeBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    transition: 'width 0.3s ease',
  },
  geomTypePercent: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    minWidth: '40px',
    textAlign: 'right',
  },
  extentBox: {
    padding: spacing.md,
    backgroundColor: colors.grayVeryLight,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.border}`,
  },
  extentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.xs} 0`,
    borderBottom: `1px solid ${colors.border}`,
  },
  extentLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  extentValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    fontFamily: 'monospace',
  },
  summary: {
    padding: spacing.md,
    backgroundColor: colors.primaryVeryLight,
    borderTop: `1px solid ${colors.primaryLight}`,
  },
  summaryText: {
    margin: 0,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: '1.6',
  },
};

export default StatsPanel;
