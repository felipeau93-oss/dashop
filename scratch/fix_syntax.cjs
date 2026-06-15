const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const bad = `<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="25" y1={100 - dsToY(currentDS)} x2="75" y2={100 - dsToY(projDS)} stroke="#0f766e" strokeWidth="4" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            </svg>
          {data.map`;

const good = `<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="25" y1={100 - dsToY(currentDS)} x2="75" y2={100 - dsToY(projDS)} stroke="#0f766e" strokeWidth="4" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {data.map`;

code = code.replace(bad, good);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Fixed missing close parenthesis');
