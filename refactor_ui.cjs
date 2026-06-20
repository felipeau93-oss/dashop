const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// The block to replace:
const startString = `const distributedDados = useMemo(() => {`;
const endString = `const matchFiltro = (val, arr) => !arr.includes(val);`;

const startIndex = content.indexOf(startString);
const endIndex = content.indexOf(endString);

if (startIndex === -1 || endIndex === -1) {
  console.log('Block not found!');
  process.exit(1);
}

const replacement = `
  const [distributedDados, setDistributedDados] = useState([]);
  const [distributedFaturamento, setDistributedFaturamento] = useState([]);
  const [distributedOperacional, setDistributedOperacional] = useState([]);
  const [distributedBsc, setDistributedBsc] = useState([]);
  
  const [quinzenasDisponiveis, setQuinzenasDisponiveis] = useState([]);
  const [regionaisDisponiveis, setRegionaisDisponiveis] = useState([]);
  const [supervisoresDisponiveis, setSupervisoresDisponiveis] = useState([]);
  const [filiaisDisponiveis, setFiliaisDisponiveis] = useState([]);
  const [diasSemanaDisponiveis, setDiasSemanaDisponiveis] = useState([]);
  const [isCalculatingUI, setIsCalculatingUI] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const compute = async () => {
      // Only run if we actually have data to process
      if (rawData.length === 0 && rawFaturamentoData.length === 0 && rawOperacionalData.length === 0 && rawBscData.length === 0) return;
      
      setIsCalculatingUI(true);

      const processArray = async (arr, mapFn) => {
        const res = [];
        for (let i = 0; i < arr.length; i += 800) {
          if (isCancelled) return [];
          const chunk = arr.slice(i, i + 800);
          for (const item of chunk) {
            const mapped = mapFn(item);
            if (Array.isArray(mapped)) res.push(...mapped);
            else if (mapped) res.push(mapped);
          }
          await new Promise(r => setTimeout(r, 0));
        }
        return res;
      };

      const distDados = await processArray(rawData, d => {
        const result = [];
        const rs = getRegionalSupervisor(d.filial, d);
        if (normalizeText(d.filial) === 'SSC4') {
          const ratios = ssc4RatiosPerQuinzena[d.quinzena];
          if (ratios) {
            ['ESC4', 'ESC5', 'ESC9'].forEach(target => {
              const rsTarget = getRegionalSupervisor(target, rs);
              if (ratios[target] > 0) result.push({ ...d, filial: target, regional: rsTarget.regional, supervisor: rsTarget.supervisor, valor: d.valor * ratios[target], _pesoQtd: ratios[target] });
            });
          } else { result.push({ ...d, regional: rs.regional, supervisor: rs.supervisor, _pesoQtd: 1 }); }
        } else { result.push({ ...d, regional: rs.regional, supervisor: rs.supervisor, _pesoQtd: 1 }); }
        return result;
      });
      if (isCancelled) return;
      setDistributedDados(distDados);

      const distFat = await processArray(rawFaturamentoData, d => {
        const result = [];
        const rs = getRegionalSupervisor(d.filial, d);
        if (normalizeText(d.filial) === 'SSC4') {
          const ratios = ssc4RatiosPerQuinzena[d.quinzena];
          if (ratios) {
            ['ESC4', 'ESC5', 'ESC9'].forEach(target => {
              const rsTarget = getRegionalSupervisor(target, rs);
              if (ratios[target] > 0) result.push({ ...d, filial: target, regional: rsTarget.regional, supervisor: rsTarget.supervisor, faturamento: d.faturamento * ratios[target], faturamento_paradas: (d.faturamento_paradas || 0) * ratios[target] });
            });
          } else { result.push({ ...d, regional: rs.regional, supervisor: rs.supervisor }); }
        } else { result.push({ ...d, regional: rs.regional, supervisor: rs.supervisor }); }
        return result;
      });
      if (isCancelled) return;
      setDistributedFaturamento(distFat);

      const processOperacionalBsc = async (arr) => {
        return await processArray(arr, d => {
          const result = [];
          const rs = getRegionalSupervisor(d.filial, d);
          if (normalizeText(d.filial) === 'SSC4') {
            const ratios = ssc4RatiosPerQuinzena[d.quinzena];
            if (ratios) {
              ['ESC4', 'ESC5', 'ESC9'].forEach(target => {
                const rsTarget = getRegionalSupervisor(target, rs);
                if (ratios[target] > 0) {
                  const newIns = {};
                  if (d.insucessosDetalhados) {
                    Object.entries(d.insucessosDetalhados).forEach(([k, v]) => newIns[k] = v * ratios[target]);
                  }
                  result.push({ ...d, filial: target, regional: rsTarget.regional, supervisor: rsTarget.supervisor, saldo: d.saldo * ratios[target], entregues: d.entregues * ratios[target], insucessosDetalhados: newIns });
                }
              });
            } else { result.push({ ...d, regional: rs.regional, supervisor: rs.supervisor }); }
          } else { result.push({ ...d, regional: rs.regional, supervisor: rs.supervisor }); }
          return result;
        });
      };

      const distOp = await processOperacionalBsc(rawOperacionalData);
      if (isCancelled) return;
      setDistributedOperacional(distOp);

      const distBsc = await processOperacionalBsc(rawBscData);
      if (isCancelled) return;
      setDistributedBsc(distBsc);

      // Now calculate the dropdowns asynchronously to not freeze
      await new Promise(r => setTimeout(r, 0));
      
      const getAllUnique = async (arrs, key) => {
        const set = new Set();
        for (const arr of arrs) {
          for (let i = 0; i < arr.length; i+=1000) {
            const chunk = arr.slice(i, i+1000);
            for (const item of chunk) {
               if (item[key] && String(item[key]).trim() !== '') set.add(item[key]);
            }
            await new Promise(r => setTimeout(r, 0));
          }
        }
        return [...set];
      };

      const qList = await getAllUnique([distDados, distFat, distOp, distBsc], 'quinzena');
      setQuinzenasDisponiveis(qList.sort((a, b) => {
        if (a === 'N/A' || a === 'GERAL') return 1;
        if (b === 'N/A' || b === 'GERAL') return -1;
        return String(b).localeCompare(String(a));
      }));

      const rList = await getAllUnique([distDados, distFat, distOp, distBsc], 'regional');
      setRegionaisDisponiveis(rList.filter(r => r !== 'N/A').sort());

      const dList = await getAllUnique([distOp, distBsc], 'dia_semana');
      setDiasSemanaDisponiveis(dList.filter(d => d !== 'N/A').sort());

      setIsCalculatingUI(false);
    };

    compute();
    return () => { isCancelled = true; };
  }, [rawData, rawFaturamentoData, rawOperacionalData, rawBscData, ssc4RatiosPerQuinzena, mapeamentoFiliais]);

  // Dropdowns que dependem do filtro selecionado, calculados num useEffect separado e leve
  useEffect(() => {
    let isCancelled = false;
    const computeFilters = async () => {
      const matchReg = (r) => filtroRegionais.length === 0 || !filtroRegionais.includes(r);
      const matchSup = (s) => filtroSupervisores.length === 0 || !filtroSupervisores.includes(s);

      const sSet = new Set();
      const fSet = new Set();
      const arrays = [distributedDados, distributedFaturamento, distributedOperacional, distributedBsc];

      for (const arr of arrays) {
        for (let i = 0; i < arr.length; i+= 2000) {
          if (isCancelled) return;
          const chunk = arr.slice(i, i+2000);
          for (const d of chunk) {
            if (matchReg(d.regional)) {
               if (d.supervisor && d.supervisor !== 'N/A') sSet.add(d.supervisor);
               if (matchSup(d.supervisor) && d.filial && d.filial !== 'N/A') fSet.add(d.filial);
            }
          }
          await new Promise(r => setTimeout(r, 0));
        }
      }

      setSupervisoresDisponiveis([...sSet].sort());
      setFiliaisDisponiveis([...fSet].sort());
    };
    computeFilters();
    return () => { isCancelled = true; };
  }, [distributedDados, distributedFaturamento, distributedOperacional, distributedBsc, filtroRegionais, filtroSupervisores]);

  `;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);

// Add the Loading Spinner to the UI
const mainContainerIndex = content.indexOf('<div className="flex-1 overflow-y-auto p-4 md:p-6"');
if (mainContainerIndex !== -1) {
  const spinnerHTML = `
          {isCalculatingUI && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-bold text-white mb-2">Processando Tabelas...</h2>
              <p className="text-slate-400">Distribuindo rateios e gerando gráficos (sem travar o navegador).</p>
            </div>
          )}
          `;
  content = content.substring(0, mainContainerIndex) + spinnerHTML + content.substring(mainContainerIndex);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactored App.jsx successfully!');
