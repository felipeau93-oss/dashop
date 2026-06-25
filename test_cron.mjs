import handler from './api/cron-report.js';

const req = {
  query: { force: 'true' }, // Force execution ignoring the date block
  headers: {}
};

const res = {
  status: function(s) {
    console.log("Status:", s);
    return this;
  },
  json: function(j) {
    console.log("Response:", j);
    return this;
  }
};

console.log("Iniciando teste manual do cron-report.js...");
handler(req, res).then(() => console.log("Finalizado."));
