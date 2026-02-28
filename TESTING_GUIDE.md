# 🧪 GUIDA AL TESTING - Campaign Guide

**Come testare la Campaign Guide Lost Mine of Phandelver**

---

## 🚀 Quick Start

1. **Server già avviato**: http://localhost:5173
2. **JSON validato**: ✅ 199 KB, 3373 righe, formato valido
3. **5 sessioni caricate**: Pronte per il test

---

## 📋 TEST CHECKLIST

### ✅ Test Automatici (COMPLETATI)

- [x] JSON syntax validation
- [x] File size check (199 KB - OK)
- [x] Session count (5 sessions - OK)
- [x] Locations count (29 locations - OK)
- [x] Read-aloud text presence
- [x] NPC dialogues
- [x] Boss fight stats
- [x] Decision trees
- [x] Dev server running

### 🔍 Test Manuali (DA FARE)

#### Test 1: Caricamento Campagna
1. Apri http://localhost:5173
2. Clicca "Crea Nuova Campagna"
3. Inserisci nome: "Test Lost Mine"
4. Clicca "Crea Campagna"
5. **Verifica**: Vedi la schermata di successo con join code

#### Test 2: StarterSetLoader
1. Nel DM Panel, cerca il pulsante "Load Starter Set" o simile
2. Clicca per caricare
3. **Verifica**:
   - Vedi messaggio "Caricamento 29 location..."
   - Vedi "✅ 29 location caricate"
   - Vedi "✅ ~100+ POI caricati"
4. **Durata**: Dovrebbe completare in <10 secondi

#### Test 3: Location Visibility
1. Nel DM Panel, vai alla sezione "Locations"
2. **Verifica**:
   - Vedi lista di 29 locations
   - Nomi sono corretti (es: "Imboscata dei Goblin", "Phandalin", "Thundertree")
   - Puoi selezionare una location

#### Test 4: POI Details
1. Seleziona location "Imboscata dei Goblin"
2. **Verifica**:
   - Vedi POIs: "Cavalli Morti", "Cespugli a Sinistra", "Cespugli a Destra"
   - Ogni POI ha descrizione
   - Alcuni POI hanno "requires_check: perception"

#### Test 5: TV Screen
1. Seleziona una location (es: Phandalin)
2. Clicca "Set as Current" o "Display on TV"
3. Apri TV screen (se disponibile)
4. **Verifica**:
   - Mappa è visibile (se presente)
   - POI markers appaiono sulla mappa

#### Test 6: Campaign Guide Access
**IMPORTANTE**: Questo test verifica se la campaign_guide è accessibile

1. Apri Developer Console (F12)
2. Nella console, scrivi:
```javascript
fetch('/src/data/starter_set_seed.json')
  .then(r => r.json())
  .then(data => {
    console.log('Sessions:', data.campaign_guide.session_guides.length);
    console.log('Session 1:', data.campaign_guide.session_guides[0].title);
    console.log('Session 5 Dragon:', data.campaign_guide.session_guides[4].location_4_dragon_tower.venomfang_young_green_dragon.description);
  })
```
3. **Verifica**:
   - Vedi "Sessions: 5"
   - Vedi titoli delle sessioni
   - Vedi descrizione di Venomfang

---

## 🎯 Test Scenari Specifici

### Scenario A: DM prepara Session 1
**Obiettivo**: Verificare che un DM possa leggere e capire come masterare Session 1

1. Apri `/src/data/starter_set_seed.json` in editor
2. Cerca `"session_number": 1`
3. Leggi:
   - `opening.read_aloud`
   - `scene_1_investigation`
   - `scene_2_ambush.read_aloud`
   - `scene_2_ambush.combat.tactics`
4. **Verifica**:
   - Testo è chiaro e immersivo
   - Tattiche nemici sono dettagliate
   - Decision trees sono presenti

### Scenario B: DM gestisce Nothic encounter
**Obiettivo**: Verificare che i unique encounters siano completi

1. Vai a Session 4 → `stanza_3_nothic_lair`
2. Leggi:
   - `read_aloud`
   - `interaction_options.option_2_negotiate`
   - `what_nothic_wants`
   - `what_nothic_knows`
3. **Verifica**:
   - Hai 3 opzioni (attack/negotiate/sneak)
   - Negotiation ha dialogue completo
   - Nothic può diventare alleato

### Scenario C: DM affronta il Drago
**Obiettivo**: Verificare che il boss CR 8 sia gestibile

1. Vai a Session 5 → `location_4_dragon_tower`
2. Leggi:
   - `dm_warning` (dovrebbe avvisare del pericolo!)
   - `encounter_options` (dovrebbe avere 4 opzioni)
   - `option_2_negotiation.what_venomfang_wants`
3. **Verifica**:
   - Warning è chiaro (CR 8 pericoloso!)
   - Negotiation è possibile (tributo, servizio, etc)
   - Combat ha escape route (dragon fugge se low HP)

