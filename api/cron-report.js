import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Supabase Connection
// Tenta usar VITE_SUPABASE_URL ou fallback para outras vars de ambiente
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Tenta pegar a service_role_key para o cron (se existir), senão a anon_key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default async function handler(req, res) {
  try {
    // BLOQUEIO TEMPORÁRIO A PEDIDO DO USUÁRIO
    // O envio automático só deve começar oficialmente a partir de segunda-feira, 29/06/2026.
    // Ignoramos a requisição se a data atual for anterior a isso.
    const now = new Date();
    const startDate = new Date('2026-06-29T00:00:00Z');
    
    // O parâmetro force=true na URL permite disparar o e-mail manualmente para testes
    if (now < startDate && req.query.force !== 'true') {
      return res.status(200).json({ 
        message: 'Envio ignorado: O envio automático oficial só começa no dia 29/06/2026.' 
      });
    }

    // 1. Validar token de autorização cron (A Vercel envia um Bearer token seguro em Cron Jobs)
    if (process.env.CRON_SECRET) {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Credenciais do Supabase não configuradas no ambiente da Vercel.' });
    }

    // 2. Identificar a quinzena mais recente que possui dados na tabela 'penalidades'
    const { data: quinzenasData, error: qError } = await supabase
      .from('penalidades')
      .select('quinzena')
      .not('quinzena', 'is', null)
      .order('quinzena', { ascending: false })
      .limit(1);

    if (qError) {
      console.error("Erro ao buscar a última quinzena:", qError);
      return res.status(500).json({ error: 'Erro ao buscar quinzena no Supabase.' });
    }

    if (!quinzenasData || quinzenasData.length === 0) {
      return res.status(404).json({ message: 'Nenhuma quinzena válida encontrada no Supabase.' });
    }

    const targetQuinzena = quinzenasData[0].quinzena;

    // 3. Buscar todos os dados para montar o Gráfico de Evolução Quinzenal
    const { data: dadosGrafico, error: chartError } = await supabase
      .from('penalidades')
      .select('quinzena, valor')
      .not('quinzena', 'is', null);

    if (chartError) {
      console.error("Erro ao buscar dados do gráfico:", chartError);
      return res.status(500).json({ error: 'Erro ao buscar dados do gráfico no Supabase.' });
    }

    const quinzenasAgrupadas = {};
    dadosGrafico.forEach(p => {
      const q = p.quinzena;
      if (!quinzenasAgrupadas[q]) quinzenasAgrupadas[q] = 0;
      quinzenasAgrupadas[q] += (Number(p.valor) || 0);
    });

    const quinzenasOrdenadas = Object.keys(quinzenasAgrupadas).sort();
    const ultimasQuinzenas = quinzenasOrdenadas.slice(-6); // Últimas 6 quinzenas
    
    const dataValues = ultimasQuinzenas.map(q => quinzenasAgrupadas[q].toFixed(2));
    const labelsStr = JSON.stringify(ultimasQuinzenas);
    const dataStr = JSON.stringify(dataValues.map(Number));

    const chartConfigStr = `{
      type: 'line',
      data: {
        labels: ${labelsStr},
        datasets: [{
          label: 'Total Descontado (R$)',
          data: ${dataStr},
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: true,
          pointBackgroundColor: '#ef4444',
          pointRadius: 6
        }]
      },
      options: {
        layout: {
          padding: { left: 20, right: 20, top: 30, bottom: 10 }
        },
        plugins: {
          datalabels: {
            display: true,
            align: 'top',
            offset: 8,
            color: '#1e293b',
            font: { weight: 'bold', size: 14 },
            formatter: (val) => {
              return 'R$ ' + Number(val).toFixed(2).replace('.', ',');
            }
          }
        },
        title: {
          display: true,
          text: 'Evolução de Penalidades (Últimas 6 Quinzenas)',
          fontSize: 16,
          fontColor: '#0f172a'
        },
        legend: { display: false },
        scales: {
          xAxes: [{
            offset: true
          }],
          yAxes: [{
            ticks: {
              beginAtZero: true,
              callback: (val) => {
                return 'R$ ' + Number(val).toFixed(2).replace('.', ',');
              }
            }
          }]
        }
      }
    }`;

    const encodedChartUrl = `https://quickchart.io/chart?w=800&h=400&devicePixelRatio=2&c=${encodeURIComponent(chartConfigStr)}`;

    // 4. Buscar os Dados da Quinzena Atual
    const { data: casosDaQuinzena, error: casosError } = await supabase
      .from('penalidades')
      .select('*')
      .eq('quinzena', targetQuinzena);

    if (casosError) {
      console.error("Erro ao buscar casos da quinzena:", casosError);
      return res.status(500).json({ error: 'Erro ao buscar casos da quinzena no Supabase.' });
    }

    let totalPenalidades = 0;
    const filiaisMap = {};
    const tiposMap = {};
    const motoristasMap = {};
    const regionaisMap = {};

    casosDaQuinzena.forEach(p => {
      const isNotVisited = p.tipo === 'Not Visited';
      const valor = Number(p.valor) || 0; // O Not Visited volta a somar o seu valor em R$
      
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
      const motorista = p.motorista || (p.dados_originais && p.dados_originais.Motorista) || 'Sem Motorista';
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
      const motoristaStr = p.motorista || (p.dados_originais && p.dados_originais.Motorista) || '-';
      const m = `"${motoristaStr}"`;
      const t = `"${p.tipo || '-'}"`;
      const v = isNV ? '-' : (Number(p.valor) || 0).toFixed(2);
      const ip = p.id_pacote || '-';
      const ir = p.id_rota || '-';
      return `${q},${r},${s},${f},${m},${t},${v},${ip},${ir}`;
    }).join('\n');
    
    const csvContent = Buffer.from('\uFEFF' + csvHeader + csvRows, 'utf-8');

    // 5. Montar Template HTML
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
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
          <p style="font-size: 14px; margin: 0 0 4px 0;"><strong>Quinzena:</strong> <span style="color: #3b82f6; font-weight: bold;">${targetQuinzena}</span></p>
          <p style="font-size: 14px; margin: 0;"><strong>Total (R$):</strong> <span style="color: #ef4444; font-weight: bold;">${formatCurrency(totalPenalidades)}</span></p>
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

    // 6. Disparar o e-mail via Resend
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
