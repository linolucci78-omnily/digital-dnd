// ═══════════════════════════════════════════════
//  LootDistribution — Sistema distribuzione tesoro
//  Il DM crea un bottino e lo distribuisce ai giocatori
// ═══════════════════════════════════════════════

import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import DnDIcon from "../shared/components/DnDIcon.jsx";
import ModalDialog from "../shared/components/ModalDialog.jsx";
import InputModal from "../shared/components/InputModal.jsx";

export default function LootDistribution({ characters, campaign }) {
  const [gold, setGold] = useState(0);
  const [silver, setSilver] = useState(0);
  const [copper, setCopper] = useState(0);
  const [items, setItems] = useState([]);
  const [selectedChars, setSelectedChars] = useState([]);
  const [distributing, setDistributing] = useState(false);

  // Modal states
  const [modal, setModal] = useState({ isOpen: false, type: "alert", title: "", message: "", onConfirm: null });
  const [inputModal, setInputModal] = useState({ isOpen: false, title: "", label: "", onConfirm: null, defaultValue: "", step: 0 });

  const addItem = () => {
    let tempItem = { name: "", quantity: 1, weight: 0, description: "" };

    // Step 1: Nome
    setInputModal({
      isOpen: true,
      title: "Aggiungi Oggetto",
      label: "Nome oggetto:",
      defaultValue: "",
      step: 1,
      onConfirm: (name) => {
        if (!name.trim()) return;
        tempItem.name = name;

        // Step 2: Quantità
        setInputModal({
          isOpen: true,
          title: "Aggiungi Oggetto",
          label: "Quantità:",
          defaultValue: "1",
          type: "number",
          step: 2,
          onConfirm: (quantity) => {
            tempItem.quantity = parseInt(quantity) || 1;

            // Step 3: Peso
            setInputModal({
              isOpen: true,
              title: "Aggiungi Oggetto",
              label: "Peso (lb):",
              defaultValue: "0",
              type: "number",
              step: 3,
              onConfirm: (weight) => {
                tempItem.weight = parseFloat(weight) || 0;

                // Step 4: Descrizione (opzionale)
                setInputModal({
                  isOpen: true,
                  title: "Aggiungi Oggetto",
                  label: "Descrizione (opzionale):",
                  defaultValue: "",
                  step: 4,
                  onConfirm: (description) => {
                    tempItem.description = description || "";

                    // Aggiungi item finale
                    setItems([...items, { id: Date.now(), ...tempItem }]);
                    setInputModal({ isOpen: false, title: "", label: "", onConfirm: null, defaultValue: "", step: 0 });
                  }
                });
              }
            });
          }
        });
      }
    });
  };

  const distributeRutherLoot = async () => {
    if (selectedChars.length === 0) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Errore",
        message: "Seleziona almeno un giocatore!",
        confirmText: "OK",
      });
      return;
    }

    setModal({
      isOpen: true,
      type: "confirm",
      title: "Conferma Distribuzione",
      message: `Distribuire il tesoro a ${selectedChars.length} giocatori?\n\nOgni giocatore riceverà:\n• ${Math.floor(gold / selectedChars.length)} oro\n• ${Math.floor(silver / selectedChars.length)} argento\n• ${Math.floor(copper / selectedChars.length)} rame\n• ${items.length} oggetti`,
      confirmText: "Distribuisci",
      cancelText: "Annulla",
      onConfirm: async () => {
        await performDistribution();
      }
    });
  };

  const performDistribution = async () => {

    setDistributing(true);

    try {
      // Dividi monete
      const goldPerPlayer = Math.floor(gold / selectedChars.length);
      const silverPerPlayer = Math.floor(silver / selectedChars.length);
      const copperPerPlayer = Math.floor(copper / selectedChars.length);

      // Distribuisci a ogni giocatore
      for (const charId of selectedChars) {
        const { data: char } = await supabase
          .from("characters")
          .select("*")
          .eq("id", charId)
          .single();

        if (!char) continue;

        // Aggiungi monete
        const newGold = (char.gold || 0) + goldPerPlayer;
        const newSilver = (char.silver || 0) + silverPerPlayer;
        const newCopper = (char.copper || 0) + copperPerPlayer;

        // Aggiungi oggetti
        const newInventory = [...(char.inventory || []), ...items];

        await supabase
          .from("characters")
          .update({
            gold: newGold,
            silver: newSilver,
            copper: newCopper,
            inventory: newInventory,
          })
          .eq("id", charId);
      }

      // Success modal
      setModal({
        isOpen: true,
        type: "success",
        title: "Tesoro Distribuito!",
        message: `Ogni giocatore ha ricevuto:\n\n• ${goldPerPlayer} oro\n• ${silverPerPlayer} argento\n• ${copperPerPlayer} rame\n• ${items.length} oggetti`,
        confirmText: "OK",
      });

      // Reset
      setGold(0);
      setSilver(0);
      setCopper(0);
      setItems([]);
      setSelectedChars([]);
    } catch (error) {
      console.error("Errore distribuzione:", error);
      setModal({
        isOpen: true,
        type: "error",
        title: "Errore",
        message: "Si è verificato un errore durante la distribuzione!",
        confirmText: "OK",
      });
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Modals */}
      <ModalDialog
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        onConfirm={modal.onConfirm}
      />

      <InputModal
        isOpen={inputModal.isOpen}
        onClose={() => setInputModal({ isOpen: false, title: "", label: "", onConfirm: null, defaultValue: "", step: 0 })}
        title={inputModal.title}
        label={inputModal.label}
        defaultValue={inputModal.defaultValue}
        type={inputModal.type}
        onConfirm={inputModal.onConfirm}
      />

      <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: "var(--gold)", display: "flex", alignItems: "center", gap: 8 }}>
        <DnDIcon icon="chest" size={24} color="var(--gold)" />
        DISTRIBUZIONE TESORO
      </div>

      {/* Monete */}
      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: "0.9rem", fontWeight: "bold", marginBottom: 12, color: "var(--gold)" }}>
          Monete
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Oro</label>
            <input
              type="number"
              min="0"
              value={gold}
              onChange={e => setGold(parseInt(e.target.value) || 0)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "2px solid #ffd700" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Argento</label>
            <input
              type="number"
              min="0"
              value={silver}
              onChange={e => setSilver(parseInt(e.target.value) || 0)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "2px solid #c0c0c0" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.7)" }}>Rame</label>
            <input
              type="number"
              min="0"
              value={copper}
              onChange={e => setCopper(parseInt(e.target.value) || 0)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "2px solid #b87333" }}
            />
          </div>
        </div>
      </div>

      {/* Oggetti */}
      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "var(--gold)" }}>
            🎒 Oggetti ({items.length})
          </div>
          <button onClick={addItem} className="btn btn-gold" style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
            + Aggiungi Oggetto
          </button>
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: "center", color: "rgba(212,175,55,0.5)", fontStyle: "italic", padding: 16 }}>
            Nessun oggetto nel bottino
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  background: "rgba(0,0,0,0.4)",
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid rgba(212,175,55,0.3)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "0.85rem" }}>{item.name}</div>
                  {item.description && (
                    <div style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.6)" }}>{item.description}</div>
                  )}
                  <div style={{ fontSize: "0.7rem", color: "rgba(212,175,55,0.5)" }}>
                    Qtà: {item.quantity} {item.weight > 0 && `• ${item.weight} lb`}
                  </div>
                </div>
                <button
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  style={{ background: "none", border: "none", color: "var(--crimson-light)", cursor: "pointer", fontSize: "1.2rem" }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selezione Giocatori */}
      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: "0.9rem", fontWeight: "bold", marginBottom: 12, color: "var(--gold)" }}>
          Giocatori che ricevono il tesoro
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {characters.map(char => (
            <label
              key={char.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 10,
                background: selectedChars.includes(char.id) ? "rgba(212,175,55,0.2)" : "rgba(0,0,0,0.4)",
                border: `2px solid ${selectedChars.includes(char.id) ? "var(--gold)" : "rgba(212,175,55,0.2)"}`,
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <input
                type="checkbox"
                checked={selectedChars.includes(char.id)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedChars([...selectedChars, char.id]);
                  } else {
                    setSelectedChars(selectedChars.filter(id => id !== char.id));
                  }
                }}
                style={{ width: 18, height: 18 }}
              />
              <div style={{ fontWeight: "bold" }}>{char.name}</div>
              <div style={{ fontSize: "0.75rem", color: "rgba(212,175,55,0.6)" }}>
                Liv. {char.level} {char.class}
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={() => setSelectedChars(characters.map(c => c.id))}
          className="btn btn-ghost"
          style={{ width: "100%", marginTop: 12, fontSize: "0.8rem" }}
        >
          Seleziona Tutti
        </button>
      </div>

      {/* Bottone Distribuisci */}
      <button
        onClick={distributeRutherLoot}
        disabled={distributing || selectedChars.length === 0}
        className="btn btn-gold"
        style={{
          padding: 16,
          fontSize: "1rem",
          fontWeight: "bold",
          opacity: distributing || selectedChars.length === 0 ? 0.5 : 1,
          cursor: distributing || selectedChars.length === 0 ? "not-allowed" : "pointer",
        }}
      >
        {distributing ? "Distribuzione..." : `🎁 Distribuisci Tesoro (${selectedChars.length} giocatori)`}
      </button>

      {/* Info */}
      {selectedChars.length > 0 && (
        <div style={{
          background: "rgba(212,175,55,0.1)",
          border: "1px solid rgba(212,175,55,0.3)",
          borderRadius: 8,
          padding: 12,
          fontSize: "0.8rem",
          color: "rgba(212,175,55,0.8)",
        }}>
          <div style={{ fontWeight: "bold", marginBottom: 6 }}>Ogni giocatore riceverà:</div>
          <div>• {Math.floor(gold / selectedChars.length)} oro</div>
          <div>• {Math.floor(silver / selectedChars.length)} argento</div>
          <div>• {Math.floor(copper / selectedChars.length)} rame</div>
          <div>• {items.length} oggetti (copia per ognuno)</div>
        </div>
      )}
    </div>
  );
}
