// ═══════════════════════════════════════════════
//  PlayerBattleMap — Mappa di Battaglia per Player
//  Permette al player di vedere la mappa e muovere
//  il proprio token durante il suo turno
// ═══════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export default function PlayerBattleMap({
  mapUrl,
  cellSize = 50,
  gridVisible = true,
  gridOpacity = 0.15,
  tokens = [],
  myCharacterId,
  tvChannel,
  isMyTurn = false,
  mySpeed = 30,
}) {
  const mapRef = useRef(null);
  const [draggingToken, setDraggingToken] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [myToken, setMyToken] = useState(null);

  // Trova il token del player
  useEffect(() => {
    const token = tokens.find(t => t.characterId === myCharacterId || t.id === myCharacterId);
    setMyToken(token);
  }, [tokens, myCharacterId]);

  // Calcola movimento massimo in celle (speed / 5 in D&D 5e)
  const maxMovementCells = Math.floor(mySpeed / 5);

  // Inizia drag
  const handleMouseDown = (e, token) => {
    if (!isMyTurn) return;
    if (token.characterId !== myCharacterId && token.id !== myCharacterId) return;

    const rect = mapRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - token.x;
    const offsetY = e.clientY - rect.top - token.y;

    setDraggingToken(token);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  // Drag
  const handleMouseMove = (e) => {
    if (!draggingToken || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    let newX = e.clientX - rect.left - dragOffset.x;
    let newY = e.clientY - rect.top - dragOffset.y;

    // Snap to grid
    const newCol = Math.round(newX / cellSize);
    const newRow = Math.round(newY / cellSize);

    // Limita movimento in base a speed
    const originalCol = Math.round(draggingToken.x / cellSize);
    const originalRow = Math.round(draggingToken.y / cellSize);
    const distance = Math.abs(newCol - originalCol) + Math.abs(newRow - originalRow);

    if (distance > maxMovementCells) {
      return; // Troppo lontano
    }

    setDraggingToken({
      ...draggingToken,
      x: newCol * cellSize,
      y: newRow * cellSize,
      gridCol: newCol,
      gridRow: newRow,
    });
  };

  // Fine drag - invia broadcast
  const handleMouseUp = () => {
    if (!draggingToken || !tvChannel) {
      setDraggingToken(null);
      return;
    }

    // Broadcast movimento al DM/TV
    tvChannel.send({
      type: "broadcast",
      event: "player_token_move",
      payload: {
        tokenId: draggingToken.id,
        gridCol: draggingToken.gridCol,
        gridRow: draggingToken.gridRow,
        characterId: myCharacterId,
      },
    }).then(() => {
      console.log("✅ Movimento token inviato:", draggingToken.gridCol, draggingToken.gridRow);
    }).catch(err => {
      console.error("❌ Errore invio movimento:", err);
    });

    setDraggingToken(null);
  };

  if (!mapUrl) {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.4)",
        fontSize: "0.9rem",
      }}>
        Nessuna mappa di battaglia attiva
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "auto",
        background: "#000",
        cursor: isMyTurn && myToken ? "grab" : "default",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Mappa */}
      <img
        src={mapUrl}
        alt="Mappa battaglia"
        style={{
          display: "block",
          maxWidth: "100%",
          height: "auto",
          userSelect: "none",
          pointerEvents: "none",
        }}
        draggable={false}
      />

      {/* Griglia */}
      {gridVisible && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage: `
              linear-gradient(rgba(201,168,76,${gridOpacity}) 1px, transparent 1px),
              linear-gradient(90deg, rgba(201,168,76,${gridOpacity}) 1px, transparent 1px)
            `,
            backgroundSize: `${cellSize}px ${cellSize}px`,
          }}
        />
      )}

      {/* Token */}
      {tokens.map(token => {
        const isMyToken = token.characterId === myCharacterId || token.id === myCharacterId;
        const displayToken = draggingToken?.id === token.id ? draggingToken : token;
        const isDragging = draggingToken?.id === token.id;

        return (
          <motion.div
            key={token.id}
            style={{
              position: "absolute",
              left: displayToken.x,
              top: displayToken.y,
              width: cellSize,
              height: cellSize,
              cursor: isMyTurn && isMyToken ? "grab" : "default",
              zIndex: isDragging ? 100 : isMyToken ? 50 : 10,
            }}
            animate={{
              scale: isDragging ? 1.1 : 1,
              opacity: isDragging ? 0.8 : 1,
            }}
            onMouseDown={(e) => handleMouseDown(e, token)}
          >
            {/* Cerchio token */}
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                border: `3px solid ${isMyToken ? "#C9A84C" : token.color || "#888"}`,
                background: token.imgUrl
                  ? `url(${token.imgUrl})`
                  : token.type === "hero"
                  ? "linear-gradient(135deg, rgba(201,168,76,0.5), rgba(201,168,76,0.3))"
                  : "linear-gradient(135deg, rgba(220,20,60,0.5), rgba(220,20,60,0.3))",
                backgroundSize: "cover",
                backgroundPosition: "center",
                boxShadow: isMyToken
                  ? "0 0 20px rgba(201,168,76,0.6)"
                  : "0 4px 12px rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: cellSize * 0.3,
                color: "#fff",
                textShadow: "0 2px 4px #000",
              }}
            >
              {!token.imgUrl && token.name?.charAt(0).toUpperCase()}
            </div>

            {/* Nome token */}
            <div
              style={{
                position: "absolute",
                top: -20,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: cellSize * 0.2,
                fontWeight: 700,
                color: isMyToken ? "#C9A84C" : "#fff",
                whiteSpace: "nowrap",
                textShadow: "0 2px 6px #000",
                pointerEvents: "none",
              }}
            >
              {token.name}
            </div>

            {/* Indicatore "IL TUO TURNO" */}
            {isMyToken && isMyTurn && (
              <div
                style={{
                  position: "absolute",
                  bottom: -25,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: cellSize * 0.18,
                  fontWeight: 700,
                  color: "#C9A84C",
                  whiteSpace: "nowrap",
                  textShadow: "0 2px 6px #000",
                  pointerEvents: "none",
                  animation: "pulse 2s infinite",
                }}
              >
                IL TUO TURNO
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Indicatore movimento massimo */}
      {isMyTurn && myToken && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.8)",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: "0.8rem",
            color: "#C9A84C",
            border: "1px solid rgba(201,168,76,0.3)",
          }}
        >
          Movimento: {maxMovementCells} celle (Speed: {mySpeed} ft)
        </div>
      )}
    </div>
  );
}
