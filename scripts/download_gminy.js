const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/jusuff/PolandGeoJson/main/data/poland.municipalities.json';
const targetDir = path.join(__dirname, '..', 'assets', 'data');
const targetFile = path.join(targetDir, 'gminy.geojson');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

console.log('Pobieranie pliku gminy.geojson...');

const file = fs.createWriteStream(targetFile);

https.get(url, (response) => {
    if (response.statusCode !== 200) {
        console.error(`Błąd: serwer zwrócił status ${response.statusCode}`);
        return;
    }
    
    response.pipe(file);
    
    file.on('finish', () => {
        file.close();
        console.log(`Pomyślnie pobrano plik do: ${targetFile}`);
        
        // Let's verify the file is a valid JSON
        try {
            const data = fs.readFileSync(targetFile, 'utf8');
            const json = JSON.parse(data);
            console.log(`Plik poprawny, zawiera ${json.features?.length || 0} gmin.`);
        } catch (e) {
            console.error('Pobrany plik nie jest prawidłowym JSONem!', e);
        }
    });
}).on('error', (err) => {
    fs.unlink(targetFile, () => {});
    console.error(`Błąd podczas pobierania: ${err.message}`);
});
