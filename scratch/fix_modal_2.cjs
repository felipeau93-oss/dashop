const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

if (!code.includes('const [selectedOfensorFilial, setSelectedOfensorFilial] = useState(null);', code.indexOf('const RunRateFinanceiroSection'))) {
  code = code.replace(
    /const RunRateFinanceiroSection = \({ baseData, targetQuinzena, prevStats }\) => {/g,
    `const RunRateFinanceiroSection = ({ baseData, targetQuinzena, prevStats }) => {\n  const [selectedOfensorFilial, setSelectedOfensorFilial] = useState(null);`
  );
  fs.writeFileSync('src/App.jsx', code, 'utf8');
  console.log('Fixed missing useState in RunRateFinanceiroSection');
} else {
  console.log('Already exists');
}
