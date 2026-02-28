# 🗺️ Guida Completa: Mappe per Lost Mine of Phandelver

Questa guida ti aiuta a trovare e scaricare le mappe per la tua avventura digitale D&D.

---

## 📁 STRUTTURA DIRECTORY

Le mappe devono essere salvate in:
```
/public/maps/          <- Mappe delle location
/public/tokens/        <- Token dei mostri (icone piccole)
/public/npcs/          <- Avatar degli NPC
```

✅ Le directory sono già state create automaticamente!

---

## 🎨 OPZIONE 1: Mappe Ufficiali D&D (CONSIGLIATO)

### Dove Trovarle:

**A) Se hai il manuale fisico/PDF:**
- Il libro "Lost Mine of Phandelver" include tutte le mappe
- Scannerizza o fai screenshot delle mappe
- Salva come JPG nella cartella `/public/maps/`

**B) D&D Beyond (se hai acquistato l'avventura):**
- Vai su https://www.dndbeyond.com/sources/lmop
- Scarica le mappe dalle pagine dell'avventura
- Le mappe sono in alta qualità

**C) Roll20 (se hai account):**
- Cerca "Lost Mine of Phandelver" nei marketplace assets
- Alcune mappe sono disponibili gratuitamente

---

## 🆓 OPZIONE 2: Mappe Gratuite dalla Community

### Siti Raccomandati:

#### 1. **Reddit r/battlemaps**
Link: https://www.reddit.com/r/battlemaps/

Cerca:
- "Lost Mine of Phandelver"
- "Cragmaw Hideout"
- "Redbrand Hideout"
- "Wave Echo Cave"
- "Phandalin"

**Molti utenti hanno ricreato TUTTE le mappe dell'avventura gratuitamente!**

#### 2. **Mike Schley Maps** (Artista Ufficiale D&D)
Link: https://mikeschley.com/
- L'artista che ha creato le mappe originali
- Vende versioni ad alta risoluzione (~$2 ciascuna)
- Qualità professionale

#### 3. **2-Minute Tabletop**
Link: https://2minutetabletop.com/
- Mappe artistiche gratuite e a pagamento
- Cerca "cave", "hideout", "tavern", "ruins"

#### 4. **Dungeon Scrawl** (Crea le Tue)
Link: https://dungeonscrawl.com/
- Tool gratuito online
- Ricrea le mappe seguendo il manuale
- Esporta come PNG/JPG

#### 5. **Forgotten Adventures**
Link: https://www.forgotten-adventures.net/
- Asset pack gratuiti
- Include mappe per Lost Mine

---

## 📋 LISTA MAPPE NECESSARIE

### Parte 1 - Goblin Arrows
```
goblin_ambush.jpg           <- Strada nella foresta
cragmaw_hideout_entrance.jpg <- Entrata caverna
cragmaw_room1.jpg           <- Tana dei Goblin
cragmaw_room2.jpg           <- Trappola dei Lupi
cragmaw_room3.jpg           <- Rifugio
cragmaw_room4.jpg           <- Baratro con ponte
cragmaw_room5.jpg           <- Deposito
cragmaw_room6.jpg           <- Prigione di Sildar
cragmaw_room7.jpg           <- Tana di Klarg (boss)
```

### Parte 2 - Phandalin
```
phandalin_overview.jpg      <- Panoramica villaggio
stonehill_inn.jpg           <- Locanda (hub sociale)
barthen_shop.jpg            <- Negozio generale
lionshield.jpg              <- Trading post
townmaster_hall.jpg         <- Municipio
shrine_luck.jpg             <- Tempio di Tymora
sleeping_giant.jpg          <- Taverna dei Redbrands
tresendar_ruins.jpg         <- Rovine del maniero
```

### Parte 3 - Redbrand Hideout & Side Quests
```
redbrand_area1.jpg          <- Cantina
redbrand_crypt.jpg          <- Cripta con scheletri
redbrand_cells.jpg          <- Prigioni
nothic_lair.jpg             <- Tana del Nothic
glassstaff_room.jpg         <- Studio di Iarno (boss)
old_owl_well.jpg            <- Rovine con necromante
wyvern_tor.jpg              <- Accampamento orchi
agatha_lair.jpg             <- Capanna del banshee
thundertree.jpg             <- Villaggio abbandonato + drago
```

### Parte 4 - Finale
```
cragmaw_castle.jpg          <- Castello dei goblinoid
wave_echo_entrance.jpg      <- Entrata miniera
spell_forge.jpg             <- Fucina magica (boss finale)
```

**Totale:** ~27 mappe

---

## 🎯 RINOMINA E SALVATAGGIO

### Esempio Workflow:

1. **Scarica la mappa** (es: da r/battlemaps)
2. **Rinomina il file** esattamente come indicato nel JSON:
   ```
   Downloaded: "awesome_goblin_cave_by_artist.png"
   Rinomina in: "cragmaw_room1.jpg"
   ```
