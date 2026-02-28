// ═══════════════════════════════════════════════
//  BattleGrid — Sistema Tattico di Combattimento
//  Griglia + Token + Drag & Drop + Iniziativa
// ═══════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DnDIcon from "../shared/components/DnDIcon.jsx";

export default function BattleGrid({
  mapUrl,
  tvChannel,
  session
}) {
  // Grid state
  const [cellSize, setCellSize] = useState(50);
  const [gridOpacity, setGridOpacity] = useState(0.15);
  const [gridVisible, setGridVisible] = useState(true);

  // Hover state
  const [hoveredCell, setHoveredCell] = useState(null);
  const [hoveredCoords, setHoveredCoords] = useState({ x: 0, y: 0 });

  // Token state
  const [tokens, setTokens] = useState([]);

  const mapContainerRef = useRef(null);

  // Broadcast grid settings to TV
  const broadcastGridUpdate = async (settings) => {
    if (!tvChannel) return;

    try {
      await tvChannel.send({
        type: 'broadcast',
        event: 'grid_update',
        payload: {
          cellSize: settings.cellSize || cellSize,
          gridOpacity: settings.gridOpacity || gridOpacity,
          gridVisible: settings.gridVisible ?? gridVisible,
        }
      });
    } catch (e) {
      console.error("❌ Errore broadcast griglia:", e);
    }
  };

  // Update cell size
  const handleCellSizeChange = (newSize) => {
    setCellSize(newSize);
    broadcastGridUpdate({ cellSize: newSize });

    // Reposition existing tokens to new grid
    setTokens(prevTokens =>
      prevTokens.map(token => ({
        ...token,
        x: token.gridCol * newSize,
        y: token.gridRow * newSize,
      }))
    );
  };

  // Update grid opacity
  const handleOpacityChange = (newOpacity) => {
    setGridOpacity(newOpacity);
    broadcastGridUpdate({ gridOpacity: newOpacity });
  };

  // Toggle grid visibility
  const handleToggleGrid = () => {
    const newVisible = !gridVisible;
    setGridVisible(newVisible);
    broadcastGridUpdate({ gridVisible: newVisible });
  };

  // Handle mouse move over map
  const handleMouseMove = (e) => {
    if (!mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    setHoveredCell({ col, row });
    setHoveredCoords({ x: Math.round(x), y: Math.round(y) });
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  // Check if cell is occupied
  const getCellOccupant = (col, row) => {
    return tokens.find(t => t.gridCol === col && t.gridRow === row);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 20,
      height: "100%"
    }}>
      {/* Controls */}
      <div style={{
        background: "rgba(212,175,55,0.05)",
        border: "1px solid rgba(212,175,55,0.15)",
        borderRadius: 12,
        padding: 16
      }}>
        <div style={{
          fontFamily: "var(--font-heading)",
          fontSize: "0.8rem",
          color: "var(--gold)",
          letterSpacing: "0.15em",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <DnDIcon icon="grid" size={16} /> CONTROLLI GRIGLIA
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Cell Size */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{
              fontSize: "0.7rem",
              color: "rgba(224,216,200,0.4)",
              letterSpacing: "0.05em"
            }}>
              Dimensione Celle
            </label>
            <input
              type="range"
              min="30"
              max="80"
              value={cellSize}
              onChange={(e) => handleCellSizeChange(parseInt(e.target.value))}
              style={{ width: 100, accentColor: "#DC143C" }}
            />
            <span style={{
              fontSize: "0.7rem",
              color: "#C9A84C",
              minWidth: 28
            }}>
              {cellSize}px
            </span>
          </div>

          {/* Grid Opacity */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{
              fontSize: "0.7rem",
              color: "rgba(224,216,200,0.4)",
              letterSpacing: "0.05em"
            }}>
              Opacità
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={gridOpacity * 100}
              onChange={(e) => handleOpacityChange(parseInt(e.target.value) / 100)}
              style={{ width: 100, accentColor: "#DC143C" }}
            />
            <span style={{
              fontSize: "0.7rem",
              color: "#C9A84C",
              minWidth: 28
            }}>
              {Math.round(gridOpacity * 100)}%
            </span>
          </div>

          {/* Toggle Grid */}
          <motion.button
            onClick={handleToggleGrid}
            style={{
              padding: "6px 16px",
              fontFamily: "var(--font-heading)",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              border: gridVisible ? "1px solid rgba(220,20,60,0.3)" : "1px solid rgba(201,168,76,0.3)",
              background: gridVisible
                ? "linear-gradient(135deg, #1a0808, #0a0505)"
                : "linear-gradient(135deg, #4a1515, #2a0808)",
              color: "#C9A84C",
              cursor: "pointer",
              borderRadius: 6,
            }}
            whileHover={{
              background: "linear-gradient(135deg, #2a1010, #1a0808)",
              borderColor: "#DC143C"
            }}
            whileTap={{ scale: 0.98 }}
          >
            {gridVisible ? "Nascondi Griglia" : "Mostra Griglia"}
          </motion.button>
        </div>
      </div>

      {/* Map Container */}
      <div style={{
        flex: 1,
        position: "relative",
        overflow: "auto",
        background: "#050508",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div
          ref={mapContainerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            position: "relative",
            display: "inline-block",
            cursor: "crosshair"
          }}
        >
          {/* Map Image */}
          {mapUrl && (
            <img
              src={mapUrl}
              alt="Battle Map"
              style={{
                display: "block",
                userSelect: "none",
                maxWidth: "100%",
                height: "auto"
              }}
              draggable={false}
            />
          )}

          {/* Grid Overlay */}
          {gridVisible && mapUrl && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 2,
                backgroundImage: `
                  linear-gradient(rgba(201,168,76,${gridOpacity}) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(201,168,76,${gridOpacity}) 1px, transparent 1px)
                `,
                backgroundSize: `${cellSize}px ${cellSize}px`,
                transition: "opacity 0.3s",
                opacity: gridVisible ? 1 : 0
              }}
            />
          )}

          {/* Cell Hover Highlight */}
          {hoveredCell && mapUrl && (
            <div
              style={{
                position: "absolute",
                left: hoveredCell.col * cellSize,
                top: hoveredCell.row * cellSize,
                width: cellSize,
                height: cellSize,
                background: "rgba(220,20,60,0.12)",
                border: "1px solid rgba(220,20,60,0.25)",
                pointerEvents: "none",
                zIndex: 3
              }}
            />
          )}

          {/* Tokens will go here */}
        </div>
      </div>

      {/* Status Bar */}
      {hoveredCell && (
        <div style={{
          padding: "8px 16px",
          background: "rgba(10,10,15,0.95)",
          border: "1px solid rgba(201,168,76,0.06)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: "0.65rem",
          color: "rgba(224,216,200,0.25)"
        }}>
          <span>
            Coordinate: <span style={{ color: "#C9A84C" }}>
              {hoveredCoords.x}, {hoveredCoords.y}
            </span>
          </span>
          <span>
            Cella: <span style={{ color: "#C9A84C" }}>
              Col {hoveredCell.col}, Riga {hoveredCell.row}
            </span>
          </span>
          <span style={{ color: "rgba(224,216,200,0.4)" }}>
            {getCellOccupant(hoveredCell.col, hoveredCell.row)
              ? `Occupata da: ${getCellOccupant(hoveredCell.col, hoveredCell.row).name}`
              : "Libera"
            }
          </span>
        </div>
      )}
    </div>
  );
}
