const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'DataImporter.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                      <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Excluir Alertas ({selectedPendentes.size})
                      </button>`;

const newBtn = `
                      <button onClick={handleBulkRetrySearch} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Refazer Busca ({selectedPendentes.size})
                      </button>`;

if (content.includes('handleBulkRetrySearch')) {
   console.log("handleBulkRetrySearch function is already in the file!");
} else {
   console.log("Warning: handleBulkRetrySearch function is MISSING from the file!");
}

if (content.includes(targetStr)) {
  content = content.replace(targetStr, targetStr + newBtn);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Button patched successfully");
} else {
  console.log("Could not find the target string for the button!");
}
