// ═══════════════════════════════════════════════
//  diceBox.js — Inizializzazione globale del tracciatore e lanciatore dadi 3D
//  Usa @3d-dice/dice-box per una fisica e grafica di alto livello
// ═══════════════════════════════════════════════

import DiceBox from "@3d-dice/dice-box";

let diceBoxInstance = null;
let initPromise = null;

export const initDiceBox = async () => {
    if (diceBoxInstance) return diceBoxInstance;

    // Evita inizializzazioni multiple contemporanee
    if (initPromise) return initPromise;

    initPromise = (async () => {
        // Creiamo il container globale se non esiste
        let container = document.getElementById("global-dice-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "global-dice-container";
            Object.assign(container.style, {
                position: "fixed",
                top: "0",
                left: "0",
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex: "9999",
            });
            document.body.appendChild(container);
        }

        const box = new DiceBox("#global-dice-container", {
            assetPath: "/assets/dice-box/", // Carica localmente
            theme: "default",
            themeColor: "#d4af37",
            scale: 6,
            spinForce: 6,
            throwForce: 6,
            gravity: 2,
            mass: 1,
            friction: 0.8,
            restitution: 0.3,
            linearDamping: 0.4,
            angularDamping: 0.4,
            settleTimeout: 5000,
            offscreen: true,
            delay: 10,
            enableShadows: true,
        });

        await box.init();
        diceBoxInstance = box;
        return box;
    })();

    return initPromise;
};

export const getDiceBox = () => {
    if (!diceBoxInstance) {
        console.warn("DiceBox non è ancora stato inizializzato!");
    }
    return diceBoxInstance;
};
