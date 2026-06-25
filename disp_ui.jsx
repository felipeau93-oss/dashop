198:     if (activeStep === 5) {
199:       fetchHistorico();
200:     } else if (activeStep === 6) {
201:       loadPendentes();
202:     }
203:   }, [activeStep]);
204: 
205:   const addLog = (msg, type = 'info') => {
300:         }
301:       }
302: 
303:       if (headerRowIdx === -1) {
304:         addLog('Erro: Colunas ROTA e FILIAL não encontradas.', 'error');
305:         setIsProcessingOp(false);
306:         return;
307:       }
308:       if (isOpMulti && quinzenaColIdx === -1) {
309:         addLog('Erro: Coluna QUINZENA não encontrada no modo Multi-Quinzena.', 'error');
310:         setIsProcessingOp(false);
311:         return;
312:       }
313: 
314:       const configMap = {};
315:       mapeamentoFiliais.forEach(m => configMap[String(m.filial).toUpperCase()] = m);
316: 
317:       const mapInsucessosOp = {
318:         'QTD BLOQUEADO': 'Bloqueado', 'QTD BLOQUEADO POR PALAVRA': 'Palavra Chave', 'QTD CANCELADO': 'Cancelado',
319:         'QTD COLETADO': 'Coleta', 'QTD COMÉRCIO FECHADO': 'Comercial', 'QTD COMPRADOR REJEITOU': 'Recusa',
320:         'QTD DANIFICADO': 'Avaria', 'QTD DESTINATÁRIO MUDOU': 'Mudou Endereco', 'QTD ENDEREÇO INACESSÍVEL': 'Area Inacessivel',
321:         'QTD ENDEREÇO NÃO VISITADO': 'Nao Visitado', 'QTD ENDEREÇO RUIM': 'Nao Localizado', 'QTD FALTANDO': 'Faltante',
322:         'QTD FORA DE ROTA': 'Fora de Rota', 'QTD NINGUÉM PRA RECEBER': 'Cliente Ausente', 'QTD TENTATIVA DE ROUBO': 'Tentativa Roubo',
323:         'BLOQUEADO': 'Bloqueado', 'PALAVRA CHAVE': 'Palavra Chave', 'CANCELADO': 'Cancelado', 'COLETA': 'Coleta',
324:         'COMERCIAL': 'Comercial', 'RECUSA': 'Recusa', 'AVARIA': 'Avaria', 'MUDOU ENDERECO': 'Mudou Endereco',
325:         'AREA INACESSIVEL': 'Area Inacessivel', 'NAO VISITADO': 'Nao Visitado', 'NAO LOCALIZADO': 'Nao Localizado',
326:         'FALTANTE': 'Faltante', 'FORA DE ROTA': 'Fora de Rota', 'CLIENTE AUSENTE': 'Cliente Ausente', 'TENTATIVA ROUBO': 'Tentativa Roubo'
327:       };
328: 
329:       const row = dataArray[headerRowIdx];
330:       const rawHeadersOp = row.map(h => String(h || '').trim());
331:       let insucessosHeaders = [];
332:       const normalizeText = (text) => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
333: 
334:       for (let j = 0; j < row.length; j++) {
335:         const colName = normalizeText(row[j]);
336:         if (mapInsucessosOp[colName]) insucessosHeaders.push({ index: j, name: mapInsucessosOp[colName] });
337:       }
338: 
339:       if (insucessosHeaders.length === 0 && insucessosColIdx !== -1) {
340:         for (let j = insucessosColIdx + 1; j < row.length; j++) {
341:           if (row[j] && String(row[j]).trim() !== '') insucessosHeaders.push({ index: j, name: String(row[j]).trim() });
342:         }
343:       }
344: 
345:       const invalidOpKeys = ['% evid micro', '% evid distância', 'não rateadas', 'contar % entregue', '% evidenciado', '% entregue', 'km percorrido', 'paradas com adicional', 'total da taxa de entrega', 'volume'];
346:       insucessosHeaders = insucessosHeaders.filter(h => !invalidOpKeys.some(inv => h.name.toLowerCase().includes(inv)));
347: 
348:       const newOperacionalData = [];
349:       setProgressOp('Compilando registros...');
350: 
351:       for (let i = headerRowIdx + 1; i < dataArray.length; i++) {
352:         const r = dataArray[i];
353:         if (!r) continue;
354:         const rota = String(r[rotaColIdx] || '').trim();
355:         const filial = String(r[xptColIdx] || '').trim();
356: 
357:         if (rota && filial && filial !== 'N/A') {
358:           const fKey = filial.toUpperCase();
359:           const config = configMap[fKey] || {};
360:           
361:           const saldo = saldoColIdx !== -1 ? (parseFloat(r[saldoColIdx]) || 0) : 0;
362:           const entregues = entreguesColIdx !== -1 ? (parseFloat(r[entreguesColIdx]) || 0) : 0;
363:           const driverId = driverIdColIdx !== -1 ? String(r[driverIdColIdx]).trim() : '';
364:           const motorista = motoristaColIdx !== -1 ? String(r[motoristaColIdx]).trim() : 'N/A';
365: 
366:           const dados_originais = {};
367:           rawHeadersOp.forEach((h, idx) => { if (h) dados_originais[h] = r[idx]; });
368: 
369:           const insucessosDetalhados = {};
370:           insucessosHeaders.forEach(h => {
371:             const v = parseFloat(r[h.index]) || 0;
372:             if (v > 0) insucessosDetalhados[h.name] = v;
373:           });
374: 
375:           const rawQuinzena = isOpMulti && quinzenaColIdx !== -1 ? String(r[quinzenaColIdx] || '').trim().toUpperCase() : quinzenaOp.trim();
376:           if (isOpMulti && !rawQuinzena) continue;
377: 
378:           newOperacionalData.push({
379:             id_rota: rota,
380:             filial,
381:             regional: config.regional |
414:           await supabase.rpc('rpc_refresh_materialized_views');
415:         } catch(e) { console.error("Aviso: Falha ao atualizar Materialized Views.", e); }
416: 
417:         if (onImportOperacional) await onImportOperacional(newOperacionalData); // Optional trigger refresh
418: 
419:         const qTotal = Object.keys(grouped).length > 0 ? Object.keys(grouped)[0] : 'GERAL';
420:         await registrarImportacao('Operacional', isOpMulti ? 'Multi-Quinzena' : quinzenaOp.trim(), newOperacionalData.length);
421: 
422:         addLog('Salvo no Supabase com sucesso!', 'success');
423:         setBaseFile(null);
424:         setQuinzenaOp('');
425:         setIsOpMulti(false);
426:         setProgressOp('Concluído!');
427:         setTimeout(() => setIsProcessingOp(false), 2000);
428:       } catch (err) {
429:         addLog(`Erro ao salvar dados: ${err.message}`, 'error');
430:         setProgressOp(`Erro: ${err.message}`);
431:         setIsProcessingOp(false);
432:       }
433:     };
