# 🐉 DIGITAL D&D 5e - ROADMAP SVILUPPO

## 📋 STATO PROGETTO

**Versione attuale:** 0.5 (MVP funzionante)
**Ultimo aggiornamento:** 2025-02-20

---

## ✅ COSA FUNZIONA ADESSO

### 🎮 Sistema Base
- [x] Creazione personaggio D&D 5e completa
  - Tutte le razze ufficiali
  - Tutte le classi ufficiali
  - Sistema statistiche 4d6 drop lowest
  - Background e personalità
- [x] Scheda personaggio interattiva (telefono)
  - HP tracking (+/-)
  - Statistiche (FOR, DES, COS, INT, SAG, CAR)
  - CA, Iniziativa, Velocità
  - Tiri salvezza
  - Abilità con competenze
  - Tiri salvezza morte (3 successi/fallimenti)
  - Ispirazione
- [x] Sistema riposi
  - Riposo breve (dadi vita)
  - Riposo lungo (ripristina tutto)

### 🎲 Sistema Dadi
- [x] Dadi completi (d4, d6, d8, d10, d12, d20, d100)
- [x] Animazioni 3D
- [x] Riconoscimento NAT 20 e NAT 1
- [x] Broadcasting dadi alla TV (realtime)
- [x] Modificatori visuali

### ⚔️ Sistema Combattimento
- [x] Iniziativa automatica
- [x] Gestione turni
- [x] Tracking HP mostri
- [x] Lista iniziativa su TV
- [x] Indicatore turno attivo
- [x] Visualizzazione combat state sulla TV

### 🎭 Pannello DM
- [x] Gestione campagne
- [x] Tracking personaggi
- [x] Gestione sessioni
- [x] Aggiunta mostri al combattimento
- [x] Controllo turni
- [x] Narrativa broadcast alla TV
- [x] Upload mappe
- [x] Dadi DM segreti

### 📺 Schermo TV
- [x] Visualizzazione mappa
- [x] Lista personaggi con HP
- [x] Combattimento overlay trasparente
- [x] Ordine iniziativa
- [x] Barre HP mostri
- [x] Dadi in tempo reale
- [x] Narrativa in overlay
- [x] Design ottimizzato per televisore

### 🔄 Tecnologia
- [x] Supabase realtime sync
- [x] Architettura TV + Mobile + DM separata
- [x] Sistema broadcast per eventi
- [x] Upload immagini (ritratti, mappe)
- [x] Autenticazione DM

### 🎨 UI/UX
- [x] Tema medievale fantasy
- [x] Animazioni Framer Motion
- [x] Design responsive
- [x] Token personalizzabili
- [x] Ritratti razza/classe
- [x] Musica d'atmosfera
- [x] Effetti glow dorati

---

## ❌ COSA MANCA (DA IMPLEMENTARE)

### 🎯 PRIORITÀ ALTA (Fondamentali per giocare)

#### 1. Sistema Attacchi Automatizzato
- [ ] Bottone "Attacco" nella scheda giocatore
- [ ] Calcolo automatico: d20 + modificatore FOR/DES + competenza
- [ ] Selezione arma equipaggiata
- [ ] Confronto automatico vs CA bersaglio
- [ ] Tiro danni automatico se colpisce
- [ ] Supporto attacchi multipli (Extra Attack)
- [ ] Distinguere attacco mischia/distanza

#### 2. Sistema Vantaggio/Svantaggio
- [ ] Opzione "Tira con Vantaggio" (2d20, prendi migliore)
- [ ] Opzione "Tira con Svantaggio" (2d20, prendi peggiore)
- [ ] Visualizzazione entrambi i dadi sulla TV
- [ ] Indicatore visivo quale dado conta

#### 3. Equipaggiamento e Armi
- [ ] Database armi D&D 5e
  - Nome, dadi danno, tipo danno, proprietà
  - Mischia/Distanza
  - Range
- [ ] Inventario armi equipaggiate
- [ ] Selezione arma attiva per attacco
- [ ] Armature che influenzano CA
- [ ] Scudi (+2 CA)

---

### 🎯 PRIORITÀ MEDIA (Importanti)

#### 4. Incantesimi Completi
- [ ] Database incantesimi D&D 5e
  - Nome, livello, scuola
  - Descrizione completa
  - Dadi danno, tipo danno
  - Range, area effetto
  - Durata, concentrazione
  - CD tiro salvezza
- [ ] Bottone "Lancia [incantesimo]"
- [ ] Calcolo CD automatico (8 + Prof + modificatore)
- [ ] Tiro danni automatico
- [ ] Tracking concentrazione
- [ ] Lista incantesimi preparabili per classe

