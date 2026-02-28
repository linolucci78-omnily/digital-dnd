const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('starterset_rulebook_it.pdf');

pdf(dataBuffer).then(function(data) {
    const text = data.text;
    
    // Cerchiamo le sezioni chiave
    const hasSpells = text.includes('Incantesimi') || text.includes('Magia');
    const hasWeapons = text.includes('Armi') || text.includes('Equipaggiamento');
    const hasMonsters = text.includes('Mostri') || text.includes('Bestiario');
    
    console.log("--- ANALISI PDF STARTER SET ---");
    console.log("Pagine totali:", data.numpages);
    console.log("Include Magia/Incantesimi:", hasSpells);
    console.log("Include Equipaggiamento/Armi:", hasWeapons);
    console.log("Include Sezione Mostri:", hasMonsters);
    
    // Estraiamo alcune armi di esempio se troviamo la sezione
    if (text.includes('Armi Semplici da Mischia')) {
        const startIndex = text.indexOf('Armi Semplici da Mischia');
        const endIndex = startIndex + 1000;
        console.log("\n--- ESTRATTO SEZIONE ARMI ---");
        console.log(text.substring(startIndex, endIndex));
    }

    // Cerchiamo le condizioni (Accecato, Affascinato...)
    if (text.includes('Appendice A: Condizioni')) {
        const startIndex = text.indexOf('Appendice A: Condizioni');
        const endIndex = startIndex + 800;
        console.log("\n--- ESTRATTO CONDIZIONI ---");
        console.log(text.substring(startIndex, endIndex));
    }
});
