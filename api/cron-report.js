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

    // 5. Agregar os Dados
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
        filiaisMap[filial] = { nome: filial, regional, pnr: 0, lost: 0, nv: 0, geral: 0, qtdGeral: 0 };
      }
      filiaisMap[filial].geral += valor;
      filiaisMap[filial].qtdGeral += 1;
      
      if (isNotVisited) {
        filiaisMap[filial].nv += valor;
      } else if (p.tipo === 'PNRs') {
        filiaisMap[filial].pnr += valor;
      } else if (p.tipo === 'Lost Packages') {
        filiaisMap[filial].lost += valor;
      }

      // Agrega Tipo
      const tipo = p.tipo || 'Desconhecido';
      if (!tiposMap[tipo]) tiposMap[tipo] = { nome: tipo, valor: 0, qtd: 0 };
      tiposMap[tipo].valor += valor;
      tiposMap[tipo].qtd += 1;

      // Agrega Motorista
      const motorista = p.motorista || 'Sem Motorista';
      const mKey = `${filial}:::${motorista}`;
      if (!motoristasMap[mKey]) motoristasMap[mKey] = { filial, regional, supervisor, motorista, valor: 0, qtd: 0 };
      motoristasMap[mKey].valor += valor;
      motoristasMap[mKey].qtd += 1;
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

    // Ranking Motoristas
    const arrMotoristas = Object.values(motoristasMap);
    const topMotoristasRs = [...arrMotoristas].sort((a, b) => b.valor - a.valor).slice(0, 6);
    const topMotoristasQtd = [...arrMotoristas].sort((a, b) => b.qtd - a.qtd).slice(0, 6);

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
    const thStyle = "padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569;";
    const tdStyle = "padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b;";
    
    // Obter valores de tipos formatados para o resumo
    const pnrObj = topTipos.find(t => t.nome === 'PNRs') || { valor: 0 };
    const lostObj = topTipos.find(t => t.nome === 'Lost Packages') || { valor: 0 };
    const nvObj = topTipos.find(t => t.nome === 'Not Visited') || { valor: 0 };

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #333;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; font-size: 20px;">
          Resumo de Penalidades - DashOp
        </h2>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
          <p style="font-size: 14px; margin: 0 0 5px 0;"><strong>Quinzena:</strong> <span style="color: #3b82f6; font-weight: bold;">${targetQuinzena}</span></p>
          <p style="font-size: 14px; margin: 0;"><strong>Total (R$):</strong> <span style="color: #ef4444; font-weight: bold; font-size: 16px;">${formatCurrency(totalPenalidades)}</span></p>
        </div>

        <h3 style="color: #0f172a; margin-top: 30px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">⚠️ Tipo de penalidades em R$:</h3>
        <ul style="font-size: 13px; padding-left: 20px; margin-bottom: 30px; line-height: 1.6;">
          <li><strong>PNR:</strong> <span style="color: #ef4444;">${formatCurrency(pnrObj.valor)}</span></li>
          <li><strong>Lost Packages:</strong> <span style="color: #ef4444;">${formatCurrency(lostObj.valor)}</span></li>
          <li><strong>Not Visited:</strong> <span style="color: #ef4444;">${formatCurrency(nvObj.valor)}</span></li>
        </ul>

        <h3 style="color: #0f172a; margin-top: 30px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🌍 Top Regionais ofensoras (R$)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
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

        <h3 style="color: #0f172a; margin-top: 30px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">💰 Top Filiais Ofensoras Geral:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background-color: #f1f5f9;">
            <th style="${thStyle}">Filial</th>
            <th style="${thStyle}">Regional</th>
            <th style="${thStyle} text-align: right;">Valor</th>
            <th style="${thStyle} text-align: right;">Quantidade</th>
          </tr>
          ${topFiliaisGeral.length ? topFiliaisGeral.map(f => `
            <tr>
              <td style="${tdStyle} font-weight: bold;">${f.nome}</td>
              <td style="${tdStyle}">${f.regional}</td>
              <td style="${tdStyle} text-align: right; color: #ef4444; font-weight: bold;">${formatCurrency(f.geral)}</td>
              <td style="${tdStyle} text-align: right; font-weight: bold;">${f.qtdGeral}</td>
            </tr>
          `).join('') : `<tr><td colspan="4" style="${tdStyle} text-align: center; color: #94a3b8;">Sem dados</td></tr>`}
        </table>

        <h3 style="color: #0f172a; margin-top: 30px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🏢 Filiais (PNR) R$:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background-color: #f1f5f9;">
            <th style="${thStyle}">Filial</th>
            <th style="${thStyle}">Regional</th>
            <th style="${thStyle} text-align: right;">Valor</th>
          </tr>
          ${topFiliaisPnr.length ? topFiliaisPnr.map(f => `
            <tr>
              <td style="${tdStyle} font-weight: bold;">${f.nome}</td>
              <td style="${tdStyle}">${f.regional}</td>
              <td style="${tdStyle} text-align: right; color: #ef4444;">${formatCurrency(f.pnr)}</td>
            </tr>
          `).join('') : `<tr><td colspan="3" style="${tdStyle} text-align: center; color: #94a3b8;">Sem dados</td></tr>`}
        </table>

        <h3 style="color: #0f172a; margin-top: 30px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">📦 Filiais (Lost Packages) R$:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background-color: #f1f5f9;">
            <th style="${thStyle}">Filial</th>
            <th style="${thStyle}">Regional</th>
            <th style="${thStyle} text-align: right;">Valor</th>
          </tr>
          ${topFiliaisLost.length ? topFiliaisLost.map(f => `
            <tr>
              <td style="${tdStyle} font-weight: bold;">${f.nome}</td>
              <td style="${tdStyle}">${f.regional}</td>
              <td style="${tdStyle} text-align: right; color: #ef4444;">${formatCurrency(f.lost)}</td>
            </tr>
          `).join('') : `<tr><td colspan="3" style="${tdStyle} text-align: center; color: #94a3b8;">Sem dados</td></tr>`}
        </table>

        <h3 style="color: #0f172a; margin-top: 30px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🚫 Filiais (Not Visited) R$:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background-color: #f1f5f9;">
            <th style="${thStyle}">Filial</th>
            <th style="${thStyle}">Regional</th>
            <th style="${thStyle} text-align: right;">Valor</th>
          </tr>
          ${topFiliaisNv.length ? topFiliaisNv.map(f => `
            <tr>
              <td style="${tdStyle} font-weight: bold;">${f.nome}</td>
              <td style="${tdStyle}">${f.regional}</td>
              <td style="${tdStyle} text-align: right; color: #ef4444;">${formatCurrency(f.nv)}</td>
            </tr>
          `).join('') : `<tr><td colspan="3" style="${tdStyle} text-align: center; color: #94a3b8;">Sem dados</td></tr>`}
        </table>

        <h3 style="color: #0f172a; margin-top: 30px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">🚚 Top 6 Motoristas Ofensores R$:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background-color: #f1f5f9;">
            <th style="${thStyle}">Motorista</th>
            <th style="${thStyle}">Filial</th>
            <th style="${thStyle}">Regional</th>
            <th style="${thStyle}">Supervisor</th>
            <th style="${thStyle} text-align: right;">Valor</th>
          </tr>
          ${topMotoristasRs.map(m => `
            <tr>
              <td style="${tdStyle} font-weight: bold;">${m.motorista}</td>
              <td style="${tdStyle}">${m.filial}</td>
              <td style="${tdStyle}">${m.regional}</td>
              <td style="${tdStyle}">${m.supervisor}</td>
              <td style="${tdStyle} text-align: right; color: #ef4444; font-weight: bold;">${formatCurrency(m.valor)}</td>
            </tr>
          `).join('')}
        </table>

        <h3 style="color: #0f172a; margin-top: 30px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">📦 Top 6 Motoristas Ofensores Quantidade:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr style="background-color: #f1f5f9;">
            <th style="${thStyle}">Motorista</th>
            <th style="${thStyle}">Filial</th>
            <th style="${thStyle}">Regional</th>
            <th style="${thStyle}">Supervisor</th>
            <th style="${thStyle} text-align: right;">Quantidade</th>
          </tr>
          ${topMotoristasQtd.map(m => `
            <tr>
              <td style="${tdStyle} font-weight: bold;">${m.motorista}</td>
              <td style="${tdStyle}">${m.filial}</td>
              <td style="${tdStyle}">${m.regional}</td>
              <td style="${tdStyle}">${m.supervisor}</td>
              <td style="${tdStyle} text-align: right; font-weight: bold;">${m.qtd}</td>
            </tr>
          `).join('')}
        </table>

        <div style="text-align: center; margin-top: 40px; margin-bottom: 20px;">
          <a href="https://dashop-eight.vercel.app/?view=operacao" 
             style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 13px;">
            Acessar Painel Operacional Simplificado
          </a>
        </div>

        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Este é um e-mail automático gerado pelo sistema DashOp. O detalhamento linha a linha consta no anexo deste e-mail.
        </p>
      </div>
    `;

    // 7. Disparar o e-mail via Resend
    // Nota: O e-mail do remetente e do destinatário devem ser configurados no painel da Vercel.
    const sender = process.env.REPORT_SENDER || 'relatorios@espindolalog.com';
    const recipient = process.env.REPORT_RECIPIENT || 'felipeau93@gmail.com';
    
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
    }

    const emailResponse = await resend.emails.send({
      from: `DashOp Relatórios <${sender}>`,
      to: [recipient],
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
      totalOfensores: topMotoristasRs.length,
      emailId: emailResponse.data.id
    });
  } catch (error) {
    console.error("Erro no cron:", error);
    return res.status(500).json({ error: 'Erro interno no servidor.', details: error.message });
  }
}