#### 5. Gestione Azioni Combattimento
- [ ] Lista azioni disponibili
  - Attacco
  - Schivare (+AC fino a prossimo turno)
  - Scattare (doppio movimento)
  - Disimpegnarsi (no attacchi opportunità)
  - Aiutare (vantaggio a alleato)
  - Nascondersi (tiro Furtività)
  - Prepararsi (azione + trigger)
  - Cercare (Percezione/Indagare)
- [ ] Tracking: Azione usata, Azione Bonus usata, Reazione usata
- [ ] Reset a inizio turno
- [ ] Movimento tracciato (30ft standard)

#### 6. Condizioni di Stato
- [ ] Lista condizioni D&D 5e
  - Accecato, Affascinato, Assordato
  - Avvelenato, Intralciato, Invisible
  - Paralizzato, Pietrificato, Prono
  - Spaventato, Stordito, Incosciente
- [ ] Applicazione condizione a PG/mostri
- [ ] Effetti automatici (vantaggio/svantaggio)
- [ ] Visualizzazione su TV
- [ ] Durata condizione (round)

#### 7. Mostri Stat Block Completi
- [ ] Database mostri D&D 5e
- [ ] Stat block completo
  - CA, HP, Velocità
  - Statistiche
  - Tiri salvezza
  - Immunità, resistenze, vulnerabilità
  - Sensi, lingue
  - CR
- [ ] Azioni mostro
  - Multiattacco
  - Attacchi speciali
  - Abilità leggendarie
- [ ] Bottone "Attacco mostro" con calcolo automatico

---

### 🎯 PRIORITÀ BASSA (Nice to have)

#### 8. Battle Grid e Movimento Tattico
- [ ] Griglia esagonale/quadrata sulla mappa
- [ ] Dimensione token (Small, Medium, Large, Huge, Gargantuan)
- [ ] Movimento drag & drop token
- [ ] Range visualizzato (cerchi)
- [ ] Area effetto incantesimi (coni, sfere, cubi)
- [ ] Ostacoli e coperture
- [ ] Fog of War

#### 9. Sistema Progressione
- [ ] XP tracking
- [ ] Calcolo XP automatico per CR mostri
- [ ] Distribuzione XP al party
- [ ] Level-up automatico
- [ ] Scelta talenti (Feats)
- [ ] ASI (Ability Score Improvement)
- [ ] Unlock abilità di classe
- [ ] Nuovi spell slots
- [ ] Apprendimento nuovi incantesimi

#### 10. Risorse di Classe
- [ ] Ki points (Monaco)
- [ ] Rage uses (Barbaro)
- [ ] Bardic Inspiration
- [ ] Sorcery Points
- [ ] Action Surge (Guerriero)
- [ ] Wild Shape (Druido)
- [ ] Lay on Hands (Paladino)
- [ ] Channel Divinity (Chierico/Paladino)
- [ ] Reset per riposo breve/lungo

#### 11. Inventario Completo
- [ ] Oggetti generici
- [ ] Peso trasportato
- [ ] Capacità di carico (FOR × 15)
- [ ] Oro e monete
- [ ] Pozioni ed elisir
- [ ] Oggetti magici
- [ ] Consumabili

#### 12. Utilità DM Avanzate
- [ ] Generatore incontri (calcolo CR)
- [ ] Tabelle random
  - Loot
  - NPC
  - Nomi
  - Eventi casuali
- [ ] Note sessione condivise
- [ ] Libreria mappe
- [ ] Gestione NPC ricorrenti
- [ ] Quest log
- [ ] Timeline eventi campagna

#### 13. Reazioni
- [ ] Sistema trigger reazioni
- [ ] Attacco di opportunità
- [ ] Incantesimi reazione (Shield, Counterspell)
- [ ] Pause combattimento per reazione
- [ ] Scelta se usare reazione

#### 14. Social e Multiplayer
- [ ] Campagne multiple
- [ ] Inviti giocatori via link
- [ ] Chat testuale in-game
- [ ] Voice chat integrato
- [ ] Condivisione personaggi tra campagne

---

## 🚀 PROSSIMI STEP (DA FARE SUBITO)

### Sprint 1: Sistema Attacchi (Settimana 1)
1. [ ] Creare database armi in `constants/weapons.js`
2. [ ] Aggiungere campo `equipped_weapon` al personaggio
3. [ ] UI selezione arma in scheda giocatore
4. [ ] Bottone "⚔️ Attacco" nella scheda
5. [ ] Calcolo: d20 + (FOR o DES) + Prof (se competente)
6. [ ] Mostrare risultato su TV
7. [ ] Se colpisce → tiro danni automatico
8. [ ] Testare con vari livelli e armi

