// ═══════════════════════════════════════════════
//  MusicPlayer — Musica di sottofondo per D&D
//  Autoplay con fade-in, loop, mute/unmute
// ═══════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";

// Tracce royalty-free da soundimage.org (Eric Matyas)
export const TRACKS = {
  lobby:   "https://soundimage.org/wp-content/uploads/2023/01/Dungeons-and-Tunnels.mp3",
  combat:  "https://soundimage.org/wp-content/uploads/2018/01/Battle-of-the-Ancients.mp3",
  explore: "https://soundimage.org/wp-content/uploads/2020/07/A-Trail-of-Jewels.mp3",
  victory: "https://soundimage.org/wp-content/uploads/2020/06/The-Key-to-the-Kingdom.mp3",
};

export default function MusicPlayer({ track = "lobby" }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [volume, setVolume] = useState(0.35);
  const currentTrack = TRACKS[track] || TRACKS.lobby;

  // Inizializza audio
  useEffect(() => {
    const audio = new Audio(currentTrack);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    // Tenta autoplay — i browser richiedono un'interazione utente
    const tryPlay = () => {
      audio.play()
        .then(() => {
          setStarted(true);
          // Fade in
          let v = 0;
          const fade = setInterval(() => {
            v = Math.min(v + 0.02, volume);
            audio.volume = muted ? 0 : v;
            if (v >= volume) clearInterval(fade);
          }, 80);
        })
        .catch(() => {
          // Autoplay bloccato — aspetta il primo click
          const unlock = () => {
            audio.play().then(() => setStarted(true)).catch(() => {});
            audio.volume = muted ? 0 : volume;
            document.removeEventListener("click", unlock);
            document.removeEventListener("touchstart", unlock);
          };
          document.addEventListener("click", unlock, { once: true });
          document.addEventListener("touchstart", unlock, { once: true });
        });
    };

    tryPlay();

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [currentTrack]); // ricrea quando cambia traccia

  // Gestisci mute/volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = muted ? 0 : volume;
  }, [muted, volume]);

  const toggleMute = () => setMuted(m => !m);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Slider volume — compare solo se non muted */}
      {!muted && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          style={{
            width: 60,
            accentColor: "var(--gold)",
            opacity: 0.7,
            cursor: "pointer",
          }}
          title="Volume"
        />
      )}

      {/* Bottone mute */}
      <button
        onClick={toggleMute}
        title={muted ? "Attiva musica" : "Muto"}
        style={{
          background: "rgba(8,5,2,0.75)",
          border: `1px solid ${muted ? "rgba(212,175,55,0.2)" : "rgba(212,175,55,0.5)"}`,
          borderRadius: "50%",
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "1rem",
          backdropFilter: "blur(8px)",
          transition: "all 0.2s",
          opacity: muted ? 0.5 : 1,
        }}
      >
        {muted ? "🔇" : "🎵"}
      </button>
    </div>
  );
}
