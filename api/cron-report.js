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
    let targetDateValue = 0;
    
    const validPenalidades = penalidades.filter(p => p.valor && p.data);
    validPenalidades.forEach(p => {
      const q = getQuinzena(p.data);
      const dVal = parseDate(p.data).getTime();
      if (q !== 'N/A' && dVal > targetDateValue) {
        targetDateValue = dVal;
        targetQuinzena = q;
      }
    });

    if (!targetQuinzena) {
      return res.status(404).json({ message: 'Nenhuma quinzena válida encontrada.' });
    }

    // 5. Agregar os Dados
    const casosDaQuinzena = validPenalidades.filter(p => getQuinzena(p.data) === targetQuinzena);
    
    let totalPenalidades = 0;
    const filiaisMap = {};
    const tiposMap = {};
    const motoristasMap = {};

    casosDaQuinzena.forEach(p => {
      const valor = p.valor || 0;
      totalPenalidades += valor;

      // Agrega Filial
      const filial = p.filial || 'Sem Filial';
      filiaisMap[filial] = (filiaisMap[filial] || 0) + valor;

      // Agrega Tipo
      const tipo = p.tipo || 'Desconhecido';
      tiposMap[tipo] = (tiposMap[tipo] || 0) + valor;

      // Agrega Motorista
      const motorista = p.motorista || 'Sem Motorista';
      const mKey = `${filial}:::${motorista}`;
      if (!motoristasMap[mKey]) motoristasMap[mKey] = { filial, motorista, valor: 0 };
      motoristasMap[mKey].valor += valor;
    });

    // Ranking Top 5 Filiais
    const topFiliais = Object.entries(filiaisMap)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // Ranking Top 3 Tipos
    const topTipos = Object.entries(tiposMap)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 3);

    // Ranking Top 10 Motoristas
    const topMotoristas = Object.values(motoristasMap)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    // 6. Montar Template HTML
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
          Relatório de Penalidades - DashOp
        </h2>
        <p><strong>Quinzena Analisada:</strong> <span style="color: #3b82f6; font-weight: bold;">${targetQuinzena}</span></p>
        <p><strong>Total de Descontos:</strong> <span style="color: #ef4444; font-size: 18px; font-weight: bold;">${formatCurrency(totalPenalidades)}</span></p>
        
        <h3 style="color: #0f172a; margin-top: 30px;">🚨 Top 5 Filiais Ofensoras</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Filial</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #cbd5e1;">Valor Cobrado</th>
          </tr>
          ${topFiliais.map(f => `
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${f.nome}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #cbd5e1; color: #ef4444;">${formatCurrency(f.valor)}</td>
            </tr>
          `).join('')}
        </table>

        <h3 style="color: #0f172a; margin-top: 30px;">⚠️ Principais Ofensores por Tipo</h3>
        <ul>
          ${topTipos.map(t => `
            <li style="margin-bottom: 8px;"><strong>${t.nome}:</strong> <span style="color: #ef4444;">${formatCurrency(t.valor)}</span></li>
          `).join('')}
        </ul>

        <h3 style="color: #0f172a; margin-top: 30px;">🚚 Top 10 Motoristas Penalizados</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Motorista</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #cbd5e1;">Filial</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #cbd5e1;">Valor</th>
          </tr>
          ${topMotoristas.map(m => `
            <tr>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${m.motorista}</td>
              <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 12px; color: #64748b;">${m.filial}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #cbd5e1; color: #ef4444;">${formatCurrency(m.valor)}</td>
            </tr>
          `).join('')}
        </table>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          Este é um e-mail automático gerado pelo sistema DashOp. Não é necessário responder.
        </p>
      </div>
    `;

    // 7. Disparar o e-mail via Resend
    // Nota: O e-mail do remetente e do destinatário devem ser configurados no painel da Vercel.
    const sender = process.env.REPORT_SENDER || 'onboarding@resend.dev'; // Resend default for testing
    const recipient = process.env.REPORT_RECIPIENT || 'felipeau93@gmail.com'; // O e-mail de destino padrão
    
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
    }

    const emailResponse = await resend.emails.send({
      from: `DashOp Relatórios <${sender}>`,
      to: [recipient],
      subject: `🚨 Relatório de Penalidades - ${targetQuinzena}`,
      html: htmlBody
    });

    if (emailResponse.error) {
      throw new Error(emailResponse.error.message);
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Relatório enviado com sucesso!',
      quinzena: targetQuinzena,
      emailId: emailResponse.data.id
    });

  } catch (error) {
    console.error('Erro na cron:', error);
    return res.status(500).json({ error: error.message });
  }
}
