import handler from './api/cron-report.js'; const req = { headers: {} }; const res = { status: (c) => ({ json: (d) => console.log(c, d) }) }; handler(req, res).catch(console.error);
