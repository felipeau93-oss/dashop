<USER_REQUEST>
Quero que você substitua o Simulador atual por este novo:

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Calculator, Database, Plus, Trash2, MapPin, 
  CalendarClock, TrendingUp, TrendingDown, 
  LayoutDashboard, Loader2, AlertCircle,
  History, Save, CheckCircle2, ChevronDown, ChevronUp, Percent,
  BadgeDollarSign, Truck, Target, RotateCcw, BarChart3, UserMinus
} from 'lucide-react';

export default function App() {
  // Estado para os inputs globais
  const [quinzena, setQuinzena] = useState('');
  const [filial, setFilial] = useState('SPR1');
  const [percentualImposto, setPercentualImposto] = useState(0);
  const [agregadoExcluido, setAgregadoExcluido] = useState('ESPINDOLA');
  const [activeTab, setActiveTab] = useState('calculadora');

  // Estados Globais do Painel de Margem
  const [modoMargemGlobal, setModoMargemGlobal] = useState('atual');
  const [margemDesejadaGlobal, setMargemDesejadaGlobal] = useState('');

  // Estado para a base de dados única do Google Sheets
  const [dadosPlanilhaRaw, setDadosPlanilhaRaw] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estrutura de Cenários (Categoria + Dia da Semana)
  const [cenarios, setCenarios] = useState([]);

  // Busca os dados diretamente do Google Sheets
  useEffect(() => {
    const fetchPlanilha = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Link fornecido da planilha mestre com TODAS as colunas juntas
        const url = "https://docs.google.com/spreadsheets/d/1wV2aLuLW93nCu7z065NCJkVaSJajDNxapCymcxTtMQk/export?format=tsv&gid=405309182";
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Não foi possível acessar a planilha. Verifique se o link está público.");
        
        const text = await response.text();
        const lines = text.trim().split('\n');

        let headerIdx = lines.findIndex(l => l.toLowerCase().inclu
<truncated 45023 bytes>
                        <div className="mb-3 pb-3 border-b border-white/10 w-full">
                            <span className="text-xs font-medium text-indigo-200 block mb-1">
                              {isNova ? `Filial a ${margemDesejadaGlobal}% representará:` : `Lucro Original da Filial representa:`}
                            </span>
                            <span className="text-2xl font-bold text-emerald-400">
                              {isNova ? formatCurrency(resumoGlobalFilial.lucroAlvoR$) : formatCurrency(resumoGlobalFilial.resultadoReal)}
                            </span>
                          </div>
                          
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block mb-2">
                            Para fechar a conta da Filial, adicione:
                          </span>
                          <div className="flex items-center justify-center gap-2 text-white">
                            <Truck className="w-6 h-6 text-indigo-300" />
                            <span className="text-4xl font-black">+{rotasExtras}</span>
                          </div>
                          <span className="text-xs font-semibold text-indigo-300 mt-1 block">Veículos Extras Simulados</span>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-06-08T20:35:51-03:00.

The user's current state is as follows:
Active Document: c:\Users\felip\OneDrive\Desktop\Antigravity Projects\App.jsx.tsx (LANGUAGE_TSX)
Cursor is on line: 1
Other open documents:
- c:\Users\felip\OneDrive\Desktop\Antigravity Projects\App.jsx.tsx (LANGUAGE_TSX)
Browser State:
  Page 0C9771E3DA7E683919B2CC292CBB462B (temp-vite) - http://localhost:5173/ [ACTIVE]
    Viewport: 929x917, Page Height: 917
</ADDITIONAL_METADATA>