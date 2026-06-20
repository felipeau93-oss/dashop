const fs = require('fs');
const transcriptPath = 'C:\\Users\\Felipe Augusto\\.gemini\\antigravity-ide\\brain\\2b69352c-90c1-436a-bf37-d54e9662306b\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(transcriptPath)) { console.log('No transcript'); process.exit(0); }
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
let lastCode = '';
for (const line of lines) {
    if(!line) continue;
    const data = JSON.parse(line);
    if(data.type === 'ACTION_CALL' && data.content.includes('DataImporter.jsx')) {
        const match = data.content.match(/\"CodeContent\":\"(.*?)\"/);
        if(match) {
            let code = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            lastCode = code;
        }
    }
}
if(lastCode) {
    fs.writeFileSync('C:\\Users\\Felipe Augusto\\Desktop\\Antigravity Projects\\dashop\\src\\DataImporter_recovered.jsx', lastCode);
    console.log('Recovered from previous session write_to_file. Size: ' + lastCode.length);
} else {
    console.log('No write_to_file found in prev session');
}
