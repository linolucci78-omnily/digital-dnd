# 🗺️ DIGITAL D&D - ROADMAP V2 (EXPLORATION-FOCUSED)

**Data:** 2025-02-23
**Versione:** 0.5 → 1.0
**Focus:** Da "Simulatore Combattimento" a "Esperienza D&D Completa"

---

## 🎯 PROBLEMA IDENTIFICATO

La versione 0.5 è troppo focalizzata sul combattimento:
- ❌ Giocatori fermi in attesa del prossimo combattimento
- ❌ Nessuna esplorazione del mondo
- ❌ Nessuna interazione con oggetti/NPC
- ❌ Nessun senso di scoperta
- ❌ Mappa statica senza interattività
- ❌ Rischio: "diventa noioso dopo 30 minuti"

## ✅ NUOVA VISIONE

**D&D è:**
- 🗺️ 40% Esplorazione & Discovery
- 🎭 30% Roleplay & Interazioni
- ⚔️ 20% Combattimento Tattico
- 🎲 10% Gestione Personaggio

Il sistema deve supportare **TUTTO**, non solo combattimento!

---

## 🚀 SPRINT PRIORITARI (Nuovo Ordine)

### **SPRINT 1: Sistema Scene & Locations** ⭐⭐⭐
**Perché:** Fondamento dell'esplorazione - il mondo deve esistere!

