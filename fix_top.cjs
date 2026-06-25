const fs = require('fs');
let c = fs.readFileSync('src/DataImporter.jsx', 'utf8');

const correctTop = `import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Database, Box, DollarSign, History, Calendar, LayoutList, Truck, Trash2, EyeOff, Copy } from 'lucide-react';
import { supabase } from './supabase';

const ANO_REFERENCIA = 2026;

const getInicioDaSemana = (dataString) => {
  const [dia, mes] = dataString.split('/');
  const data = new Date(ANO_REFERENCIA, parseInt(mes) - 1, parseInt(dia));
  const diaDaSemana = data.getDay();
  const diferenca = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
  const inicioSemana = new Date(data);
  inicioSemana.setDate(data.getDate() + diferenca);
  
  const d = String(inicioSemana.getDate()).padStart(2, '0');
  const m = String(inicioSemana.getMonth() + 1).padStart(2, '0');
  return \`\${d}/\${m}\`;
};

export default function DataImporter({ onImportOperacional, onImportBilling, onImportCapCar, onImportOperacionalBSC, rawFaturamentoData = [], rawOperacionalData = [], mapeamentoFiliais = [] }) {\n`;

const brokenStart = `  const [logs, setLogs] = useState([]);`;

const idx = c.indexOf(brokenStart);
if (idx !== -1) {
  c = correctTop + c.substring(idx);
  fs.writeFileSync('src/DataImporter.jsx', c);
  console.log('Fixed top of file successfully!');
} else {
  console.log('Could not find anchor to fix top of file.');
}