3. **Sposta in `/public/maps/`**
4. **Verifica nel browser:** `http://localhost:5173/maps/cragmaw_room1.jpg`

---

## 🖼️ SPECIFICHE TECNICHE

### Formato Consigliato:
- **Formato:** JPG o PNG
- **Risoluzione minima:** 1920x1080 (Full HD)
- **Risoluzione ideale:** 2560x1440 o superiore
- **Dimensione file:** < 5MB ciascuna (per performance)

### Aspect Ratio:
- **Mappe dungeon:** 1:1 (quadrate) o 16:9
- **Mappe wilderness:** 16:9 (orizzontali)
- **Mappe taverne/edifici:** 4:3 o 16:9

---

## 🎨 OPZIONE 3: Generare con AI (VELOCE)

Se vuoi creare mappe rapidamente con AI:

### Midjourney Prompts:
```
"top-down battle map, goblin cave hideout, D&D style, detailed, no grid"
"aerial view tavern interior, medieval fantasy, warm lighting, D&D map"
"dungeon map, ancient dwarven mine, glowing magical forge, epic fantasy"
```

### DALL-E 3 / Stable Diffusion:
```
"D&D battle map, forest ambush scene, dead horses, goblins hiding in bushes, top-down view"
"fantasy village map, Phandalin, small frontier town, bird's eye view"
"underground hideout map, stone corridors, torches, bandit lair"
```

---

## 🔖 RISORSE AGGIUNTIVE

### Token dei Mostri (icone circolari ~200x200px):

**Game-icons.net:** https://game-icons.net/
- Cerca: goblin, orc, dragon, skeleton, zombie, spider
- Scarica SVG → converti in PNG
- Salva in `/public/tokens/`

**Token Stamp 2:** http://rolladvantage.com/tokenstamp/
- Crea token circolari personalizzati
- Carica immagini e aggiungi bordi

### Avatar NPC (~400x400px):

**Artbreeder:** https://www.artbreeder.com/
- Genera facce realistiche per NPC
- Personalizza età, genere, razza

**This Person Does Not Exist:** https://thispersondoesnotexist.com/
- Facce umane generate da AI
- Refresh per nuove facce

**Hero Forge:** https://www.heroforge.com/
- Crea miniature 3D personalizzate
- Screenshot per avatar

---

## ✅ CHECKLIST INSTALLAZIONE

- [ ] Directory `/public/maps/` creata
- [ ] Directory `/public/tokens/` creata
- [ ] Directory `/public/npcs/` creata
- [ ] Scaricate mappe Parte 1 (Cragmaw Hideout)
- [ ] Scaricate mappe Parte 2 (Phandalin)
- [ ] Scaricate mappe Parte 3 (Side quests)
- [ ] Scaricate mappe Parte 4 (Finale)
- [ ] Scaricati token mostri (almeno: goblin, orc, skeleton, zombie, dragon)
- [ ] Scaricati avatar NPC (almeno: Gundren, Sildar, Toblen)
- [ ] Testato caricamento: `http://localhost:5173/maps/goblin_ambush.jpg`

---

## 🚀 QUICK START (5 Minuti)

### Per Iniziare Subito a Giocare:

**Mappe Essenziali (minimo vitale):**
1. `goblin_ambush.jpg` - Primo incontro
2. `cragmaw_room1.jpg` - Prima stanza dungeon
3. `cragmaw_room7.jpg` - Boss Klarg
4. `phandalin_overview.jpg` - Villaggio
5. `stonehill_inn.jpg` - Hub sociale

**Dove trovarle:**
- Vai su r/battlemaps
- Cerca "Lost Mine of Phandelver complete map pack"
- Qualcuno ha sicuramente caricato un pack completo!

**Reddit thread consigliato:**
https://www.reddit.com/r/LostMinesOfPhandelver/

---

## 🆘 TROUBLESHOOTING

### "La mappa non si vede sulla TV!"

**Problema:** Path sbagliato
**Soluzione:**
- Verifica che il file sia in `/public/maps/` (NON in `/src/`)
- Nome file DEVE essere esattamente come nel JSON (case-sensitive!)
- Prova ad aprire direttamente: `http://localhost:5173/maps/NOME_FILE.jpg`

### "L'immagine è troppo grande/lenta"

**Problema:** File troppo pesante
**Soluzione:**
- Comprimi con TinyPNG: https://tinypng.com/
- Riduci risoluzione a max 2560x1440
- Converti PNG → JPG (più leggero)

### "Non trovo una mappa specifica"

**Problema:** Mappa rara/custom
**Soluzione:**
- Usa Dungeon Scrawl per ricrearla: https://dungeonscrawl.com/
- Chiedi su r/battlemaps: "Looking for: [nome mappa]"
- Usa placeholder temporaneo (immagine vuota con testo)

---

## 📞 SUPPORTO

Se hai problemi, cerca su questi forum:
- r/LostMinesOfPhandelver
- r/battlemaps
- D&D Beyond forums

Buon divertimento! 🎲🐉