**Database:**
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  name TEXT NOT NULL,
  description TEXT,
  map_url TEXT,
  music_track TEXT DEFAULT 'exploration',
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE points_of_interest (
  id UUID PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  name TEXT NOT NULL,
  type TEXT, -- 'door', 'chest', 'npc', 'trap', 'secret', 'lore'
  description TEXT,
  x FLOAT, -- posizione % sulla mappa
  y FLOAT,
  discovered BOOLEAN DEFAULT false,
  requires_check TEXT, -- 'perception', 'investigation', null
  check_dc INT,
  loot JSONB, -- array di item_id
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Features da implementare:**
1. ✅ Pannello DM: CRUD locations
2. ✅ Pannello DM: Aggiungi POI sulla mappa (click & drag)
3. ✅ Pannello DM: Bottone "Cambia Scena" → broadcast
4. ✅ TV: Mostra location corrente con fade transition
5. ✅ TV: Mostra POI scoperti (non scoperti = invisibili o "?")
6. ✅ Mobile: Tab "🗺️ Esplora" con lista POI visibili
7. ✅ Mobile: Bottoni azione: "Cerco", "Interagisco"

**Esperienza target:**
```
DM: [Crea location "Taverna del Drago Rosso"]
DM: [Aggiungi POI: "Barista" (NPC), "Porta Segreta" (hidden, DC 15)]
DM: [Click "Cambia Scena"]
TV: [Fade → mappa taverna appare]
Player: [Tab Esplora → "Cerco"] → tiro Percezione
TV: "🎲 Gandalf Percezione: 18!"
DM: [Rivela "Porta Segreta"]
TV: [Icona porta appare sulla mappa]
```

**Tempo stimato:** 3-4 giorni

---

### **SPRINT 2: Sistema Inventario & Oggetti** ⭐⭐⭐
**Perché:** Trovare oggetti = reward immersivo!

**Database:**
```sql
CREATE TABLE items (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT, -- 'weapon', 'armor', 'potion', 'key', 'treasure', 'quest_item'
  description TEXT,
  weight FLOAT DEFAULT 0,
  value INT DEFAULT 0, -- in monete d'oro
  properties JSONB, -- danni arma, bonus CA, effetto pozione, etc
  icon_url TEXT,
  rarity TEXT DEFAULT 'common' -- common, uncommon, rare, legendary
);

CREATE TABLE character_inventory (
  id UUID PRIMARY KEY,
  character_id UUID REFERENCES characters(id),
  item_id UUID REFERENCES items(id),
  quantity INT DEFAULT 1,
  equipped BOOLEAN DEFAULT false
);
```

**Features:**
1. ✅ Database 50+ oggetti base (armi PHB, armature, pozioni)
2. ✅ Mobile: Tab "🎒 Inventario" con lista oggetti
3. ✅ Mobile: Equipaggia arma → aggiorna CA/danni
4. ✅ Mobile: Usa pozione → heal HP, broadcast TV
5. ✅ Mobile: Tracking oro
6. ✅ DM: Assegna item a personaggio
7. ✅ POI type="chest": quando aperto → drop loot
8. ✅ TV: Animazione "✨ Hai trovato X!"

**Esperienza target:**
```
Player: [Click scrigno sulla mappa]
TV: "✨ Gandalf ha trovato: Spada Lunga +1, Pozione Cura, 50 GO"
Player: [Inventario → Equipaggia Spada Lunga +1]
[CA e danni attacco si aggiornano automaticamente]
Player: [Usa Pozione Cura]
TV: "💚 Gandalf beve Pozione di Cura: +2d4+2 HP!"
```

**Tempo stimato:** 3-4 giorni

---

### **SPRINT 3: Sistema NPC & Dialoghi** ⭐⭐
**Perché:** Il mondo ha bisogno di abitanti!

**Database:**
```sql
CREATE TABLE npcs (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  name TEXT NOT NULL,
  race TEXT,
  class TEXT,
  description TEXT,
  portrait_url TEXT,
  faction TEXT,
  attitude TEXT DEFAULT 'neutral', -- friendly, neutral, hostile
  location_id UUID REFERENCES locations(id),
  dialogues JSONB, -- array di { text, trigger, response_options }
  shop_items JSONB, -- array di item_id se è mercante
  quest_giver JSONB -- { quest_id, status }
);

CREATE TABLE quests (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  title TEXT NOT NULL,
  description TEXT,
  objectives JSONB, -- array di { text, completed }
  reward_xp INT,
  reward_gold INT,
  reward_items JSONB,
  status TEXT DEFAULT 'available' -- available, active, completed, failed
);
```

**Features:**
1. ✅ DM: CRUD NPCs con ritratto
2. ✅ DM: Aggiungi NPC a location come POI
3. ✅ DM: Bottone "Fai parlare NPC" → broadcast dialogo TV
4. ✅ TV: Overlay dialogo con ritratto NPC + fumetto
5. ✅ Mobile: Lista quest attive
6. ✅ Mobile: Click NPC → mostra opzioni (Parla, Compra, Attacca)
7. ✅ Sistema shop (se NPC è mercante)

**Esperienza target:**
```
Player: [Click NPC "Mercante Elfo"]
TV: [Ritratto elfo appare + fumetto]
DM: "Benvenuto, viaggiatore! Vendo armi e armature."
Player: [Scelta: Parla / Compra / Esci]
Player: [Compra → lista oggetti con prezzi]
Player: [Acquista Arco Lungo - 50 GO]
[Inventario aggiornato, oro -50]
```

**Tempo stimato:** 4-5 giorni

---

### **SPRINT 4: Sistema Skill Checks & Azioni** ⭐⭐
**Perché:** Le abilità devono servire fuori dal combattimento!

**Features:**
1. ✅ Mobile Tab Esplora: Bottoni azione rapida
   - "🔍 Cerco" → Percezione
   - "🔓 Scassino" → Destrezza Mano + CD
   - "💪 Forzo" → Atletica vs CD
   - "💬 Convinco" → Persuasione
   - "🎭 Inganno" → Inganno
2. ✅ DM: Imposta CD per azioni
3. ✅ TV: Mostra risultato check con successo/fallimento
4. ✅ Sistema conseguenze:
   - Successo → reveal POI, ottieni info, passa ostacolo
   - Fallimento → danno (trappola), allarme, blocco
5. ✅ Tracking tentative (es: "3 tentativi per scassinare")

**Esperienza target:**
```
Player: [Davanti a porta chiusa]
Player: [Click "🔓 Scassino"]
TV: "🎲 Gandalf Destrezza Mano: 12 vs CD 15"
TV: "❌ FALLITO - La serratura resiste!"
Player: [Riprova]
TV: "🎲 Gandalf: 19 vs CD 15"
TV: "✅ SUCCESSO - La porta si apre!"
[Nuova location rivelata]
```

**Tempo stimato:** 2-3 giorni

---

### **SPRINT 5: Combattimento Automatizzato** ⭐
*(Ora è solo una parte, non tutto il gioco!)*

**Features:**
1. ✅ Sistema attacchi automatici (d20 + mod + prof vs CA)
2. ✅ Tiro danni automatico se colpisce
3. ✅ Vantaggio/Svantaggio (2d20)
4. ✅ Attacchi con arma equipaggiata
5. ✅ Critico (NAT 20 = 2x dadi danno)

**Tempo stimato:** 2-3 giorni

---

### **SPRINT 6: Sistema Progressione** ⭐
**Features:**
1. ✅ XP tracking
2. ✅ Level up
3. ✅ Nuove abilità di classe
4. ✅ ASI (Ability Score Improvement)

**Tempo stimato:** 3-4 giorni

---

## 📊 TIMELINE PROPOSTA

| Sprint | Durata | Totale |
|--------|--------|--------|
| Sprint 1 - Locations | 3-4 giorni | Giorno 4 |
| Sprint 2 - Inventario | 3-4 giorni | Giorno 8 |
| Sprint 3 - NPC | 4-5 giorni | Giorno 13 |
| Sprint 4 - Skill Checks | 2-3 giorni | Giorno 16 |
| Sprint 5 - Combattimento | 2-3 giorni | Giorno 19 |
| **PRIMA SESSIONE TEST** | - | **Giorno 20** |

**Target:** Sistema giocabile completo in **3 settimane**!

---

## 🎮 ESEMPIO SESSIONE COMPLETA (Dopo Sprint 1-4)

```
[Sessione inizia - Tutti a casa di Lino con TV]

DM: [Pannello DM → "Cambia Scena: Villaggio di Phandalin"]
TV: [Fade → mappa villaggio appare, musica medievale]
TV: "📜 Siete arrivati al villaggio di Phandalin al tramonto."

Player 1: [Mobile → Tab Esplora → "Cerco"]
TV: "🎲 Elandor tira Percezione: 15"
DM: "Vedi una taverna, un fabbro e la casa del sindaco."
[POI appaiono sulla mappa TV]

Player 2: [Click POI "Taverna"]
TV: [Zoom sulla taverna]
Player 2: [Entra]
DM: [Cambia scena → "Interno Taverna"]
TV: [Nuova mappa: interno taverna con NPC]

Player 2: [Click NPC "Barista"]
TV: [Ritratto barista nano]
DM: "Benvenuto! Una birra costa 5 monete."
Player 2: [Compra birra → -5 GO]
Player 2: "Hai sentito nulla di strano?"
DM: [Tiro Persuasione]
TV: "🎲 Thom Persuasione: 18!"
DM: "Il nano si avvicina... 'Goblin nel bosco a est. Pericolosi.'"
[Quest "Goblin nel Bosco" appare nel quest log]

Player 1: [Click POI "Fabbro"]
TV: [Cambio scena → Fucina]
NPC Fabbro: "Vendo armi!"
Player 1: [Shop → Acquista Spada Corta +1 per 100 GO]
Player 1: [Inventario → Equipaggia]
[Danno attacco aggiornato]

DM: "Ok, andate nel bosco?"
Players: "Sì!"
DM: [Cambia scena → "Sentiero nel Bosco"]
TV: [Mappa foresta con POI nascosti]

Player 3: [Cerco trappole]
TV: "🎲 Gandalf Percezione: NAT 1!"
TV: "❌ Cadi in una fossa! -1d6 danni!"
[HP -4]

Player 1: "Aiuto Gandalf!"
[Tiro Atletica → successo]
TV: "✅ Elandor tira fuori Gandalf!"

DM: "3 goblin saltano fuori!"
[Sistema combattimento attiva]
TV: [Overlay combattimento + iniziativa]
[Turni combattimento...]
Players: [Attaccano con armi equipaggiate, danni automatici]
TV: "⚔️ Elandor colpisce con Spada Corta +1: 8 danni!"
[Goblin muore]

[Fine combattimento]
Player 2: [Click corpo goblin]
TV: "✨ Hai trovato: 15 GO, Chiave Arrugginita"
[Quest aggiornata: "Chiave misteriosa trovata"]

✅ 1 ora di gioco
✅ Esplorazione (villaggio, taverna, bosco)
✅ Roleplay (barista, fabbro, rumors)
✅ Skill checks (Percezione, Persuasione, Atletica)
✅ Shopping (birra, spada)
✅ Trappole (fossa)
✅ Combattimento (goblin)
✅ Loot (chiave quest)
```

**Questo è D&D vero!** 🎉

---

## 🔥 DIFFERENZA CHIAVE

| Roadmap Vecchio | Roadmap Nuovo |
|-----------------|---------------|
| Sprint 1: Attacchi | Sprint 1: Locations & Esplorazione |
| Sprint 2: Vantaggio/Svantaggio | Sprint 2: Inventario & Oggetti |
| Sprint 3: Equipaggiamento | Sprint 3: NPC & Dialoghi |
| **Focus: Meccaniche combattimento** | **Focus: Mondo vivo & interattivo** |
| Rischio: diventa noioso | Obiettivo: sempre qualcosa da fare |

---

## ✅ METRICHE SUCCESSO

**Dopo Sprint 1-4, il gioco deve:**
- [ ] Permettere 1 ora di sessione senza combattimento
- [ ] I giocatori possono esplorare 3+ locations
- [ ] I giocatori possono interagire con 5+ NPC
- [ ] I giocatori possono trovare e usare 10+ oggetti
- [ ] I giocatori possono completare 2+ quest
- [ ] **Nessuno si annoia!**

---

## 🎯 PROSSIMO STEP

**OGGI:** Implementare Sprint 1 - Sistema Locations
1. Creare tabelle Supabase
2. Pannello DM gestione scene
3. TV visualizzazione POI
4. Mobile tab Esplora

**GO! 🚀**
