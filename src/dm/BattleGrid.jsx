// ═══════════════════════════════════════════════
//  BattleGrid — Sistema Tattico di Combattimento
//  Griglia + Token + Drag & Drop + Iniziativa
// ═══════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DnDIcon from "../shared/components/DnDIcon.jsx";

// Mock data - TODO: Pass from DMPanel props
const MOCK_HEROES = [
  { id: "hero_1", name: "Guerriero", hp: 45, maxHp: 52, ac: 16, speed: 30, imgUrl: "/assets/hero/paladin.png" },
  { id: "hero_2", name: "Mago", hp: 28, maxHp: 28, ac: 12, speed: 30, imgUrl: null },
];

const MOCK_MONSTERS = [
  { id: "goblin", name: "Goblin", hp: 7, maxHp: 7, ac: 15, speed: 30, cr: "1/4" },
  { id: "orc", name: "Orco", hp: 15, maxHp: 15, ac: 13, speed: 30, cr: "1/2" },
  { id: "troll", name: "Troll", hp: 84, maxHp: 84, ac: 15, speed: 30, cr: "5" },
];

const MOCK_NPCS = [
  { id: "npc_1", name: "Sildar", hp: 27, maxHp: 27, ac: 16, speed: 30 },
];

export default function BattleGrid({
  mapUrl,
  tvChannel,
  session,
  characters = MOCK_HEROES,  // Heroes from campaign
  monsters = MOCK_MONSTERS,   // Monsters from combat tab
  npcs = MOCK_NPCS          // NPCs from NPC manager
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
  const [draggedToken, setDraggedToken] = useState(null);
  const [draggedTrayItem, setDraggedTrayItem] = useState(null);
  const tokenIdCounter = useRef(0);

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

  // Broadcast token update to TV
  const broadcastTokenUpdate = async (action, tokenData) => {
    if (!tvChannel) return;

    try {
      await tvChannel.send({
        type: 'broadcast',
        event: 'token_update',
        payload: {
          action, // 'add', 'move', 'remove', 'update_hp'
          token: tokenData
        }
      });
      console.log(`✅ Token ${action}:`, tokenData);
    } catch (e) {
      console.error("❌ Errore broadcast token:", e);
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

  // ────────────────────────────────────────────────
  // DRAG & DROP SYSTEM
  // ────────────────────────────────────────────────

  // Start dragging from tray
  const handleTrayDragStart = (e, trayItem, type) => {
    setDraggedTrayItem({ ...trayItem, type });
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Start dragging existing token on map
  const handleTokenDragStart = (e, token) => {
    setDraggedToken(token);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over map (required for drop to work)
  const handleMapDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedTrayItem ? 'copy' : 'move';
  };

  // Handle drop on map
  const handleMapDrop = (e) => {
    e.preventDefault();
    if (!mapContainerRef.current) return;

    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Snap to grid
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    // Check if cell is occupied
    if (getCellOccupant(col, row)) {
      console.log("⚠️ Cella occupata");
      setDraggedTrayItem(null);
      setDraggedToken(null);
      return;
    }

    if (draggedTrayItem) {
      // Adding new token from tray
      const newToken = {
        id: `token_${tokenIdCounter.current++}`,
        sourceId: draggedTrayItem.id,
        name: draggedTrayItem.name,
        type: draggedTrayItem.type, // 'hero', 'monster', 'npc'
        gridCol: col,
        gridRow: row,
        x: col * cellSize,
        y: row * cellSize,
        hp: draggedTrayItem.hp,
        maxHp: draggedTrayItem.maxHp,
        ac: draggedTrayItem.ac,
        speed: draggedTrayItem.speed,
        imgUrl: draggedTrayItem.imgUrl || null,
        color: draggedTrayItem.type === 'hero' ? '#C9A84C' : '#DC143C'
      };

      setTokens(prev => [...prev, newToken]);
      broadcastTokenUpdate('add', newToken);
      setDraggedTrayItem(null);

    } else if (draggedToken) {
      // Moving existing token
      setTokens(prev => prev.map(t =>
        t.id === draggedToken.id
          ? { ...t, gridCol: col, gridRow: row, x: col * cellSize, y: row * cellSize }
          : t
      ));

      broadcastTokenUpdate('move', {
        id: draggedToken.id,
        gridCol: col,
        gridRow: row
      });

      setDraggedToken(null);
    }
  };

  // Remove token
  const handleRemoveToken = (tokenId) => {
    setTokens(prev => prev.filter(t => t.id !== tokenId));
    broadcastTokenUpdate('remove', { id: tokenId });
  };

  // Update token HP
  const handleUpdateTokenHP = (tokenId, newHP) => {
    setTokens(prev => prev.map(t =>
      t.id === tokenId ? { ...t, hp: Math.max(0, Math.min(t.maxHp, newHP)) } : t
    ));

    broadcastTokenUpdate('update_hp', {
      id: tokenId,
      hp: Math.max(0, Math.min(tokens.find(t => t.id === tokenId)?.maxHp || 0, newHP))
    });
  };

  // Clear all tokens
  const handleClearTokens = () => {
    setTokens([]);
    broadcastTokenUpdate('clear', {});
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 200px)", gap: 16 }}>
      {/* Main Grid Area */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 16
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
            <DnDIcon icon="grid" size={16} /> CONTROLLI BATTAGLIA
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {/* Cell Size */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{
                fontSize: "0.7rem",
                color: "rgba(224,216,200,0.4)",
                letterSpacing: "0.05em"
              }}>
                Celle
              </label>
              <input
                type="range"
                min="30"
                max="80"
                value={cellSize}
                onChange={(e) => handleCellSizeChange(parseInt(e.target.value))}
                style={{ width: 80, accentColor: "#DC143C" }}
              />
              <span style={{ fontSize: "0.7rem", color: "#C9A84C", minWidth: 28 }}>
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
                style={{ width: 80, accentColor: "#DC143C" }}
              />
              <span style={{ fontSize: "0.7rem", color: "#C9A84C", minWidth: 28 }}>
                {Math.round(gridOpacity * 100)}%
              </span>
            </div>

            {/* Toggle Grid */}
            <motion.button
              onClick={handleToggleGrid}
              style={{
                padding: "6px 14px",
                fontFamily: "var(--font-heading)",
                fontSize: "0.6rem",
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
              {gridVisible ? "Nascondi" : "Mostra"}
            </motion.button>

            {/* Clear Tokens */}
            {tokens.length > 0 && (
              <motion.button
                onClick={handleClearTokens}
                style={{
                  padding: "6px 14px",
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  border: "1px solid rgba(192,64,64,0.3)",
                  background: "rgba(192,64,64,0.2)",
                  color: "#C9A84C",
                  cursor: "pointer",
                  borderRadius: 6,
                }}
                whileHover={{
                  background: "rgba(192,64,64,0.3)",
                }}
                whileTap={{ scale: 0.98 }}
              >
                <DnDIcon icon="close" size={12} /> Cancella Tutti
              </motion.button>
            )}
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
            onDragOver={handleMapDragOver}
            onDrop={handleMapDrop}
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

            {/* Tokens on Map */}
            {tokens.map(token => (
              <div
                key={token.id}
                draggable
                onDragStart={(e) => handleTokenDragStart(e, token)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleRemoveToken(token.id);
                }}
                style={{
                  position: "absolute",
                  left: token.x,
                  top: token.y,
                  width: cellSize,
                  height: cellSize,
                  borderRadius: "50%",
                  border: `3px solid ${token.color}`,
                  background: token.imgUrl
                    ? `url(${token.imgUrl})`
                    : token.type === 'hero'
                      ? "linear-gradient(135deg, rgba(201,168,76,0.4), rgba(201,168,76,0.2))"
                      : "linear-gradient(135deg, rgba(220,20,60,0.4), rgba(220,20,60,0.2))",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
                  cursor: "grab",
                  zIndex: 10,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title={`${token.name}\nHP: ${token.hp}/${token.maxHp}\nAC: ${token.ac}\nClick destro per rimuovere`}
              >
                {/* Token Label */}
                <div style={{
                  position: "absolute",
                  top: -18,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "0.5rem",
                  fontFamily: "var(--font-heading)",
                  color: "#C9A84C",
                  whiteSpace: "nowrap",
                  textShadow: "0 1px 4px #000",
                  pointerEvents: "none"
                }}>
                  {token.name}
                </div>

                {/* HP Bar */}
                <div style={{
                  position: "absolute",
                  bottom: 2,
                  left: 3,
                  right: 3,
                  height: 4,
                  background: "rgba(0,0,0,0.6)",
                  borderRadius: 2,
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: `${(token.hp / token.maxHp) * 100}%`,
                    background: token.hp > token.maxHp * 0.5
                      ? "linear-gradient(90deg, #22C55E, #16A34A)"
                      : token.hp > token.maxHp * 0.25
                        ? "linear-gradient(90deg, #EAB308, #CA8A04)"
                        : "linear-gradient(90deg, #EF4444, #DC2626)",
                    transition: "width 0.3s"
                  }} />
                </div>

                {/* Token Icon (if no image) */}
                {!token.imgUrl && (
                  <div style={{
                    fontSize: cellSize * 0.4,
                    opacity: 0.6
                  }}>
                    {token.type === 'hero' ? '⚔️' : token.type === 'npc' ? '👤' : '☠️'}
                  </div>
                )}
              </div>
            ))}
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
              Px: <span style={{ color: "#C9A84C" }}>{hoveredCoords.x}, {hoveredCoords.y}</span>
            </span>
            <span>
              Cella: <span style={{ color: "#C9A84C" }}>
                C{hoveredCell.col}, R{hoveredCell.row}
              </span>
            </span>
            <span style={{ color: "rgba(224,216,200,0.4)" }}>
              {getCellOccupant(hoveredCell.col, hoveredCell.row)
                ? `${getCellOccupant(hoveredCell.col, hoveredCell.row).name}`
                : "Libera"
              }
            </span>
          </div>
        )}
      </div>

      {/* Sidebar - Token Tray */}
      <div style={{
        width: 220,
        background: "rgba(8,8,12,0.95)",
        border: "1px solid rgba(201,168,76,0.06)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        <div style={{
          padding: 16,
          borderBottom: "1px solid rgba(201,168,76,0.04)"
        }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.7rem",
            color: "#C9A84C",
            letterSpacing: "0.15em",
            marginBottom: 4
          }}>
            TOKEN
          </div>
          <div style={{
            fontSize: "0.6rem",
            color: "rgba(224,216,200,0.3)"
          }}>
            Trascina sulla mappa
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {/* Heroes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: "0.6rem",
              color: "rgba(201,168,76,0.4)",
              letterSpacing: "0.1em",
              marginBottom: 8,
              textTransform: "uppercase"
            }}>
              ⚔️ Eroi
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {characters.map(hero => (
                <div
                  key={hero.id}
                  draggable
                  onDragStart={(e) => handleTrayDragStart(e, hero, 'hero')}
                  style={{
                    aspectRatio: "1",
                    background: "rgba(20,18,15,0.8)",
                    border: "1px solid rgba(201,168,76,0.08)",
                    borderRadius: "50%",
                    cursor: "grab",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.45rem",
                    color: "rgba(224,216,200,0.5)",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  title={`${hero.name}\nHP: ${hero.hp}/${hero.maxHp}\nAC: ${hero.ac}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)";
                    e.currentTarget.style.background = "rgba(30,25,20,0.8)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.08)";
                    e.currentTarget.style.background = "rgba(20,18,15,0.8)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {hero.imgUrl ? (
                    <img src={hero.imgUrl} alt={hero.name} style={{
                      width: "80%",
                      height: "80%",
                      objectFit: "cover",
                      borderRadius: "50%"
                    }} />
                  ) : (
                    <span style={{ fontSize: "1.2rem" }}>⚔️</span>
                  )}
                  <div style={{
                    position: "absolute",
                    bottom: -14,
                    fontSize: "0.4rem",
                    color: "rgba(224,216,200,0.3)",
                    whiteSpace: "nowrap"
                  }}>
                    {hero.name.slice(0, 8)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monsters */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: "0.6rem",
              color: "rgba(220,20,60,0.6)",
              letterSpacing: "0.1em",
              marginBottom: 8,
              textTransform: "uppercase"
            }}>
              ☠️ Mostri
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {monsters.map(monster => (
                <div
                  key={monster.id}
                  draggable
                  onDragStart={(e) => handleTrayDragStart(e, monster, 'monster')}
                  style={{
                    aspectRatio: "1",
                    background: "rgba(20,18,15,0.8)",
                    border: "1px solid rgba(220,20,60,0.08)",
                    borderRadius: "50%",
                    cursor: "grab",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.45rem",
                    color: "rgba(224,216,200,0.5)",
                    transition: "all 0.2s",
                    position: "relative"
                  }}
                  title={`${monster.name}\nHP: ${monster.hp}/${monster.maxHp}\nAC: ${monster.ac}\nCR: ${monster.cr}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(220,20,60,0.3)";
                    e.currentTarget.style.background = "rgba(30,20,20,0.8)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(220,20,60,0.08)";
                    e.currentTarget.style.background = "rgba(20,18,15,0.8)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>☠️</span>
                  <div style={{
                    position: "absolute",
                    bottom: -14,
                    fontSize: "0.4rem",
                    color: "rgba(224,216,200,0.3)",
                    whiteSpace: "nowrap"
                  }}>
                    {monster.name.slice(0, 8)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* NPCs */}
          {npcs.length > 0 && (
            <div>
              <div style={{
                fontSize: "0.6rem",
                color: "rgba(201,168,76,0.4)",
                letterSpacing: "0.1em",
                marginBottom: 8,
                textTransform: "uppercase"
              }}>
                👤 NPC
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {npcs.map(npc => (
                  <div
                    key={npc.id}
                    draggable
                    onDragStart={(e) => handleTrayDragStart(e, npc, 'npc')}
                    style={{
                      aspectRatio: "1",
                      background: "rgba(20,18,15,0.8)",
                      border: "1px solid rgba(201,168,76,0.08)",
                      borderRadius: "50%",
                      cursor: "grab",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.45rem",
                      color: "rgba(224,216,200,0.5)",
                      transition: "all 0.2s",
                      position: "relative"
                    }}
                    title={`${npc.name}\nHP: ${npc.hp}/${npc.maxHp}\nAC: ${npc.ac}`}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)";
                      e.currentTarget.style.background = "rgba(25,22,18,0.8)";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(201,168,76,0.08)";
                      e.currentTarget.style.background = "rgba(20,18,15,0.8)";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>👤</span>
                    <div style={{
                      position: "absolute",
                      bottom: -14,
                      fontSize: "0.4rem",
                      color: "rgba(224,216,200,0.3)",
                      whiteSpace: "nowrap"
                    }}>
                      {npc.name.slice(0, 8)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
