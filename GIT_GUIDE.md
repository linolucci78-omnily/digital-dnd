# Guida Git per Digital D&D

## Cos'è Git?
Git è un sistema di controllo versione che tiene traccia di tutte le modifiche al tuo codice. Ogni volta che salvi (commit) il tuo lavoro, Git crea uno "snapshot" del progetto che puoi recuperare in qualsiasi momento.

## Comandi Base (da usare quando modifichi il codice)

### 1. Vedere quali file hai modificato
```bash
git status
```
Mostra tutti i file che hai modificato dall'ultimo commit.

### 2. Salvare le tue modifiche (LOCALE)

Quando hai fatto modifiche importanti e vuoi salvarle:

```bash
# Aggiungi tutti i file modificati
git add .

# Crea un commit con un messaggio descrittivo
git commit -m "Descrizione breve delle modifiche"
```

**Esempi di messaggi commit:**
- `git commit -m "Fix bug narrativa duplicata"`
- `git commit -m "Aggiunto sistema upload immagini"`
- `git commit -m "Migliorato sistema dadi 3D"`

### 3. Vedere la cronologia dei commit
```bash
git log --oneline
```
Mostra tutti i commit che hai fatto.

### 4. Tornare indietro a una versione precedente

Se qualcosa si rompe e vuoi tornare indietro:

```bash
# Vedi la lista dei commit
git log --oneline

# Torna al commit specifico (sostituisci COMMIT_ID con l'ID del commit)
git checkout COMMIT_ID
```

Per tornare alla versione più recente:
```bash
git checkout main
```

## Workflow Consigliato

### Ogni volta che inizi a lavorare:
1. Apri il terminale nel progetto
2. Controlla lo stato: `git status`

### Durante il lavoro:
- Salva spesso con commit piccoli e frequenti
- Ogni funzionalità nuova = nuovo commit

### Fine sessione di lavoro:
```bash
# 1. Vedi cosa hai modificato
git status

# 2. Aggiungi tutto
git add .

# 3. Crea commit
git commit -m "Descrizione di cosa hai fatto oggi"
```

## Backup su GitHub (Opzionale ma FORTEMENTE consigliato)

Per avere un backup online del tuo progetto:

### 1. Crea un repository su GitHub
1. Vai su https://github.com
2. Clicca "New repository"
3. Nome: `digital-dnd`
4. Visibilità: **Private** (per tenere il progetto privato)
5. NON aggiungere README, .gitignore, o license
6. Clicca "Create repository"

### 2. Collega il tuo progetto locale a GitHub

Dopo aver creato il repository, GitHub ti darà dei comandi. Usa questi:

```bash
git remote add origin https://github.com/TUO_USERNAME/digital-dnd.git
git branch -M main
git push -u origin main
```

### 3. Salvare su GitHub dopo ogni commit

Dopo ogni commit locale:
```bash
git push
```

Questo carica tutte le modifiche su GitHub.

## File Protetti

Il tuo file `.gitignore` protegge automaticamente:
- File `.env` (contengono le chiavi segrete Supabase)
- `node_modules` (troppo grande, si rigenera con npm install)
- PDF manuali (troppo grandi per Git)
- File di build

**IMPORTANTE:** Non modificare mai il file `.env` direttamente su GitHub. Le chiavi Supabase devono rimanere segrete.

## Comandi Utili

### Annullare modifiche non salvate
```bash
# Annulla le modifiche a un file specifico
git checkout -- nome_file.jsx

# Annulla TUTTE le modifiche non salvate (ATTENZIONE!)
git reset --hard
```

### Vedere le differenze
```bash
# Vedi cosa è cambiato nei file modificati
git diff
```

### Rimuovere file dall'area di staging
```bash
# Se hai fatto git add ma vuoi togliere un file
git reset HEAD nome_file.jsx
```

## In caso di emergenza

Se qualcosa si rompe completamente:

1. **Non panico!** Git ha salvato tutto.
2. Vedi i commit precedenti: `git log --oneline`
3. Torna al commit funzionante: `git checkout COMMIT_ID`
4. Se vuoi rimanere lì: `git checkout -b backup-branch`

## Domande Frequenti

**Q: Quanto spesso devo fare commit?**
A: Ogni volta che completi una funzionalità o fix, anche piccola. Meglio tanti commit piccoli che uno grande.

**Q: Devo pushare su GitHub ogni volta?**
A: Non è obbligatorio, ma è consigliato almeno una volta al giorno per avere il backup online.

**Q: Posso vedere il codice di una versione precedente senza perdere il lavoro attuale?**
A: Sì! Usa `git checkout COMMIT_ID` per vedere, poi `git checkout main` per tornare al presente.

**Q: Ho fatto un commit sbagliato, come lo annullo?**
A: `git reset --soft HEAD~1` annulla l'ultimo commit mantenendo le modifiche.

## Stato Attuale

- **Branch:** main
- **Primo commit:** 9abe80a - Initial commit - Digital D&D Virtual Tabletop
- **File totali tracciati:** 1572 file
- **Linee di codice:** ~85,000

Il tuo progetto è ora protetto! Ogni modifica importante salvala con un commit.
