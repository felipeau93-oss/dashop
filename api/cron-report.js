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
    const motoristasMap = {};

    casosDaQuinzena.forEach(p => {
      const valor = p.valor || 0;
      totalPenalidades += valor;

      const motorista = p.motorista || 'Sem Motorista';
      const mKey = `${p.filial || 'Sem Filial'}:::${motorista}`;
      
      if (!motoristasMap[mKey]) {
        motoristasMap[mKey] = { 
          filial: p.filial || 'Sem Filial', 
          motorista, 
          valorTotal: 0, 
          ocorrencias: [] 
        };
      }
      
      motoristasMap[mKey].valorTotal += valor;
      motoristasMap[mKey].ocorrencias.push({
        id_pacote: p.id_pacote,
        id_rota: p.id_rota,
        tipo: p.tipo || 'Desconhecido',
        valor
      });
    });

    // Pega os Top 20 piores motoristas (para evitar que o e-mail fique muito pesado e seja cortado pelo Gmail)
    const topMotoristas = Object.values(motoristasMap)
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 20);

    // 6. Montar Template HTML
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
          Relatório de Penalidades - DashOp
        </h2>
        <p><strong>Quinzena Analisada:</strong> <span style="color: #3b82f6; font-weight: bold;">${targetQuinzena}</span></p>
        <p><strong>Total de Descontos:</strong> <span style="color: #ef4444; font-size: 18px; font-weight: bold;">${formatCurrency(totalPenalidades)}</span></p>
        
        <h3 style="color: #0f172a; margin-top: 30px;">🚚 Detalhamento por Motorista (Top 20)</h3>
        
        ${topMotoristas.map(m => `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">
              <div>
                <h4 style="margin: 0; color: #1e293b; font-size: 16px;">${m.motorista}</h4>
                <span style="font-size: 12px; color: #64748b;">Filial: ${m.filial}</span>
              </div>
              <div style="font-size: 16px; font-weight: bold; color: #ef4444;">
                ${formatCurrency(m.valorTotal)}
              </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              ${m.ocorrencias.map(o => {
                const isRota = o.tipo === 'Not Visited';
                const label = isRota ? 'Rota' : 'Pacote';
                const idVal = isRota ? (o.id_rota || '-') : (o.id_pacote || '-');
                
                let linkUrl = '#';
                if (idVal !== '-') {
                  if (isRota) {
                    linkUrl = \`https://envios.mercadolivre.com.br/monitoring-distribution/detail/\${idVal}\`;
                  } else {
                    linkUrl = \`https://envios.mercadolivre.com.br/package-management/package/\${idVal}\`;
                  }
                }
                
                const linkHTML = idVal !== '-' 
                  ? \`<a href="\${linkUrl}" target="_blank" style="color: #3b82f6; text-decoration: underline; font-family: monospace;">\${idVal}</a>\`
                  : '-';
                  
                const valorHTML = isRota 
                  ? \`<span style="color: #94a3b8;">-</span>\`
                  : \`<span style="color: #ef4444; font-weight: bold;">\${formatCurrency(o.valor)}</span>\`;

                return \`
                  <tr>
                    <td style="padding: 4px 0; color: #475569; width: 60%;">\${label}: \${linkHTML}</td>
                    <td style="padding: 4px 0; text-align: right; width: 40%;">\${valorHTML}</td>
                  </tr>
                \`;
              }).join('')}
            </table>
          </div>
        `).join('')}

        <div style="text-align: center; margin-top: 40px; margin-bottom: 20px;">
          <a href="https://dashop-eight.vercel.app/?view=operacao" 
             style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px;">
            Acessar Painel Operacional Simplificado
          </a>
        </div>

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