---

## 🐛 Bug da Cercare

### Possibili Problemi

1. **JSON troppo grande**
   - Sintomo: Caricamento lento (>5 secondi)
   - Soluzione: Considerare split in multiple files

2. **Missing fields**
   - Sintomo: Errori in console tipo "Cannot read property 'X' of undefined"
   - Soluzione: Aggiungere field mancante al JSON

3. **Formatting issues**
   - Sintomo: Read-aloud text appare male formattato
   - Soluzione: Controllare newlines e caratteri speciali

4. **HMR non funziona**
   - Sintomo: Modifiche al JSON non si riflettono in app
   - Soluzione: Hard refresh (Cmd+Shift+R)

---

## 📊 Metriche di Successo

### ✅ Test PASSA se:

- [ ] JSON si carica senza errori
- [ ] Tutte le 29 locations sono visibili
- [ ] POI appaiono correttamente
- [ ] Read-aloud texts sono leggibili
- [ ] NPCs hanno dialoghi completi
- [ ] Boss fights hanno stats e tattiche
- [ ] Decision trees coprono multiple opzioni
- [ ] No errori in console
- [ ] Performance è buona (<2s caricamento)

### ⚠️ Test FALLISCE se:

- [ ] JSON ha errori di syntax
- [ ] Locations non caricano
- [ ] POI mancano o sono vuoti
- [ ] Read-aloud texts sono incompleti
- [ ] Errori in console
- [ ] Crash dell'app
- [ ] Performance scadente (>5s caricamento)

---

## 🎮 Test Gameplay Flow

### Flusso Completo Session 1-5

1. **Session 1**: Imboscata Goblin
   - [ ] Opening è chiaro
   - [ ] Combat è gestibile
   - [ ] Cragmaw Hideout entrance è descritta

2. **Session 2**: Salvare Sildar
   - [ ] Wolf den flood mechanics sono spiegate
   - [ ] Sildar dialogue è completo
   - [ ] Klarg boss è sfidante ma giusto

3. **Session 3**: Phandalin Sandbox
   - [ ] 8 NPCs sono tutti presenti
   - [ ] Random encounters funzionano
   - [ ] Redbrand confrontation è epico

4. **Session 4**: Redbrand Hideout
   - [ ] 8 stanze sono dettagliate
   - [ ] Nothic è memorabile
   - [ ] Glasstaff capture/kill choice è chiara

5. **Session 5**: Thundertree + Dragon
   - [ ] Reidoth dà mappa Cragmaw (CRITICAL!)
   - [ ] Venomfang è SCARY ma non insta-kill
   - [ ] Negotiation è un'opzione valida

---

## 🔍 Advanced Tests (Opzionali)

### Test Performance

```bash
# Test JSON parse speed
node -e "
const start = Date.now();
const data = JSON.parse(require('fs').readFileSync('src/data/starter_set_seed.json', 'utf8'));
const end = Date.now();
console.log('Parse time:', (end - start), 'ms');
console.log('Sessions:', data.campaign_guide.session_guides.length);
"
```

**Expected**: <50ms

### Test Memory Usage

```bash
# Test file size impact
ls -lh src/data/starter_set_seed.json
```

**Expected**: <500 KB (attualmente 199 KB - ottimo!)

### Test Supabase Insert

```javascript
// In app, dopo StarterSetLoader
supabase
  .from('locations')
  .select('count')
  .then(res => console.log('Locations in DB:', res.count))
```

**Expected**: 29 locations

---

## 📝 Report Template

Dopo i test, compila questo report:

```
# Test Report - Campaign Guide

**Data**: YYYY-MM-DD
**Tester**: [Nome]
**Branch**: main

## Results

- [ ] JSON caricato: ✅/❌
- [ ] Locations visibili: ✅/❌
- [ ] POI completi: ✅/❌
- [ ] Read-aloud quality: ✅/❌
- [ ] Boss fights: ✅/❌
- [ ] Decision trees: ✅/❌
- [ ] Performance: ✅/❌

## Issues Found

1. [Descrivi problema]
2. [Descrivi problema]

## Notes

[Note addizionali]

## Verdict

✅ READY FOR PRODUCTION / ❌ NEEDS FIXES
```

---

## 🎉 Quando il Test è Completo

Se tutti i test passano:

1. ✅ Marca il milestone "5 Sessions Complete"
2. 🎯 Decidi: Continuare con Session 6-12 o fare pausa
3. 📢 Considera fare commit con messaggio:
   ```
   feat: Complete first 5 sessions of Lost Mine campaign guide

   - Added 24,000+ words of narrative
   - 45+ read-aloud blocks
   - 17+ combat encounters
   - 12+ NPCs with full dialogues
   - 4 boss fights including Venomfang dragon
   - Complete decision trees for player choices
   - Main quest progression through Thundertree
   ```

---

**Happy Testing!** 🧪✨🐉
