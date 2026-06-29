import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const parseCSVLine = (line, delimiter) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const formatQtd = (value) => value === undefined || value === null ? 0 : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(value));
export const formatDS = (value) => value === undefined || value === null ? '0%' : (Number(value.toFixed(2)) + '%');
export const normalizeText = (str) => String(str).trim().toUpperCase();
export const normalizeHeader = (str) => (!str ? '' : str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim());

export const formatDiaSemana = (val) => {
  if (!val) return 'N/A';
  const str = String(val).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a') return 'N/A';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const normalizeQuinzena = (val) => {
  if (!val) return 'N/A';
  const cleanVal = String(val).trim();
  if (/^\d{4}\d{2}Q[12]$/i.test(cleanVal)) return cleanVal.toUpperCase();
  const dateMatchBR = cleanVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatchBR) {
    const day = parseInt(dateMatchBR[1], 10);
    const month = parseInt(dateMatchBR[2], 10).toString().padStart(2, '0');
    let year = parseInt(dateMatchBR[3], 10);
    if (year < 100) year += 2000;
    return `${year}${month}${day <= 15 ? 'Q1' : 'Q2'}`;
  }
  const dateMatchUS = cleanVal.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatchUS) {
    const year = parseInt(dateMatchUS[1], 10);
    const month = parseInt(dateMatchUS[2], 10).toString().padStart(2, '0');
    return `${year}${month}${parseInt(dateMatchUS[3], 10) <= 15 ? 'Q1' : 'Q2'}`;
  }
  return cleanVal;
};

export const extractRegional = (val) => {
  if (!val) return 'N/A';
  const str = String(val).trim();
  const numMatch = str.match(/\b([1-5])\b/);
  if (numMatch) return numMatch[1];
  const fallbackMatch = str.match(/[1-5]/);
  return fallbackMatch ? fallbackMatch[0] : str;
};

export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src; script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
};

export const verificarAcesso = () => {
  return true; // Senha desabilitada permanentemente
};

export const parseNumber = (val) => {
  if (!val) return 0;
  return parseFloat(val.replace(/R\$\s?/g, '').replace(/"/g, '').replace(/\./g, '').replace(',', '.')) || 0;
};
