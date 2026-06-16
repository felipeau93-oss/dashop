import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Funções utilitárias idênticas ao front-end para descobrir a quinzena atual
const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const str = String(dateStr).trim();
  const dateMatchBR = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatchBR) {
    let year = parseInt(dateMatchBR[3], 10);
    if (year < 100) year += 2000;
    return new Date(year, parseInt(dateMatchBR[2], 10) - 1, parseInt(dateMatchBR[1], 10));
  }
  const dateMatchUS = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatchUS) {
    return new Date(parseInt(dateMatchUS[1], 10), parseInt(dateMatchUS[2], 10) - 1, parseInt(dateMatchUS[3], 10));
  }
  return new Date(0);
};

const getQuinzena = (dateStr) => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  const str = String(dateStr).trim();
  const dateMatchBR = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatchBR) {
    let year = parseInt(dateMatchBR[3], 10);
    if (year < 100) year += 2000;
    return `${year}${dateMatchBR[2].padStart(2, '0')}${parseInt(dateMatchBR[1], 10) <= 15 ? 'Q1' : 'Q2'}`;
  }
  const dateMatchUS = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatchUS) {
    const year = parseInt(dateMatchUS[1], 10);
    const month = parseInt(dateMatchUS[2], 10).toString().padStart(2, '0');
    return `${year}${month}${parseInt(dateMatchUS[3], 10) <= 15 ? 'Q1' : 'Q2'}`;
  }
  return 'N/A';
};

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default async function handler(req, res) {
  try {
    // 1. Validar token de autorização cron (A Vercel envia um Bearer token seguro em Cron Jobs)
    // Para simplificar a execução manual durante testes, ignoramos a validação se não houver CRON_SECRET configurado
    if (process.env.CRON_SECRET) {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // 2. Buscar dados da API REST do Firestore com paginação
    let documents = [];
    let pageToken = '';
    let hasMore = true;

    while (hasMore) {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/dashop-1291f/databases/(default)/documents/app_dados_comprimidos?pageSize=100${pageToken ? '&pageToken=' + pageToken : ''}`;
      const dbResponse = await fetch(firestoreUrl);
      
      if (!dbResponse.ok) {
        throw new Error(`Erro ao conectar com Firebase: ${dbResponse.statusText}`);
      }

      const data = await dbResponse.json();
      if (data.documents) {
        documents = documents.concat(data.documents);
      }
      
      if (data.nextPageToken) {
        pageToken = data.nextPageToken;
      } else {
        hasMore = false;
      }
    }
    
    // 3. Remontar os chunks das penalidades
    const penalidadesChunks = [];
    if (documents.length > 0) {
      documents.forEach(doc => {
        const idPath = doc.name.split('/');
        const id = idPath[idPath.length - 1]; // ex: penalidades_chunk_0
        
        if (id.startsWith('penalidades_chunk_')) {
          const index = parseInt(id.split('_chunk_')[1], 10);
          if (doc.fields && doc.fields.payload && doc.fields.payload.stringValue) {
            penalidadesChunks[index] = doc.fields.payload.stringValue;
          }
        }
      });
    }

    if (penalidadesChunks.length === 0) {
      return res.status(404).json({ message: 'Nenhum dado de penalidades encontrado no banco.' });
    }

    const penalidadesJSON = penalidadesChunks.join('');
    const penalidades = JSON.parse(penalidadesJSON);

    // 4. Identificar a quinzena mais recente que possui dados
    let targetQuinzena = null;
    
    const validPenalidades = penalidades.filter(p => p.valor && p.quinzena);
    
    const quinzenasEncontradas = [...new Set(validPenalidades.map(p => p.quinzena))];
    if (quinzenasEncontradas.length > 0) {
      targetQuinzena = quinzenasEncontradas.sort().pop(); // '202604Q2' > '202604Q1'
    }

    if (!targetQuinzena) {
      return res.status(404).json({ message: 'Nenhuma quinzena válida encontrada.' });
    }

    // 4.5. Gráfico de Evolução Quinzenal via QuickChart
    const quinzenasAgrupadas = {};
    validPenalidades.forEach(p => {
      const q = p.quinzena;
      if (!quinzenasAgrupadas[q]) quinzenasAgrupadas[q] = 0;
      quinzenasAgrupadas[q] += (p.valor || 0);
    });

    const quinzenasOrdenadas = Object.keys(quinzenasAgrupadas).sort();
    const ultimasQuinzenas = quinzenasOrdenadas.slice(-6); // Últimas 6 quinzenas
    
    const chartConfig = {
      type: 'line',
      data: {
        labels: ultimasQuinzenas,
        datasets: [{
          label: 'Total Descontado (R$)',
          data: ultimasQuinzenas.map(q => quinzenasAgrupadas[q].toFixed(2)),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          fill: true,
          pointBackgroundColor: '#ef4444',
          pointRadius: 4
        }]
      },
      options: {
        plugins: {
          datalabels: {
            display: true,
            align: 'top',
            color: '#475569',
            font: { weight: 'bold', size: 10 },
            formatter: (value) => 'R$ ' + (value/1000).toFixed(1) + 'k'
          }
        },
        title: {
          display: true,
          text: 'Evolução de Penalidades (Últimas 6 Quinzenas)',
          fontSize: 14,
          fontColor: '#0f172a'
        },
        legend: { display: false },
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true,
              callback: (val) => 'R$ ' + (val/1000).toFixed(0) + 'k'
            }
          }]
        }
      }
    };

    const encodedChartUrl = `https://quickchart.io/chart?w=600&h=300&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    // 5. Agregar os Dados da Quinzena Atual
    const casosDaQuinzena = validPenalidades.filter(p => p.quinzena === targetQuinzena);
    
    let totalPenalidades = 0;
    const filiaisMap = {};
    const tiposMap = {};
    const motoristasMap = {};
    const regionaisMap = {};

    casosDaQuinzena.forEach(p => {
      const isNotVisited = p.tipo === 'Not Visited';
      const valor = p.valor || 0; // O Not Visited volta a somar o seu valor em R$
      
      totalPenalidades += valor;

      // Metadados
      const filial = p.filial || 'Sem Filial';
      const regional = p.regional || 'N/A';
      const supervisor = p.supervisor || 'N/A';

      // Agrega Regional + Supervisor
      const rsKey = `${regional}:::${supervisor}`;
      if (!regionaisMap[rsKey]) regionaisMap[rsKey] = { regional, supervisor, valor: 0 };
      regionaisMap[rsKey].valor += valor;

      // Agrega Filial
      if (!filiaisMap[filial]) {
        filiaisMap[filial] = { nome: filial, regional, pnr: 0, lost: 0, nv: 0, geral: 0, qtdGeral: 0, qtdPnr: 0, qtdLost: 0, qtdNv: 0 };
      }
      filiaisMap[filial].geral += valor;
      filiaisMap[filial].qtdGeral += 1;
      
      if (isNotVisited) {
        filiaisMap[filial].nv += valor;
        filiaisMap[filial].qtdNv += 1;
      } else if (p.tipo === 'PNRs') {
        filiaisMap[filial].pnr += valor;
        filiaisMap[filial].qtdPnr += 1;
      } else if (p.tipo === 'Lost Packages') {
        filiaisMap[filial].lost += valor;
        filiaisMap[filial].qtdLost += 1;
      }

      // Agrega Tipo
      const tipo = p.tipo || 'Desconhecido';
      if (!tiposMap[tipo]) tiposMap[tipo] = { nome: tipo, valor: 0, qtd: 0 };
      tiposMap[tipo].valor += valor;
      tiposMap[tipo].qtd += 1;

      // Agrega Motorista
      const motorista = p.motorista || 'Sem Motorista';
      const mKey = `${filial}:::${motorista}`;
      if (!motoristasMap[mKey]) motoristasMap[mKey] = { filial, regional, supervisor, motorista, valor: 0, qtd: 0, pnrValor: 0, lostValor: 0, pnrQtd: 0, lostQtd: 0 };
      motoristasMap[mKey].valor += valor;
      motoristasMap[mKey].qtd += 1;
      
      if (p.tipo === 'PNRs') {
        motoristasMap[mKey].pnrValor += valor;
        motoristasMap[mKey].pnrQtd += 1;
      } else if (p.tipo === 'Lost Packages') {
        motoristasMap[mKey].lostValor += valor;
        motoristasMap[mKey].lostQtd += 1;
      }
    });

    // Rankings Regionais (com Supervisor)
    const topRegionais = Object.values(regionaisMap).sort((a, b) => b.valor - a.valor).slice(0, 5);

    // Rankings Filiais
    const arrFiliais = Object.values(filiaisMap);
    const topFiliaisPnr = [...arrFiliais].sort((a, b) => b.pnr - a.pnr).filter(f => f.pnr > 0).slice(0, 5);
    const topFiliaisLost = [...arrFiliais].sort((a, b) => b.lost - a.lost).filter(f => f.lost > 0).slice(0, 5);
    const topFiliaisNv = [...arrFiliais].sort((a, b) => b.nv - a.nv).filter(f => f.nv > 0).slice(0, 5);
    const topFiliaisGeral = [...arrFiliais].sort((a, b) => b.geral - a.geral).filter(f => f.geral > 0).slice(0, 5);

    // Ranking Top Tipos
    const topTipos = Object.values(tiposMap).sort((a, b) => b.valor - a.valor);

    // Ranking Motoristas (10 Ofensores em PNRs e 10 em Lost Packages)
    const arrMotoristas = Object.values(motoristasMap);
    const topMotoristasPnr = [...arrMotoristas].filter(m => m.pnrValor > 0).sort((a, b) => b.pnrValor - a.pnrValor).slice(0, 10);
    const topMotoristasLost = [...arrMotoristas].filter(m => m.lostValor > 0).sort((a, b) => b.lostValor - a.lostValor).slice(0, 10);

    // Gerar CSV String para o Anexo
    const csvHeader = 'Quinzena,Regional,Supervisor,Filial,Motorista,Tipo,Valor(R$),ID_Pacote,ID_Rota\n';
    const csvRows = casosDaQuinzena.map(p => {
      const isNV = p.tipo === 'Not Visited';
      const q = p.quinzena || '-';
      const r = `"${p.regional || 'N/A'}"`;
      const s = `"${p.supervisor || 'N/A'}"`;
      const f = `"${p.filial || '-'}"`;
      const m = `"${p.motorista || '-'}"`;
      const t = `"${p.tipo || '-'}"`;
      const v = isNV ? '-' : (p.valor || 0).toFixed(2);
      const ip = p.id_pacote || '-';
      const ir = p.id_rota || '-';
      return `${q},${r},${s},${f},${m},${t},${v},${ip},${ir}`;
    }).join('\n');
    
    const csvContent = Buffer.from('\uFEFF' + csvHeader + csvRows, 'utf-8');

    // 6. Montar Template HTML
    const thStyle = "padding: 5px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 10px; text-transform: uppercase; color: #475569;";
    const tdStyle = "padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #1e293b;";
    
    // Obter valores de tipos formatados para o resumo
    const pnrObj = topTipos.find(t => t.nome === 'PNRs') || { valor: 0 };
    const lostObj = topTipos.find(t => t.nome === 'Lost Packages') || { valor: 0 };
    const nvObj = topTipos.find(t => t.nome === 'Not Visited') || { valor: 0 };

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #333;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 18px;">
          Resumo de Penalidades - DashOp
        </h2>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; display: table; width: 100%; box-sizing: border-box;">
          <div style="display: table-cell; vertical-align: middle;">
            <p style="font-size: 10px; margin: 0 0 4px 0;"><strong>Quinzena:</strong> <span style="color: #3b82f6; font-weight: bold;">${targetQuinzena}</span></p>
            <p style="font-size: 10px; margin: 0;"><strong>Total (R$):</strong> <span style="color: #ef4444; font-weight: bold; font-size: 10px;">${formatCurrency(totalPenalidades)}</span></p>
          </div>
          <div style="display: table-cell; vertical-align: middle; text-align: right;">
            <a href="https://dashop-eight.vercel.app/?view=operacao" 
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 8px 14px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 10px;">
              Acessar Painel Operacional
            </a>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 20px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
           <img src="${encodedChartUrl}" alt="Gráfico de Evolução Quinzenal" style="max-width: 100%; height: auto;" />
        </div>

        <h3 style="color: #0f172a; margin-top: 15px; font-size: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">⚠️ Tipo de penalidades em R$:</h3>
        <ul style="font-size: 10px; padding-left: 20px; margin-bottom: 15px; line-height: 1.6;">
          <li><strong>PNR:</strong> <span style="color: #ef4444;">${formatCurrency(pnrObj.valor)}</span> <span style="color: #64748b; font-size: 9px;">(${pnrObj.qtd || 0} ocorrências)</span></li>
          <li><strong>Lost Packages:</strong> <span style="color: #ef4444;">${formatCurrency(lostObj.valor)}</span> <span style="color: #64748b; font-size: 9px;">(${lostObj.qtd || 0} ocorrências)</span></li>
          <li><strong>Not Visited:</strong> <span style="color: #ef4444;">${formatCurrency(nvObj.valor)}</span> <span style="color: #64748b; font-size: 9px;">(${nvObj.qtd || 0} ocorrências)</span></li>
        </ul>

        <h3 style="color: #0f172a; margin-top: 15px; font-size: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🌍 Top Regionais ofensoras (R$)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr style="background-color: #f1f5f9;">
            <th style="${thStyle}">Regional</th>
            <th style="${thStyle}">Supervisor Responsável</th>
            <th style="${thStyle} text-align: right;">Valor</th>
          </tr>
          ${topRegionais.length ? topRegionais.map(r => `
            <tr>
              <td style="${tdStyle} font-weight: bold;">${r.regional}</td>
              <td style="${tdStyle}">${r.supervisor}</td>
              <td style="${tdStyle} text-align: right; color: #ef4444; font-weight: bold;">${formatCurrency(r.valor)}</td>
            </tr>
          `).join('') : `<tr><td colspan="3" style="${tdStyle} text-align: center; color: #94a3b8;">Sem dados</td></tr>`}
        </table>

        <h3 style="color: #0f172a; margin-top: 15px; font-size: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">💰 Top Filiais Ofensoras Geral:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr style="background-color: #f1f5f9;">
            <th style="${thStyle}">Filial</th>
            <th style="${thStyle}">Regional</th>
            <th style="${thStyle} text-align: right;">Quantidade</th>
            <th style="${thStyle} text-align: right;">Valor</th>
          </tr>
          ${topFiliaisGeral.length ? topFiliaisGeral.map(f => `
            <tr>
              <td style="${tdStyle} font-weight: bold;">${f.nome}</td>
              <td style="${tdStyle}">${f.regional}</td>
              <td style="${tdStyle} text-align: right; font-weight: bold;">${f.qtdGeral}</td>
              <td style="${tdStyle} text-align: right; color: #ef4444; font-weight: bold;">${formatCurrency(f.geral)}</td>
            </tr>
          `).join('') : `<tr><td colspan="4" style="${tdStyle} text-align: center; color: #94a3b8;">Sem dados</td></tr>`}
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 10px;">
              <h3 style="color: #0f172a; margin-top: 15px; font-size: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🏢 Filiais (PNR) R$:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f1f5f9;">
                  <th style="${thStyle}">Filial</th>
                  <th style="${thStyle} text-align: right;">Qtd</th>
                  <th style="${thStyle} text-align: right;">Valor</th>
                </tr>
                ${topFiliaisPnr.length ? topFiliaisPnr.map(f => `
                  <tr>
                    <td style="${tdStyle} font-weight: bold;">${f.nome}</td>
                    <td style="${tdStyle} text-align: right; font-weight: bold;">${f.qtdPnr}</td>
                    <td style="${tdStyle} text-align: right; color: #ef4444;">${formatCurrency(f.pnr)}</td>
                  </tr>
                `).join('') : `<tr><td colspan="3" style="${tdStyle} text-align: center; color: #94a3b8;">Sem dados</td></tr>`}
              </table>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 10px;">
              <h3 style="color: #0f172a; margin-top: 15px; font-size: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">📦 Filiais (Lost Packages) R$:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f1f5f9;">
                  <th style="${thStyle}">Filial</th>
                  <th style="${thStyle} text-align: right;">Qtd</th>
                  <th style="${thStyle} text-align: right;">Valor</th>
                </tr>
                ${topFiliaisLost.length ? topFiliaisLost.map(f => `
                  <tr>
                    <td style="${tdStyle} font-weight: bold;">${f.nome}</td>
                    <td style="${tdStyle} text-align: right; font-weight: bold;">${f.qtdLost}</td>
                    <td style="${tdStyle} text-align: right; color: #ef4444;">${formatCurrency(f.lost)}</td>
                  </tr>
                `).join('') : `<tr><td colspan="3" style="${tdStyle} text-align: center; color: #94a3b8;">Sem dados</td></tr>`}
              </table>
            </td>
          </tr>
        </table>

        <h3 style="color: #0f172a; margin-top: 15px; font-size: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🚫 Filiais (Not Visited) R$:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr style="background-color: #f1f5f9;">
            <th style="${thStyle}">Filial</th>
            <th style="${thStyle}">Regional</th>
            <th style="${thStyle} text-align: right;">Quantidade</th>
            <th style="${thStyle} text-align: right;">Valor</th>
          </tr>
          ${topFiliaisNv.length ? topFiliaisNv.map(f => `
            <tr>
              <td style="${tdStyle} font-weight: bold;">${f.nome}</td>
              <td style="${tdStyle}">${f.regional}</td>
              <td style="${tdStyle} text-align: right; font-weight: bold;">${f.qtdNv}</td>
              <td style="${tdStyle} text-align: right; color: #ef4444;">${formatCurrency(f.nv)}</td>
            </tr>
          `).join('') : `<tr><td colspan="4" style="${tdStyle} text-align: center; color: #94a3b8;">Sem dados</td></tr>`}
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 10px;">
              <h3 style="color: #0f172a; margin-top: 15px; font-size: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🚚 Top 10 Motoristas (PNRs):</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f1f5f9;">
                  <th style="${thStyle}">Motorista</th>
                  <th style="${thStyle}">Filial</th>
                  <th style="${thStyle} text-align: right;">Qtd</th>
                  <th style="${thStyle} text-align: right;">Valor</th>
                </tr>
                ${topMotoristasPnr.map(m => `
                  <tr>
                    <td style="${tdStyle} font-weight: bold;">${m.motorista}</td>
                    <td style="${tdStyle}">${m.filial}</td>
                    <td style="${tdStyle} text-align: right; font-weight: bold;">${m.pnrQtd}</td>
                    <td style="${tdStyle} text-align: right; color: #ef4444;">${formatCurrency(m.pnrValor)}</td>
                  </tr>
                `).join('')}
              </table>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 10px;">
              <h3 style="color: #0f172a; margin-top: 15px; font-size: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">📦 Top 10 Motoristas (Lost Packages):</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f1f5f9;">
                  <th style="${thStyle}">Motorista</th>
                  <th style="${thStyle}">Filial</th>
                  <th style="${thStyle} text-align: right;">Qtd</th>
                  <th style="${thStyle} text-align: right;">Valor</th>
                </tr>
                ${topMotoristasLost.map(m => `
                  <tr>
                    <td style="${tdStyle} font-weight: bold;">${m.motorista}</td>
                    <td style="${tdStyle}">${m.filial}</td>
                    <td style="${tdStyle} text-align: right; font-weight: bold;">${m.lostQtd}</td>
                    <td style="${tdStyle} text-align: right; color: #ef4444;">${formatCurrency(m.lostValor)}</td>
                  </tr>
                `).join('')}
              </table>
            </td>
          </tr>
        </table>

        

        <p style="font-size: 10px; color: #94a3b8; text-align: center; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Este é um e-mail automático gerado pelo sistema DashOp. O detalhamento linha a linha consta no anexo deste e-mail.
        </p>
      </div>
    `;

    // 7. Disparar o e-mail via Resend
    // Nota: O e-mail do remetente e do destinatário devem ser configurados no painel da Vercel.
    const sender = process.env.REPORT_SENDER || 'relatorios@espindolalog.com';
    const recipient = process.env.REPORT_RECIPIENT || 'felipe.augusto@espindolalog.com';
    
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
    }

    const emailResponse = await resend.emails.send({
      from: `DashOp Relatórios <${sender}>`,
      to: recipient.split(',').map(e => e.trim()),
      subject: `🚨 Relatório de Penalidades - ${targetQuinzena}`,
      html: htmlBody,
      attachments: [
        {
          filename: `Detalhamento_Penalidades_${targetQuinzena}.csv`,
          content: csvContent
        }
      ]
    });

    if (emailResponse.error) {
      return res.status(500).json({ error: 'Erro ao enviar o e-mail', details: emailResponse.error });
    }

    return res.status(200).json({
      message: 'Relatório enviado com sucesso!',
      quinzena: targetQuinzena,
      totalOfensores: topMotoristasPnr.length + topMotoristasLost.length,
      emailId: emailResponse.data.id
    });
  } catch (error) {
    console.error("Erro no cron:", error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
