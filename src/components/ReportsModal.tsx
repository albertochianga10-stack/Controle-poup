import { useState, useMemo } from 'react';
import { Transaction, Goal, Category, State } from '../types';
import { 
  formatCurrency, 
  formatDateString, 
  getCategoryLabel, 
  getCategoryIcon, 
  exportCSV, 
  exportBackup 
} from '../utils';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  CheckCircle, 
  X, 
  Printer 
} from 'lucide-react';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: State;
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
}

export default function ReportsModal({ isOpen, onClose, state, currency }: ReportsModalProps) {
  const { transactions, goals, customCategories } = state;
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('monthly');
  
  // Daily Report Date Picker state (Default to 2026-06-26)
  const [selectedDay, setSelectedDay] = useState('2026-06-26');
  
  // Monthly Report Date Picker state (Default to June 2026)
  const [selectedMonth, setSelectedMonth] = useState('2026-06');

  if (!isOpen) return null;

  // 1. CALCULATE DAILY STATISTICS
  const dailyReportData = useMemo(() => {
    const dayTransactions = transactions.filter(t => t.date === selectedDay);
    const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Average daily amount overall
    const uniqueDays = Array.from(new Set(transactions.map(t => t.date)));
    const totalAll = transactions.reduce((sum, t) => sum + t.amount, 0);
    const dailyAverage = uniqueDays.length > 0 ? totalAll / uniqueDays.length : 0;
    
    const percentageOfAverage = dailyAverage > 0 ? (dayTotal / dailyAverage) * 100 : 0;

    return {
      transactions: dayTransactions,
      total: dayTotal,
      average: dailyAverage,
      percentageOfAverage,
      isAboveAverage: dayTotal >= dailyAverage
    };
  }, [transactions, selectedDay]);

  // 2. CALCULATE MONTHLY STATISTICS
  const monthlyReportData = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const targetYear = parseInt(yearStr, 10);
    const targetMonth = parseInt(monthStr, 10) - 1; // 0-indexed

    // Current selected month transactions
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      return tDate.getFullYear() === targetYear && tDate.getMonth() === targetMonth;
    });

    const totalSaved = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const depositCount = monthTransactions.length;

    // Previous month comparison
    const prevMonthDate = new Date(targetYear, targetMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const prevMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      return tDate.getFullYear() === prevYear && tDate.getMonth() === prevMonth;
    });

    const prevMonthTotal = prevMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    const difference = totalSaved - prevMonthTotal;
    const pctDifference = prevMonthTotal > 0 ? (difference / prevMonthTotal) * 100 : 0;

    // Breakdown by Category
    const categoryBreakdown: { [key: string]: { amount: number; count: number } } = {};
    monthTransactions.forEach(t => {
      if (!categoryBreakdown[t.categoryId]) {
        categoryBreakdown[t.categoryId] = { amount: 0, count: 0 };
      }
      categoryBreakdown[t.categoryId].amount += t.amount;
      categoryBreakdown[t.categoryId].count += 1;
    });

    // Metas associated progress
    const activeGoalsCompletedThisMonth = goals.filter(g => {
      if (g.status !== 'completed') return false;
      // check if deadline is in selected month
      return g.deadline.startsWith(selectedMonth);
    });

    return {
      transactions: monthTransactions,
      totalSaved,
      depositCount,
      prevMonthTotal,
      pctDifference,
      difference,
      isIncrease: difference >= 0,
      categoryBreakdown: Object.entries(categoryBreakdown).map(([id, stats]) => ({
        id,
        label: getCategoryLabel(id, customCategories),
        icon: getCategoryIcon(id, customCategories),
        amount: stats.amount,
        count: stats.count,
        pctOfTotal: totalSaved > 0 ? (stats.amount / totalSaved) * 100 : 0
      })).sort((a, b) => b.amount - a.amount),
      goalsCompletedCount: activeGoalsCompletedThisMonth.length
    };
  }, [transactions, goals, selectedMonth, customCategories]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in print:bg-white print:p-0">
      {/* Container Card */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-float flex flex-col gap-5 max-h-[90vh] overflow-y-auto print:border-none print:shadow-none print:bg-white print:text-slate-900 print:max-h-none print:w-full">
        
        {/* Header (Hide on print) */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800/60 print:hidden">
          <h3 className="text-lg font-bold font-display text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Relatórios de Diagnóstico
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-xl bg-slate-800/40 cursor-pointer"
              title="Imprimir Relatório"
            >
              <Printer className="w-4.5 h-4.5" />
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Diagnostic controls (Hide on print) */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 bg-slate-950/30 p-3 rounded-2xl border border-slate-800/40 print:hidden">
          {/* Report switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl">
            <button
              onClick={() => setReportType('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${reportType === 'monthly' ? 'bg-indigo-600 text-slate-50 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setReportType('daily')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${reportType === 'daily' ? 'bg-indigo-600 text-slate-50 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Diário
            </button>
          </div>

          {/* Date selector based on report switcher */}
          {reportType === 'daily' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Selecione o Dia:</span>
              <input 
                type="date"
                value={selectedDay}
                max="2026-12-31"
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 cursor-pointer outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Selecione o Mês:</span>
              <input 
                type="month"
                value={selectedMonth}
                max="2026-12"
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 cursor-pointer outline-none"
              />
            </div>
          )}
        </div>

        {/* ── PRINT-ONLY LOGO HEADER ── */}
        <div className="hidden print:flex flex-col items-center justify-center text-center pb-6 border-b border-slate-200 mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">SmartSave Pro</h1>
          <p className="text-xs text-slate-500 font-medium">Relatório Oficial de Poupança Mensal</p>
          <p className="text-[10px] text-slate-400">Gerado em {new Date().toLocaleString()}</p>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* REPORT TEMPLATE: DAILY */}
        {/* ────────────────────────────────────────────────────────── */}
        {reportType === 'daily' ? (
          <div className="flex flex-col gap-5 print:text-slate-900">
            {/* Title / Diagnostic Date */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                Relatório de Poupança Diária
              </h4>
              <p className="text-2xl font-extrabold font-display text-slate-100 print:text-slate-950 mt-1">
                {formatDateString(selectedDay)}
              </p>
            </div>

            {/* KPI Summary Rows */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 print:bg-slate-50 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                  Total Poupado no Dia
                </span>
                <span className="text-xl font-extrabold text-emerald-400 print:text-emerald-700 font-mono font-tabular">
                  {formatCurrency(dailyReportData.total, currency)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 print:bg-slate-50 print:border-slate-200">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                  Média Diária Geral
                </span>
                <span className="text-xl font-extrabold text-slate-200 print:text-slate-800 font-mono font-tabular">
                  {formatCurrency(dailyReportData.average, currency)}
                </span>
              </div>
            </div>

            {/* Comparison diagnostic card */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${dailyReportData.isAboveAverage ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 print:bg-emerald-50 print:border-emerald-200 print:text-emerald-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-300 print:bg-amber-50 print:border-amber-200 print:text-amber-800'}`}>
              <div className="text-2xl">{dailyReportData.isAboveAverage ? '📈' : '📉'}</div>
              <div className="text-xs">
                {dailyReportData.isAboveAverage ? (
                  <p>
                    Sua economia hoje está <strong className="font-bold font-mono">{dailyReportData.percentageOfAverage.toFixed(0)}%</strong> <strong>acima</strong> de sua média diária geral de depósitos! Excelente ritmo.
                  </p>
                ) : (
                  <p>
                    Sua economia hoje está <strong className="font-bold font-mono">{dailyReportData.percentageOfAverage.toFixed(0)}%</strong> de sua média diária. Que tal poupar um pouquinho hoje?
                  </p>
                )}
              </div>
            </div>

            {/* Deposits List for the Day */}
            <div className="flex flex-col gap-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                Depósitos Efetuados ({dailyReportData.transactions.length})
              </h5>
              
              {dailyReportData.transactions.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-6 bg-slate-950/10 rounded-xl border border-dashed border-slate-800 print:border-slate-200 print:text-slate-400">
                  Nenhuma poupança registrada nesta data.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {dailyReportData.transactions.map(t => (
                    <div 
                      key={t.id}
                      className="flex justify-between items-center p-3 rounded-xl bg-slate-950/25 border border-slate-850 print:bg-slate-50 print:border-slate-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg bg-slate-800 p-1.5 rounded-lg shrink-0 print:bg-slate-200">
                          {getCategoryIcon(t.categoryId, customCategories)}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-200 print:text-slate-800">{t.description}</p>
                          <span className="text-[10px] text-slate-400 print:text-slate-500">
                            {getCategoryLabel(t.categoryId, customCategories)} {t.notes ? `• ${t.notes}` : ''}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-emerald-400 print:text-emerald-700">
                        +{formatCurrency(t.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ────────────────────────────────────────────────────────── */
          /* REPORT TEMPLATE: MONTHLY */
          /* ────────────────────────────────────────────────────────── */
          <div className="flex flex-col gap-5 print:text-slate-900">
            {/* Title / Diagnostic Month */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                Relatório de Poupança Mensal
              </h4>
              <p className="text-2xl font-extrabold font-display text-slate-100 print:text-slate-950 mt-1">
                {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
              </p>
            </div>

            {/* KPI Summary Block */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 print:bg-slate-50 print:border-slate-200 text-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Total Economizado
                </span>
                <span className="text-sm sm:text-base font-extrabold text-[#00D4AA] print:text-emerald-700 font-mono font-tabular">
                  {formatCurrency(monthlyReportData.totalSaved, currency)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 print:bg-slate-50 print:border-slate-200 text-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Quantidade Depósitos
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-200 print:text-slate-800 font-mono font-tabular">
                  {monthlyReportData.depositCount}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 print:bg-slate-50 print:border-slate-200 text-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Metas Concluídas
                </span>
                <span className="text-sm sm:text-base font-extrabold text-indigo-400 print:text-indigo-700 font-mono font-tabular">
                  {monthlyReportData.goalsCompletedCount}
                </span>
              </div>
            </div>

            {/* Comparative analysis description */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${monthlyReportData.isIncrease ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 print:bg-emerald-50 print:border-emerald-200 print:text-emerald-800' : 'bg-rose-500/10 border-rose-500/20 text-rose-300 print:bg-rose-50 print:border-rose-200 print:text-rose-800'}`}>
              <div className="text-2xl">{monthlyReportData.isIncrease ? '🚀' : '⚠️'}</div>
              <div className="text-xs">
                {monthlyReportData.isIncrease ? (
                  <p>
                    Excelente progresso! Você poupou <strong className="font-bold font-mono">+{formatCurrency(monthlyReportData.difference, currency)}</strong> a mais do que no mês anterior (alta de <strong className="font-bold font-mono">+{monthlyReportData.pctDifference.toFixed(1)}%</strong>). Continue assim!
                  </p>
                ) : (
                  <p>
                    Atenção: Você economizou <strong className="font-bold font-mono">-{formatCurrency(Math.abs(monthlyReportData.difference), currency)}</strong> a menos do que no mês anterior (baixa de <strong className="font-bold font-mono">{monthlyReportData.pctDifference.toFixed(1)}%</strong>). Veja onde é possível reajustar.
                  </p>
                )}
              </div>
            </div>

            {/* Breakdown by Category list table */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 print:text-slate-500">
                <PieIcon className="w-3.5 h-3.5" /> Distribuição das Poupanças por Categoria
              </span>

              {monthlyReportData.categoryBreakdown.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-6 bg-slate-950/10 rounded-xl border border-dashed border-slate-800 print:border-slate-200">
                  Nenhuma transação efetuada neste mês.
                </div>
              ) : (
                <div className="flex flex-col gap-2 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/60 print:bg-transparent print:border-slate-200 print:p-0">
                  <div className="grid grid-cols-12 text-[10px] uppercase font-extrabold text-slate-500 px-2 pb-1.5 border-b border-slate-800/50 print:border-slate-200">
                    <div className="col-span-5">Categoria</div>
                    <div className="col-span-2 text-center">Depósitos</div>
                    <div className="col-span-2 text-right">Partic. (%)</div>
                    <div className="col-span-3 text-right">Total Poupado</div>
                  </div>

                  {monthlyReportData.categoryBreakdown.map(item => (
                    <div 
                      key={item.id}
                      className="grid grid-cols-12 items-center text-xs px-2 py-2 border-b border-slate-900/40 last:border-0 print:border-slate-100"
                    >
                      <div className="col-span-5 flex items-center gap-1.5 font-semibold text-slate-200 print:text-slate-800">
                        <span>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <div className="col-span-2 text-center text-slate-400 print:text-slate-600 font-mono">{item.count}</div>
                      <div className="col-span-2 text-right text-indigo-400 print:text-indigo-600 font-bold font-mono">{item.pctOfTotal.toFixed(1)}%</div>
                      <div className="col-span-3 text-right text-slate-100 print:text-slate-950 font-bold font-mono">
                        {formatCurrency(item.amount, currency).split(',')[0]}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* EXPORTS / FILE MANAGEMENT CONTROLS */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 border-t border-slate-800/80 pt-4 print:hidden">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Exportar Dados do Aplicativo
          </span>
          <div className="grid grid-cols-2 gap-3.5">
            <button
              onClick={() => exportCSV(transactions, customCategories, currency)}
              className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-200 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Exportar Planilha (CSV)
            </button>
            <button
              onClick={() => exportBackup(state)}
              className="flex items-center justify-center gap-2 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-200 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-400" /> Backup do Sistema (JSON)
            </button>
          </div>
        </div>

        {/* Closing (Hide on print) */}
        <div className="flex justify-end pt-2 border-t border-slate-800/50 print:hidden">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
}
