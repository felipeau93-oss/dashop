const fs = require('fs');

let code = fs.readFileSync('src/App.jsx', 'utf8');

if (!code.includes('const [selectedOfensorFilial, setSelectedOfensorFilial]')) {
  code = code.replace(
    /const RunRatePenalidadesSection = \({ baseData, targetQuinzena, prevStats }\) => {/g,
    `const RunRatePenalidadesSection = ({ baseData, targetQuinzena, prevStats }) => {\n  const [selectedOfensorFilial, setSelectedOfensorFilial] = useState(null);`
  );
  fs.writeFileSync('src/App.jsx', code, 'utf8');
  console.log('Fixed missing useState');
} else {
  console.log('Already exists');
}