### Sprint 2: Vantaggio/Svantaggio (Settimana 2)
1. [ ] Toggle "Vantaggio/Normale/Svantaggio" nel pannello dadi
2. [ ] Tiro 2d20 quando attivo
3. [ ] Evidenziare quale dado conta
4. [ ] Animazione speciale sulla TV
5. [ ] Applicare a tutti i tipi di tiro

### Sprint 3: Equipaggiamento Base (Settimana 3)
1. [ ] UI inventario nella scheda giocatore
2. [ ] Aggiungere/rimuovere armi
3. [ ] Equipaggiare/disequipaggiare
4. [ ] Armature che modificano CA
5. [ ] Scudo (+2 CA)

---

## 🐛 BUG CONOSCIUTI

- [ ] Nessun bug critico al momento

---

## 💡 IDEE FUTURE (Brainstorming)

- Integrazione AI per generazione NPC/descrizioni
- Dadi 3D con Three.js per realismo estremo
- Effetti sonori per attacchi/incantesimi
- Modalità "Dungeon Crawl" passo-passo
- Marketplace oggetti magici
- Sistema crafting
- Mappe procedurali
- Campagne pre-costruite
- Moduli avventure ufficiali
- Export/Import personaggi D&D Beyond
- API pubblica per integrazioni
- App mobile nativa
- VR support

---

## 📊 METRICHE SUCCESSO

### Obiettivi MVP (Minimum Viable Product)
- [x] Giocatore può creare personaggio completo
- [x] Giocatore può tirare dadi
- [x] DM può gestire combattimento
- [x] TV mostra tutto in tempo reale
- [ ] Giocatore può attaccare con calcoli automatici
- [ ] Sistema funziona per sessione completa 4 ore

### Obiettivi v1.0 (Prodotto Completo)
- [ ] Tutte le meccaniche core D&D 5e implementate
- [ ] Database completo incantesimi
- [ ] Database completo mostri
- [ ] Battle grid funzionante
- [ ] Sistema progressione 1-20
- [ ] Stabile per 10+ giocatori simultanei

### Obiettivi v2.0 (Espansione)
- [ ] Contenuti homebrew
- [ ] Editor campagne
- [ ] Community features
- [ ] 1000+ utenti attivi

---

## 🔧 STACK TECNICO

**Frontend:**
- React + Vite
- Framer Motion (animazioni)
- CSS custom (tema fantasy)

**Backend:**
- Supabase (database PostgreSQL)
- Supabase Realtime (sync)
- Supabase Storage (immagini)
- Supabase Auth (autenticazione DM)

**Hosting:**
- Vercel (deploy automatico)

**Assets:**
- Ritratti custom per ogni combinazione razza/classe
- Icone classi
- Musica royalty-free (soundimage.org)

---

## 📝 NOTE SVILUPPO

### Convenzioni Codice
- File components: PascalCase (es: `CharacterSheet.jsx`)
- File utils: camelCase (es: `diceRoller.js`)
- Constants: UPPER_SNAKE_CASE
- Stile: CSS custom con variabili --gold, --parchment, ecc.

### Struttura Progetto
```
src/
├── dm/              # Pannello DM
├── player/          # App giocatore
├── tv/              # Schermo TV
├── shared/          # Componenti condivisi
│   ├── components/  # UI components
│   └── constants/   # Dati statici (classi, razze, ecc.)
└── lib/             # Supabase client
```

### Database Schema
- `campaigns` - Campagne
- `sessions` - Sessioni di gioco
- `characters` - Personaggi giocatori
- `portraits` - Ritratti custom

---

## 🎯 FOCUS CORRENTE

**ADESSO STIAMO LAVORANDO SU:**
- ✅ Sistema combattimento TV (COMPLETATO)
- ✅ Overlay trasparente con mappa sotto (COMPLETATO)
- ✅ Testi ingranditi per TV (COMPLETATO)
- 🔄 Sistema attacchi automatizzati (PROSSIMO)

**ULTIMA MODIFICA:** 2025-02-20 - Completato sistema TV con overlay combattimento

---

## 📞 CONTATTI & TEAM

**Sviluppatori:**
- Lino (Owner & Lead Developer)
- Claude (AI Assistant)

**Repository:** (da aggiungere)
**Demo Live:** https://digital-dnd.vercel.app

---

**🐉 Stiamo costruendo il miglior Virtual Tabletop per D&D 5e in italiano! 🔥**
