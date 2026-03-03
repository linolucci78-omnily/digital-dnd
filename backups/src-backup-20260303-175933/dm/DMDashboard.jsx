// ═══════════════════════════════════════════════
//  DMDashboard — Dashboard principale del Dungeon Master
//  Mostra tutte le sezioni disponibili come carte cliccabili
//  Con animazioni e preview delle sezioni
// ═══════════════════════════════════════════════

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function DMDashboard({ onSelectSection, sessionData }) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  // Sezioni disponibili
  const sections = [
    {
      id: "dm-main",
      title: "Tavolo del Dungeon Master",
      description: "Pannello principale: mappa, scene, combattimento e controlli DM",
      icon: "🎯",
      color: "#8B4513",
      badge: "Main Hub",
      image: "/cards/dm-main-card.png",
    },
    {
      id: "scenes",
      title: "Scene & Mappe",
      description: "Crea e gestisci le scene della campagna con mappe e grid",
      icon: "🗺️",
      color: "#1565C0",
      badge: "Maps",
      image: "/cards/scenes-card.png",
    },
    {
      id: "party",
      title: "Party",
      description: "Visualizza e gestisci i personaggi dei giocatori",
      icon: "⚔️",
      color: "#2E7D32",
      badge: sessionData?.players?.length || 0,
      image: "/cards/party-card.png",
    },
    {
      id: "npcs",
      title: "NPC & Mostri",
      description: "Gestisci PNG, nemici e alleati della campagna",
      icon: "🐉",
      color: "#C62828",
      badge: "5 NPC",
      image: "/cards/npc-card.png",
    },
    {
      id: "inventory",
      title: "Inventario & Tesori",
      description: "Oggetti magici, equipaggiamento, bottino",
      icon: "💎",
      color: "#F57C00",
      badge: "12 Oggetti",
      image: "/cards/inventory-card.png",
    },
    {
      id: "diary",
      title: "Diario di Sessione",
      description: "Note, eventi importanti, progressione storia",
      icon: "📖",
      color: "#6A1B9A",
      badge: "3 Voci",
      image: "/cards/diary-card.png",
    },
    {
      id: "narrative",
      title: "Narrativa & Storia",
      description: "Testi narrativi, descrizioni ambientali e dialoghi NPC",
      icon: "📜",
      color: "#5E35B1",
      badge: "Story",
      image: "/cards/narrative-card.png",
    },
    {
      id: "music",
      title: "Musica & Ambiente",
      description: "Controlla musica di sottofondo e effetti sonori",
      icon: "🎵",
      color: "#00838F",
      badge: "Playlist",
      image: "/cards/mcard.png",
    },
    {
      id: "dice",
      title: "Dadi & Tiri",
      description: "Lancia dadi, gestisci tiri salvezza e abilità",
      icon: "🎲",
      color: "#D4AF37",
      badge: "d20",
      image: "/cards/dice-card.png",
    },
  ];

  const handleCardClick = (section) => {
    console.log("🎯 Card clicked - FULL SECTION:", section);
    console.log("🎯 Card clicked - ID:", section.id);
    console.log("🎯 Card clicked - TITLE:", section.title);
    setSelectedCard(section.id);
    // Animazione di transizione prima di cambiare sezione
    setTimeout(() => {
      console.log("🚀 TIMEOUT - Calling onSelectSection with:", section.id);
      onSelectSection(section.id);
    }, 600);
  };

  return (
    <div
      className="bg-image bg-dmroom"
      style={{
        width: "100%",
        height: "100vh",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Overlay scuro per leggibilità */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(15,10,8,0.85), rgba(25,20,15,0.85))",
          zIndex: 1,
        }}
      />

      {/* Contenuto */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "40px",
          gap: "40px",
        }}
      >
        {/* Hero Section */}
        <div
          style={{
            textAlign: "center",
            animation: "fadeInDown 0.8s ease-out forwards",
          }}
        >
          <h1
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "3rem",
              color: "#D4AF37",
              marginBottom: "10px",
              letterSpacing: "0.1em",
              textShadow: "0 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.3)",
            }}
          >
            Tavolo del Dungeon Master
          </h1>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1.1rem",
              color: "var(--parchment)",
              opacity: 0.8,
            }}
          >
            Sessione: <span style={{ color: "#D4AF37", fontWeight: 600 }}>{sessionData?.name || "Nuova Avventura"}</span>
          </p>
        </div>

        {/* Griglia Carte */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "40px",
            alignContent: "start",
            maxWidth: "1800px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <AnimatePresence>
            {sections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                style={{
                  position: "relative",
                  height: "500px",
                }}
              >
                <div
                  onMouseEnter={() => {
                    console.log("🖱️ Mouse enter:", section.id);
                    setHoveredCard(section.id);
                  }}
                  onMouseLeave={() => {
                    console.log("🖱️ Mouse leave");
                    setHoveredCard(null);
                  }}
                  onMouseDown={(e) => {
                    console.log("🔽 Mouse down!");
                  }}
                  onMouseUp={(e) => {
                    console.log("🔼 Mouse up!");
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("👆 Click detected on card!");
                    handleCardClick(section);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("👆👆 ONCLICK FIRED!");
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${section.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: `3px solid ${hoveredCard === section.id ? "#D4AF37" : "rgba(212,175,55,0.5)"}`,
                    borderRadius: "16px",
                    padding: "30px",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    transform: hoveredCard === section.id ? "translateY(-8px) scale(1.05)" : "translateY(0) scale(1)",
                    boxShadow: hoveredCard === section.id
                      ? "0 20px 40px rgba(212,175,55,0.6), 0 0 60px rgba(212,175,55,0.3)"
                      : "0 8px 16px rgba(0,0,0,0.5)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "20px",
                    textAlign: "center",
                    overflow: "hidden",
                    filter: hoveredCard === section.id ? "brightness(1.1)" : "brightness(1)",
                  }}
                >
                {/* Overlay scuro solo su hover per leggibilità */}
                {hoveredCard === section.id && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
                      borderRadius: "16px",
                      pointerEvents: "none",
                      transition: "opacity 0.3s ease",
                    }}
                  />
                )}

                {/* Titolo in basso - visibile solo su hover */}
                {hoveredCard === section.id && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "20px",
                      left: "20px",
                      right: "20px",
                      zIndex: 10,
                      pointerEvents: "none",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: "1.3rem",
                        color: "#D4AF37",
                        marginBottom: "5px",
                        letterSpacing: "0.05em",
                        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                      }}
                    >
                      {section.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "0.85rem",
                        color: "var(--parchment)",
                        opacity: 0.9,
                        lineHeight: 1.4,
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                      }}
                    >
                      {section.description}
                    </p>
                  </div>
                )}

                {/* Effetto hover decorativo */}
                {hoveredCard === section.id && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      border: "1px solid rgba(212,175,55,0.2)",
                      borderRadius: "16px",
                      pointerEvents: "none",
                      animation: "cardGlow 2s ease-in-out infinite",
                    }}
                  />
                )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Overlay di transizione quando si clicca */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              background: "radial-gradient(circle, rgba(212,175,55,0.3), rgba(15,10,8,0.95))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "6rem",
            }}
          >
            {sections.find((s) => s.id === selectedCard)?.icon}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardGlow {
          0%, 100% {
            box-shadow: inset 0 0 20px rgba(212,175,55,0.2);
          }
          50% {
            box-shadow: inset 0 0 40px rgba(212,175,55,0.4);
          }
        }
      `}</style>
    </div>
  );
}
