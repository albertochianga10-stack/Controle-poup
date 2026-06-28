import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  State, 
  Transaction, 
  Goal, 
  Category, 
  Toast, 
  HistoryFilters 
} from './types';
import { 
  getSeededInitialState, 
  DEFAULT_CATEGORIES, 
  formatCurrency, 
  getCategoryColor, 
  getCategoryIcon, 
  getCategoryLabel, 
  validateBackupSchema,
  formatDateString,
  getRelativeTime
} from './utils';
import { 
  Home as HomeIcon, 
  Target as TargetIcon, 
  Plus, 
  History as HistoryIcon, 
  Sliders as PanelIcon, 
  Moon, 
  Sun, 
  Search, 
  Filter, 
  Calendar, 
  Award, 
  Flame, 
  Trash2, 
  Upload, 
  Info, 
  Settings as SettingsIcon, 
  FileSpreadsheet, 
  PlusCircle, 
  User, 
  CheckCircle2, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';

// Subcomponents
import ToastContainer from './components/ToastContainer';
import SVGProgressRing from './components/SVGProgressRing';
import { 
  AreaEvolutionChart, 
  MonthlyComparisonChart, 
  CategoryDonutChart, 
  GoalLinesChart, 
  CategoriesHorizontalChart 
} from './components/DashboardCharts';
import SavingsForm from './components/SavingsForm';
import GoalForm from './components/GoalForm';
import FilterDrawer from './components/FilterDrawer';
import ReportsModal from './components/ReportsModal';

const LOCAL_STORAGE_KEY = 'smartsave_pro_state';

export default function App() {
  // ── STATE INITIALIZATION ──────────────────────────────────────────────────
  const [state, setState] = useState<State>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.transactions && parsed.goals && parsed.settings) {
          return parsed;
        }
      } catch (err) {
        console.error('Falha ao restaurar dados salvos do localStorage', err);
      }
    }
    // Return seeded demo data on first load
    return getSeededInitialState();
  });

  // Toasts stack state (max 3)
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Navigation Active Tab state (home, goals, history, dashboard)
  const [activeTab, setActiveTab] = useState<'home' | 'goals' | 'history' | 'dashboard'>('home');

  // Popup Modals state
  const [isAddingSavings, setIsAddingSavings] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  
  // Settings confirmation modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmInput, setClearConfirmInput] = useState('');

  // Search input state (debounced)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchTimeoutRef = useRef<number | null>(null);

  // Scroll position state for virtualization inside History
  const [historyScrollTop, setHistoryScrollTop] = useState(0);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  // Selected sub-tab in Dashboard (charts / kpis / settings)
  const [dashboardSubTab, setDashboardSubTab] = useState<'charts' | 'kpis' | 'settings'>('charts');

  // Active chart index in Dashboard charts
  const [activeChartTab, setActiveChartTab] = useState<'evolution' | 'comparison' | 'category' | 'goals_prog' | 'ranking'>('evolution');

  // History filters state
  const [filters, setFilters] = useState<HistoryFilters>({
    searchQuery: '',
    startDate: '',
    endDate: '',
    selectedCategoryIds: [],
    minAmount: 0,
    maxAmount: 0,
    sortBy: 'date_desc'
  });

  // Synchronize state changes to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    
    // Auto toggle theme class on document element
    const isDark = state.settings.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [state]);

  // ── DEBOUNCE SEARCH INPUT ─────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
      setFilters(prev => ({ ...prev, searchQuery: searchInput }));
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput]);

  // ── TOAST DISPATCHER ──────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const newToast: Toast = {
      id: crypto.randomUUID(),
      message,
      type,
      duration: 3500
    };
    setToasts(prev => [...prev, newToast].slice(-3)); // limit queue to 3
  }, []);

  const handleRemoveToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── FINANCIAL ACTIONS ─────────────────────────────────────────────────────
  
  // Create / Save Deposit (Poupança)
  const handleSaveTransaction = useCallback((txData: Omit<Transaction, 'id'>, customCategoryName?: string) => {
    let finalCategoryId = txData.categoryId;
    let updatedCustomCats = [...state.customCategories];

    // If custom category was entered, generate custom category structure
    if (customCategoryName) {
      const existingCat = state.customCategories.find(
        c => c.label.toLowerCase() === customCategoryName.toLowerCase()
      );
      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const newCatId = `cat-${crypto.randomUUID()}`;
        const newCat: Category = {
          id: newCatId,
          label: customCategoryName,
          color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`, // random color
          icon: '✨'
        };
        updatedCustomCats.push(newCat);
        finalCategoryId = newCatId;
      }
    }

    const newTransaction: Transaction = {
      ...txData,
      categoryId: finalCategoryId,
      id: crypto.randomUUID()
    };

    // Calculate goals updates if transaction is associated with one
    let updatedGoals = state.goals.map(g => {
      if (g.id === txData.goalId) {
        const updatedCurrent = g.currentAmount + txData.amount;
        const isTargetReached = updatedCurrent >= g.targetAmount;
        return {
          ...g,
          currentAmount: updatedCurrent,
          status: isTargetReached ? ('completed' as const) : g.status
        };
      }
      return g;
    });

    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
      goals: updatedGoals,
      customCategories: updatedCustomCats
    }));

    setIsAddingSavings(false);
    showToast('Poupança registrada com sucesso!', 'success');
  }, [state, showToast]);

  // Create / Save Goal (Meta)
  const handleSaveGoal = useCallback((goalData: Omit<Goal, 'id' | 'currentAmount' | 'createdAt'>) => {
    if (editingGoal) {
      // Edit existing goal
      setState(prev => ({
        ...prev,
        goals: prev.goals.map(g => g.id === editingGoal.id ? {
          ...g,
          ...goalData
        } : g)
      }));
      setEditingGoal(null);
      showToast('Meta financeira atualizada!', 'success');
    } else {
      // Create new goal
      const newGoal: Goal = {
        ...goalData,
        id: `g-${crypto.randomUUID()}`,
        currentAmount: 0,
        createdAt: new Date('2026-06-28').toISOString().split('T')[0]
      };
      setState(prev => ({
        ...prev,
        goals: [newGoal, ...prev.goals]
      }));
      setIsAddingGoal(false);
      showToast('Nova meta financeira criada!', 'success');
    }
  }, [editingGoal, showToast]);

  const handleDeleteGoal = useCallback((goalId: string) => {
    // Unlink any transactions referencing this goal
    const updatedTransactions = state.transactions.map(t => {
      if (t.goalId === goalId) {
        return { ...t, goalId: undefined };
      }
      return t;
    });

    setState(prev => ({
      ...prev,
      transactions: updatedTransactions,
      goals: prev.goals.filter(g => g.id !== goalId)
    }));

    showToast('Meta excluída com sucesso.', 'info');
  }, [state.transactions, showToast]);

  // Delete transaction
  const handleDeleteTransaction = useCallback((txId: string) => {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;

    // Deduct amount from linked goal if appropriate
    let updatedGoals = state.goals;
    if (tx.goalId) {
      updatedGoals = state.goals.map(g => {
        if (g.id === tx.goalId) {
          const newCurrent = Math.max(0, g.currentAmount - tx.amount);
          return {
            ...g,
            currentAmount: newCurrent,
            status: g.status === 'completed' && newCurrent < g.targetAmount ? ('active' as const) : g.status
          };
        }
        return g;
      });
    }

    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== txId),
      goals: updatedGoals
    }));

    showToast('Depósito removido do histórico.', 'info');
  }, [state, showToast]);

  // Save general settings
  const handleUpdateSettings = useCallback((field: keyof typeof state.settings, value: any) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  }, []);

  // Complete clean system data
  const handleWipeData = useCallback(() => {
    if (clearConfirmInput === 'CONFIRMAR') {
      const emptyState: State = {
        transactions: [],
        goals: [],
        settings: {
          username: state.settings.username || 'Investidor',
          theme: state.settings.theme,
          currency: state.settings.currency,
          defaultMonthlyGoal: 1000000,
          dateFormat: state.settings.dateFormat
        },
        customCategories: []
      };
      setState(emptyState);
      setShowClearConfirm(false);
      setClearConfirmInput('');
      showToast('Todos os dados foram completamente limpos!', 'warning');
    } else {
      showToast('Código de confirmação incorreto.', 'error');
    }
  }, [clearConfirmInput, state.settings, showToast]);

  // Import JSON Backup state
  const handleImportBackup = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const { isValid, errorMsg, parsedState } = validateBackupSchema(json);
        
        if (isValid && parsedState) {
          setState(parsedState);
          showToast('Backup restaurado com sucesso!', 'success');
        } else {
          showToast(errorMsg || 'Erro na validação do backup.', 'error');
        }
      } catch (err) {
        showToast('Falha crítica ao ler o arquivo JSON de backup.', 'error');
      }
    };
    reader.readAsText(file);
    // clear input trigger
    event.target.value = '';
  }, [showToast]);

  // ── CALCULATE AGGREGATED STATISTICS ───────────────────────────────────────
  
  // Total saved overall
  const totalSavedAccumulated = useMemo(() => {
    return state.transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [state.transactions]);

  // Total saved this month (June 2026)
  const totalSavedCurrentMonth = useMemo(() => {
    const today = new Date('2026-06-28');
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    return state.transactions
      .filter(t => {
        const tDate = new Date(t.date + 'T00:00:00');
        return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [state.transactions]);

  // Largest deposit
  const largestDeposit = useMemo(() => {
    if (state.transactions.length === 0) return { amount: 0, date: '' };
    const maxTx = [...state.transactions].sort((a, b) => b.amount - a.amount)[0];
    return { amount: maxTx.amount, date: maxTx.date };
  }, [state.transactions]);

  // Smallest deposit
  const smallestDeposit = useMemo(() => {
    if (state.transactions.length === 0) return { amount: 0, date: '' };
    const minTx = [...state.transactions].sort((a, b) => a.amount - b.amount)[0];
    return { amount: minTx.amount, date: minTx.date };
  }, [state.transactions]);

  // Monthly average savings (past 12 months)
  const averageMonthlySavings = useMemo(() => {
    if (state.transactions.length === 0) return 0;
    
    const uniqueMonths = new Set(
      state.transactions.map(t => t.date.slice(0, 7)) // extract YYYY-MM
    );
    const monthsCount = Math.max(1, uniqueMonths.size);
    return totalSavedAccumulated / monthsCount;
  }, [state.transactions, totalSavedAccumulated]);

  // Savings streak consecutives (deposits in consecutive days)
  const savingsStreakDays = useMemo(() => {
    if (state.transactions.length === 0) return 0;
    
    // Sort unique transaction dates descending
    const sortedDates = (Array.from(new Set(state.transactions.map(t => t.date))) as string[])
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
    let streak = 0;
    const today = new Date('2026-06-28');
    const todayStr = '2026-06-28';
    
    // Check if the streak is broken (no deposit today or yesterday)
    const lastDepositDate = new Date(sortedDates[0] + 'T00:00:00');
    const diffTime = today.getTime() - lastDepositDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 1) {
      return 0; // Streak broken
    }
    
    // Count consecutive days
    streak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i] + 'T00:00:00');
      const next = new Date(sortedDates[i+1] + 'T00:00:00');
      const diff = (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diff === 1) {
        streak++;
      } else if (diff > 1) {
        break; // gap found
      }
    }
    return streak;
  }, [state.transactions]);

  // Best/Worst Month calculations
  const monthlyAggregates = useMemo(() => {
    const monthsMap: { [key: string]: number } = {};
    state.transactions.forEach(t => {
      const monthLabel = t.date.slice(0, 7); // YYYY-MM
      monthsMap[monthLabel] = (monthsMap[monthLabel] || 0) + t.amount;
    });
    
    const sorted = Object.entries(monthsMap).sort((a, b) => b[1] - a[1]);
    
    const monthNames: { [key: string]: string } = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril', '05': 'Maio', '06': 'Junho',
      '07': 'Julho', '08': 'Agosto', '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    
    const formatMonthKey = (key: string) => {
      const [yr, mo] = key.split('-');
      return `${monthNames[mo] || mo} ${yr}`;
    };

    return {
      bestMonth: sorted.length > 0 ? { label: formatMonthKey(sorted[0][0]), value: sorted[0][1] } : { label: 'Nenhum', value: 0 },
      worstMonth: sorted.length > 0 ? { label: formatMonthKey(sorted[sorted.length - 1][0]), value: sorted[sorted.length - 1][1] } : { label: 'Nenhum', value: 0 }
    };
  }, [state.transactions]);

  // Last transaction detailed card info
  const lastTransaction = useMemo(() => {
    return state.transactions[0] || null;
  }, [state.transactions]);

  // Top Category Leaderboard ranking list
  const categoryRankings = useMemo(() => {
    const map: { [key: string]: number } = {};
    state.transactions.forEach(t => {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });

    const list = Object.entries(map).map(([id, amount]) => {
      const percentage = totalSavedAccumulated > 0 ? (amount / totalSavedAccumulated) * 100 : 0;
      return {
        id,
        label: getCategoryLabel(id, state.customCategories),
        icon: getCategoryIcon(id, state.customCategories),
        color: getCategoryColor(id, state.customCategories),
        amount,
        percentage
      };
    }).sort((a, b) => b.amount - a.amount);

    return list;
  }, [state.transactions, state.customCategories, totalSavedAccumulated]);

  // ── FILTER HISTORY TRANSATIONS ────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let result = [...state.transactions];

    // Filter by Search Query (Description, notes, category)
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        getCategoryLabel(t.categoryId, state.customCategories).toLowerCase().includes(q)
      );
    }

    // Filter by dates
    if (filters.startDate) {
      result = result.filter(t => t.date >= filters.startDate);
    }
    if (filters.endDate) {
      result = result.filter(t => t.date <= filters.endDate);
    }

    // Filter by selected Categories list
    if (filters.selectedCategoryIds.length > 0) {
      result = result.filter(t => filters.selectedCategoryIds.includes(t.categoryId));
    }

    // Filter by limits of amounts
    if (filters.minAmount > 0) {
      result = result.filter(t => t.amount >= filters.minAmount);
    }
    if (filters.maxAmount > 0) {
      result = result.filter(t => t.amount <= filters.maxAmount);
    }

    // Sorting
    if (filters.sortBy === 'date_desc') {
      result.sort((a, b) => b.date.localeCompare(a.date));
    } else if (filters.sortBy === 'date_asc') {
      result.sort((a, b) => a.date.localeCompare(b.date));
    } else if (filters.sortBy === 'amount_desc') {
      result.sort((a, b) => b.amount - a.amount);
    } else if (filters.sortBy === 'amount_asc') {
      result.sort((a, b) => a.amount - b.amount);
    }

    return result;
  }, [state.transactions, filters, state.customCategories]);

  // Group transaction items by Month/Year header labels
  const groupedTransactionsByMonth = useMemo(() => {
    const groups: { [key: string]: { label: string; total: number; count: number; items: Transaction[] } } = {};
    
    filteredTransactions.forEach(t => {
      // Extract YYYY-MM
      const key = t.date.slice(0, 7);
      if (!groups[key]) {
        const [yr, mo] = key.split('-');
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const monthLabel = `${monthNames[parseInt(mo, 10) - 1]} ${yr}`;
        groups[key] = {
          label: monthLabel,
          total: 0,
          count: 0,
          items: []
        };
      }
      
      groups[key].total += t.amount;
      groups[key].count += 1;
      groups[key].items.push(t);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  // Flattened items list for scroll virtualization rendering list items
  const flattenedVirtualItems = useMemo(() => {
    const list: Array<{ type: 'header'; key: string; label: string; total: number; count: number } | { type: 'item'; transaction: Transaction }> = [];
    
    groupedTransactionsByMonth.forEach(([key, group]) => {
      list.push({
        type: 'header',
        key,
        label: group.label,
        total: group.total,
        count: group.count
      });
      group.items.forEach(t => {
        list.push({
          type: 'item',
          transaction: t
        });
      });
    });
    
    return list;
  }, [groupedTransactionsByMonth]);

  // Virtualized items calculations
  const ITEM_HEIGHT = 74; // Average pixels height per virtual list item
  const containerHeight = 450; // Visible scroll box viewport height
  const visibleStart = Math.floor(historyScrollTop / ITEM_HEIGHT);
  const visibleEnd = Math.min(visibleStart + Math.ceil(containerHeight / ITEM_HEIGHT) + 3, flattenedVirtualItems.length);
  const visibleVirtualItems = useMemo(() => {
    return flattenedVirtualItems.slice(visibleStart, visibleEnd);
  }, [flattenedVirtualItems, visibleStart, visibleEnd]);

  const handleHistoryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setHistoryScrollTop(e.currentTarget.scrollTop);
  };

  // Check how much a specific goal lacks to finish and daily required savings
  const calculateGoalMetrics = useCallback((g: Goal) => {
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    
    // Days remaining to target date
    const today = new Date('2026-06-28');
    const targetDate = new Date(g.deadline + 'T00:00:00');
    const diffTime = targetDate.getTime() - today.getTime();
    const remainingDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // Required savings per day to reach goals before deadline
    const dailyNeeded = remaining / remainingDays;

    // Percentage
    const percentage = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;

    return {
      remaining,
      remainingDays,
      dailyNeeded,
      percentage
    };
  }, []);

  return (
    <div className={`min-h-screen font-sans antialiased text-slate-100 transition-colors duration-300 ${state.settings.theme === 'dark' ? 'bg-[#0A0E1A]' : 'bg-[#FAFAFA]'}`}>
      
      {/* Dynamic Toast Alerts Container */}
      <ToastContainer toasts={toasts} onRemove={handleRemoveToast} />

      {/* ── TOP APP HEADER ─────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-30 px-5 py-4 border-b flex items-center justify-between backdrop-blur-md ${state.settings.theme === 'dark' ? 'bg-[#0A0E1A]/80 border-slate-800/40 text-slate-100' : 'bg-white/80 border-slate-200 text-slate-900 shadow-sm'}`}>
        <div className="flex items-center gap-2.5">
          {/* Logo visual badge */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-[#00D4AA] flex items-center justify-center shadow-md">
            <span className="text-slate-900 font-extrabold text-sm tracking-tighter">S+</span>
          </div>
          <div>
            <h1 className="text-sm font-black font-display tracking-tight leading-none">SmartSave Pro</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mt-0.5 block">
              Poupança Mensal
            </span>
          </div>
        </div>

        {/* User quick status & balance */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Saldo Acumulado
            </span>
            <span className="text-sm font-extrabold font-mono text-[#00D4AA]">
              {formatCurrency(totalSavedAccumulated, state.settings.currency)}
            </span>
          </div>

          <button
            onClick={() => {
              const nextTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
              handleUpdateSettings('theme', nextTheme);
              showToast(`Tema alterado para modo ${nextTheme === 'dark' ? 'escuro' : 'claro'}!`, 'info');
            }}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${state.settings.theme === 'dark' ? 'border-slate-800 hover:bg-slate-800/40 text-yellow-400' : 'border-slate-200 hover:bg-slate-100 text-slate-700 shadow-sm'}`}
          >
            {state.settings.theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      {/* ── CENTRALIZED CONTENT WRAPPER ────────────────────────────────────── */}
      <main className="max-w-[420px] mx-auto px-4 pt-6 pb-28 min-h-[calc(100vh-140px)]">
        
        {/* ────────────────────────────────────────────────────────────────── */}
        {/* TABS CONTROLLERS CONTENT PAGES */}
        {/* ────────────────────────────────────────────────────────────────── */}
        
        {/* TAB 1: HOME SCREEN */}
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* User Greeting Block */}
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-xs font-semibold ${state.settings.theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Bom dia,
                </p>
                <h2 className={`text-2xl font-extrabold font-display tracking-tight ${state.settings.theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                  {state.settings.username} 👋
                </h2>
              </div>
              <button
                onClick={() => setIsReportsOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/15 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Relatório
              </button>
            </div>

            {/* Monthly Visual Signature Progress Ring */}
            <SVGProgressRing 
              savedAmount={totalSavedCurrentMonth}
              goalAmount={state.settings.defaultMonthlyGoal}
              currency={state.settings.currency}
            />

            {/* Quick KPIs Grid 2x2 */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className={`p-4 rounded-2xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/60 border-slate-800/60' : 'bg-white border-slate-100 shadow-sm'}`}>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">
                  💰 Poupado este Mês
                </span>
                <span className={`text-base font-extrabold font-mono font-tabular ${state.settings.theme === 'dark' ? 'text-[#00D4AA]' : 'text-emerald-600'}`}>
                  {formatCurrency(totalSavedCurrentMonth, state.settings.currency).split(',')[0]}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Acumulado do mês atual</p>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/60 border-slate-800/60' : 'bg-white border-slate-100 shadow-sm'}`}>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">
                  🎯 Meta Mensal Alvo
                </span>
                <span className={`text-base font-extrabold font-mono font-tabular ${state.settings.theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                  {formatCurrency(state.settings.defaultMonthlyGoal, state.settings.currency).split(',')[0]}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Configurado nas preferências</p>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/60 border-slate-800/60' : 'bg-white border-slate-100 shadow-sm'}`}>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">
                  📅 Dias Restantes
                </span>
                <span className={`text-base font-extrabold font-mono font-tabular ${state.settings.theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {30 - new Date('2026-06-28').getDate()} dias
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Até o final de Junho 2026</p>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/60 border-slate-800/60' : 'bg-white border-slate-100 shadow-sm'}`}>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">
                  ⚡ Economia Consec.
                </span>
                <span className={`text-base font-extrabold font-mono font-tabular ${state.settings.theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
                  🔥 {savingsStreakDays} {savingsStreakDays === 1 ? 'dia' : 'dias'}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">Dias seguidos de depósitos</p>
              </div>
            </div>

            {/* Last Transaction Card detailed view */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${state.settings.theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Última Movimentação
                </h4>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  Ver histórico →
                </button>
              </div>

              {lastTransaction ? (
                <div 
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/50 border-slate-800/60 hover:bg-slate-800/30' : 'bg-white border-slate-100 shadow-sm hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${getCategoryColor(lastTransaction.categoryId, state.customCategories)}20` }}
                    >
                      <span className="text-2xl">
                        {getCategoryIcon(lastTransaction.categoryId, state.customCategories)}
                      </span>
                    </div>
                    <div className="overflow-hidden">
                      <p className={`text-sm font-bold truncate ${state.settings.theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        {lastTransaction.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase font-bold text-indigo-400">
                          {getCategoryLabel(lastTransaction.categoryId, state.customCategories)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          • {getRelativeTime(lastTransaction.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-base font-extrabold font-mono text-emerald-400 dark:text-emerald-400">
                      +{formatCurrency(lastTransaction.amount, state.settings.currency).split(',')[0]}
                    </span>
                    {lastTransaction.goalId && (
                      <span className="block text-[8px] uppercase tracking-wider font-bold text-indigo-400 mt-0.5">
                        🎯 Meta Vinculada
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  Nenhum registro de poupança encontrado. Comece a economizar!
                </div>
              )}
            </div>

            {/* Monthly mini bar chart savings */}
            <div className={`p-4 rounded-2xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-100 shadow-sm'}`}>
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-3 text-center">
                Histórico Geral de Evolução Mensal
              </span>
              <AreaEvolutionChart transactions={state.transactions} currency={state.settings.currency} />
            </div>

          </div>
        )}

        {/* TAB 2: GOALS LIST SCREEN */}
        {activeTab === 'goals' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className={`text-2xl font-extrabold font-display tracking-tight ${state.settings.theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                  Minhas Metas
                </h3>
                <p className="text-xs text-slate-400">Gerencie seus objetivos de longo prazo</p>
              </div>
              <button
                onClick={() => {
                  setEditingGoal(null);
                  setIsAddingGoal(true);
                }}
                className="flex items-center gap-1 bg-gradient-to-r from-indigo-600 to-[#00D4AA] hover:opacity-90 text-slate-900 py-2 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-md"
              >
                <Plus className="w-4.5 h-4.5 stroke-[2.5]" /> Nova Meta
              </button>
            </div>

            {/* Goals list */}
            {state.goals.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-800 rounded-3xl p-6">
                <TargetIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-300">Nenhuma meta ativa cadastrada</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Planeje objetivos para comprar aparelhos, viajar ou construir sua reserva de segurança financeira.
                </p>
                <button
                  onClick={() => setIsAddingGoal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Criar minha primeira meta
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {state.goals.map(g => {
                  const metrics = calculateGoalMetrics(g);
                  const priorityConfig = {
                    high: { label: 'ALTA', color: 'bg-rose-500/20 text-rose-400' },
                    medium: { label: 'MÉDIA', color: 'bg-amber-500/20 text-amber-400' },
                    low: { label: 'BAIXA', color: 'bg-emerald-500/20 text-emerald-400' }
                  }[g.priority];

                  const statusLabels = {
                    active: { label: 'Em andamento', color: 'bg-slate-800 text-indigo-400' },
                    paused: { label: 'Pausada', color: 'bg-slate-850 text-slate-400 border border-slate-800' },
                    completed: { label: 'Concluída ✅', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
                    abandoned: { label: 'Cancelada', color: 'bg-slate-900 text-rose-400/70 border border-rose-500/10' }
                  }[g.status];

                  return (
                    <div 
                      key={g.id}
                      className={`rounded-2xl border p-4.5 flex flex-col gap-3.5 transition-all relative overflow-hidden ${state.settings.theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80 hover:shadow-glow' : 'bg-white border-slate-100 shadow-sm'}`}
                    >
                      {/* Top priority line and icons */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-2xl shrink-0">{g.icon}</span>
                          <div className="overflow-hidden">
                            <h4 className={`text-sm font-extrabold truncate ${state.settings.theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                              {g.name}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Criada em: {formatDateString(g.createdAt, state.settings.dateFormat)}
                            </span>
                          </div>
                        </div>

                        {/* Status + Priority */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                          <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${statusLabels.color}`}>
                            {statusLabels.label}
                          </span>
                        </div>
                      </div>

                      {/* Notes (if any) */}
                      {g.notes && (
                        <p className={`text-[11px] leading-relaxed italic ${state.settings.theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {g.notes}
                        </p>
                      )}

                      {/* Values amount row */}
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-slate-500 font-medium">
                          {formatCurrency(g.currentAmount, state.settings.currency)}
                        </span>
                        <span className={`font-bold font-mono ${state.settings.theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                          {formatCurrency(g.targetAmount, state.settings.currency)}
                        </span>
                      </div>

                      {/* Segmented Progress Bar (at 25% increments) */}
                      <div className="flex flex-col gap-1">
                        <div className="w-full h-3 rounded-full bg-slate-950/40 border border-slate-800 overflow-hidden flex relative select-none">
                          {/* Segment markers */}
                          <div className="absolute top-0 bottom-0 left-1/4 w-0.5 bg-slate-900/30 border-r border-white/5 z-10" />
                          <div className="absolute top-0 bottom-0 left-2/4 w-0.5 bg-slate-900/30 border-r border-white/5 z-10" />
                          <div className="absolute top-0 bottom-0 left-3/4 w-0.5 bg-slate-900/30 border-r border-white/5 z-10" />
                          
                          {/* Colored dynamic progress */}
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${metrics.percentage}%`, 
                              backgroundColor: g.color || '#6C63FF',
                              backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.15) 25%, transparent 25%)'
                            }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold px-0.5">
                          <span>0%</span>
                          <span>25%</span>
                          <span>50%</span>
                          <span>75%</span>
                          <span className="font-mono text-indigo-400">{metrics.percentage.toFixed(0)}%</span>
                        </div>
                      </div>

                      {/* Remaining estimates / Daily requirements */}
                      {g.status === 'active' && (
                        <div className="bg-slate-950/20 rounded-xl p-3 border border-slate-850 flex flex-col gap-1.5 text-xs">
                          <div className="flex justify-between items-center text-slate-400">
                            <span>Prazo Final:</span>
                            <span className="font-bold font-mono text-slate-200">
                              {formatDateString(g.deadline, state.settings.dateFormat)} ({metrics.remainingDays} dias)
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-400">
                            <span>Falta poupar:</span>
                            <span className="font-bold text-rose-400 font-mono">
                              {formatCurrency(metrics.remaining, state.settings.currency)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-400">
                            <span>Necessário por dia:</span>
                            <span className="font-bold text-emerald-400 font-mono">
                              {formatCurrency(metrics.dailyNeeded, state.settings.currency)}
                            </span>
                          </div>

                          {/* Rhythm Indicator natural language */}
                          <div className="border-t border-slate-800/40 mt-1.5 pt-1.5 flex items-center gap-1 text-[10px] text-indigo-300">
                            <span>⚡ No ritmo atual, você atingirá esta meta em dia aproximado de meta.</span>
                          </div>
                        </div>
                      )}

                      {/* Edit controls */}
                      <div className="flex justify-end gap-2.5 pt-1.5">
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => {
                            setEditingGoal(g);
                            setIsAddingGoal(true);
                          }}
                          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 cursor-pointer"
                        >
                          Editar Meta
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEDGER DEPOSIT HISTORY LIST SCREEN */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div>
              <h3 className={`text-2xl font-extrabold font-display tracking-tight ${state.settings.theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                Histórico de Poupança
              </h3>
              <p className="text-xs text-slate-400">Ledger de todos os seus aportes e poupanças</p>
            </div>

            {/* Search + Filter buttons */}
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Pesquisar movimentações..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 outline-none focus:border-indigo-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              </div>
              <button
                onClick={() => setIsFiltersOpen(true)}
                className="flex items-center gap-1.5 px-3.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                <Filter className="w-4 h-4 text-slate-400" /> Filtros
              </button>
            </div>

            {/* Virtualized list container with manual scroll layout */}
            <div 
              ref={historyContainerRef}
              onScroll={handleHistoryScroll}
              className="overflow-y-auto pr-1"
              style={{ height: `${containerHeight}px` }}
            >
              {flattenedVirtualItems.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl text-xs text-slate-500">
                  Nenhum registro de poupança corresponde aos filtros.
                </div>
              ) : (
                <div 
                  className="relative w-full"
                  style={{ height: `${flattenedVirtualItems.length * ITEM_HEIGHT}px` }}
                >
                  <div 
                    className="absolute left-0 right-0 top-0 flex flex-col gap-1.5"
                    style={{ transform: `translateY(${visibleStart * ITEM_HEIGHT}px)` }}
                  >
                    {visibleVirtualItems.map((item, idx) => {
                      if (item.type === 'header') {
                        return (
                          <div 
                            key={`header-${item.key}`} 
                            style={{ height: `${ITEM_HEIGHT}px` }}
                            className="flex items-end justify-between pb-1 pt-3 px-1 border-b border-slate-800/30 select-none"
                          >
                            <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 block">
                              🗓 {item.label}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {item.count} depósitos: <strong className="font-extrabold text-emerald-400 font-mono">{formatCurrency(item.total, state.settings.currency).split(',')[0]}</strong>
                            </span>
                          </div>
                        );
                      } else {
                        const t = item.transaction;
                        
                        // Handle highlighting of matches if searched
                        const highlightText = (text: string, search: string) => {
                          if (!search.trim()) return text;
                          const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
                          const parts = text.split(regex);
                          return (
                            <>
                              {parts.map((p, i) => 
                                regex.test(p) ? <mark key={i} className="bg-amber-400 text-slate-900 px-0.5 rounded font-bold">{p}</mark> : p
                              )}
                            </>
                          );
                        };

                        return (
                          <div 
                            key={`item-${t.id}`}
                            style={{ height: `${ITEM_HEIGHT - 6}px` }} // slightly smaller to create margin gap
                            className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-850 hover:bg-slate-800/30' : 'bg-white border-slate-100 shadow-sm hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <span className="text-xl bg-slate-950/40 p-1.5 rounded-lg shrink-0">
                                {getCategoryIcon(t.categoryId, state.customCategories)}
                              </span>
                              <div className="overflow-hidden">
                                <p className={`text-xs font-bold truncate ${state.settings.theme === 'dark' ? 'text-slate-200' : 'text-slate-850'}`}>
                                  {highlightText(t.description, debouncedSearchQuery)}
                                </p>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {getCategoryLabel(t.categoryId, state.customCategories)} • {formatDateString(t.date, state.settings.dateFormat)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="text-xs font-bold font-mono text-[#00D4AA]">
                                  +{formatCurrency(t.amount, state.settings.currency).split(',')[0]}
                                </span>
                                {t.notes && (
                                  <span className="block text-[8px] text-slate-500 italic max-w-[80px] truncate">
                                    {t.notes}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-slate-500 text-center select-none">
              Lista inteligente otimizada com renderização virtual para carregar milhares de registros.
            </p>
          </div>
        )}

        {/* TAB 4: UNIFIED PANEL SCREEN (DASHBOARD CHARTS, CATEGORIES RANK, SETTINGS) */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Dashboard Sub-navigation control */}
            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800/60 select-none">
              <button
                onClick={() => setDashboardSubTab('charts')}
                className={`flex-1 py-2 text-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${dashboardSubTab === 'charts' ? 'bg-indigo-600 text-slate-50 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Gráficos
              </button>
              <button
                onClick={() => setDashboardSubTab('kpis')}
                className={`flex-1 py-2 text-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${dashboardSubTab === 'kpis' ? 'bg-indigo-600 text-slate-50 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Ranking
              </button>
              <button
                onClick={() => setDashboardSubTab('settings')}
                className={`flex-1 py-2 text-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${dashboardSubTab === 'settings' ? 'bg-indigo-600 text-slate-50 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Ajustes
              </button>
            </div>

            {/* SUB-SECTION 1: CHARTS */}
            {dashboardSubTab === 'charts' && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className={`text-base font-extrabold font-display ${state.settings.theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>
                    Painel Gráfico
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                    Interativo
                  </span>
                </div>

                {/* Sub-selector for chart variants */}
                <div className="flex overflow-x-auto gap-1.5 pb-2 select-none">
                  {(['evolution', 'comparison', 'category', 'goals_prog'] as const).map(chartType => {
                    const labelMap = {
                      evolution: 'Evolução 12M',
                      comparison: 'Comparativo',
                      category: 'Por Categoria',
                      goals_prog: 'Progresso Metas',
                    };
                    const isSelected = activeChartTab === chartType;
                    return (
                      <button
                        key={chartType}
                        onClick={() => setActiveChartTab(chartType)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border shrink-0 transition-all cursor-pointer ${isSelected ? 'bg-indigo-600 border-indigo-500 text-slate-50' : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:text-slate-300'}`}
                      >
                        {labelMap[chartType]}
                      </button>
                    );
                  })}
                </div>

                {/* Main responsive active chart block container */}
                <div className={`p-4 rounded-2xl border ${state.settings.theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-100 shadow-sm'}`}>
                  {activeChartTab === 'evolution' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block text-center mb-1">
                        Evolução Mensal de Poupança (12 meses)
                      </span>
                      <AreaEvolutionChart transactions={state.transactions} currency={state.settings.currency} />
                    </div>
                  )}

                  {activeChartTab === 'comparison' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block text-center mb-1">
                        Comparativo das Principais Categorias (Mês Atual vs. Anterior)
                      </span>
                      <MonthlyComparisonChart 
                        transactions={state.transactions} 
                        customCategories={state.customCategories}
                        currency={state.settings.currency} 
                      />
                    </div>
                  )}

                  {activeChartTab === 'category' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block text-center mb-1">
                        Divisão Percentual de Depósitos por Categoria
                      </span>
                      <CategoryDonutChart 
                        transactions={state.transactions} 
                        customCategories={state.customCategories}
                        currency={state.settings.currency} 
                      />
                    </div>
                  )}

                  {activeChartTab === 'goals_prog' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block text-center mb-1">
                        Linha de Progressão de Metas Ativas
                      </span>
                      <GoalLinesChart 
                        goals={state.goals} 
                        transactions={state.transactions}
                        currency={state.settings.currency} 
                      />
                    </div>
                  )}
                </div>

                {/* Summary descriptive text based on active chart */}
                <div className="p-3 bg-indigo-600/5 border border-indigo-500/10 rounded-xl flex items-start gap-2 text-[11px] text-slate-400">
                  <Info className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                  <p>
                    {activeChartTab === 'evolution' && 'Acompanhe a constância de suas economias ao longo dos últimos 12 meses para analisar seus meses mais fortes e fracos.'}
                    {activeChartTab === 'comparison' && 'Analise as variações nos aportes das principais categorias em relação ao mês anterior para identificar tendências.'}
                    {activeChartTab === 'category' && 'Clique nas fatias do donut para expandir os valores exatos economizados em cada categoria correspondente.'}
                    {activeChartTab === 'goals_prog' && 'Visualização histórica temporal dos depósitos destinados às metas ativas cadastradas.'}
                  </p>
                </div>
              </div>
            )}

            {/* SUB-SECTION 2: RANKINGS & STATISTICS KPIS */}
            {dashboardSubTab === 'kpis' && (
              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-center px-1">
                  <h3 className={`text-base font-extrabold font-display ${state.settings.theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>
                    Análise & Rankings
                  </h3>
                </div>

                {/* KPI stats blocks detailed card */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3.5 rounded-2xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">🏆 Melhor Mês</span>
                    <span className="text-sm font-extrabold text-[#00D4AA] font-mono block truncate">{monthlyAggregates.bestMonth.label}</span>
                    <span className="text-[10px] text-slate-500 font-bold font-mono">+{formatCurrency(monthlyAggregates.bestMonth.value, state.settings.currency).split(',')[0]}</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">📉 Pior Mês</span>
                    <span className="text-sm font-extrabold text-rose-400 font-mono block truncate">{monthlyAggregates.worstMonth.label}</span>
                    <span className="text-[10px] text-slate-500 font-bold font-mono">+{formatCurrency(monthlyAggregates.worstMonth.value, state.settings.currency).split(',')[0]}</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">⚡ Maior Depósito</span>
                    <span className="text-sm font-extrabold text-slate-200 font-mono block truncate">+{formatCurrency(largestDeposit.amount, state.settings.currency).split(',')[0]}</span>
                    <span className="text-[10px] text-slate-500 font-bold font-mono">{largestDeposit.date ? formatDateString(largestDeposit.date, state.settings.dateFormat) : 'Nenhum'}</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border transition-all ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-800/60' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">🔻 Menor Depósito</span>
                    <span className="text-sm font-extrabold text-slate-200 font-mono block truncate">+{formatCurrency(smallestDeposit.amount, state.settings.currency).split(',')[0]}</span>
                    <span className="text-[10px] text-slate-500 font-bold font-mono">{smallestDeposit.date ? formatDateString(smallestDeposit.date, state.settings.dateFormat) : 'Nenhum'}</span>
                  </div>
                </div>

                {/* Categories Leaderboard list with proportional indicators */}
                <div className={`p-4 rounded-2xl border ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center mb-4 block">
                    Ranking de Categorias Campeãs
                  </h4>
                  <CategoriesHorizontalChart 
                    transactions={state.transactions} 
                    customCategories={state.customCategories}
                    currency={state.settings.currency} 
                  />
                </div>
              </div>
            )}

            {/* SUB-SECTION 3: SYSTEM PREFERENCES & SETTINGS */}
            {dashboardSubTab === 'settings' && (
              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-center px-1">
                  <h3 className={`text-base font-extrabold font-display ${state.settings.theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>
                    Ajustes do Aplicativo
                  </h3>
                </div>

                {/* User Profile Form settings block */}
                <div className={`p-4.5 rounded-2xl border flex flex-col gap-4 ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-800/50 pb-2">
                    <User className="w-4 h-4 text-slate-400" /> Perfil de Usuário
                  </span>
                  
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Nome do Titular</span>
                    <input
                      type="text"
                      value={state.settings.username}
                      onChange={(e) => handleUpdateSettings('username', e.target.value)}
                      placeholder="Investidor SmartSave"
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none font-semibold"
                    />
                  </div>
                </div>

                {/* Preferences financial indicators defaults */}
                <div className={`p-4.5 rounded-2xl border flex flex-col gap-4 ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-800/50 pb-2">
                    <SettingsIcon className="w-4 h-4 text-slate-400" /> Preferências Financeiras
                  </span>

                  {/* Monthly Goal Default Target */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Meta Mensal Padrão (AOA)</span>
                    <input
                      type="number"
                      value={state.settings.defaultMonthlyGoal}
                      onChange={(e) => handleUpdateSettings('defaultMonthlyGoal', Number(e.target.value))}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none font-mono font-bold"
                    />
                  </div>

                  {/* Currency standard picker */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Moeda Principal</span>
                    <select
                      value={state.settings.currency}
                      onChange={(e: any) => {
                        handleUpdateSettings('currency', e.target.value);
                        showToast(`Moeda padrão alterada para ${e.target.value}!`, 'info');
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="AOA">Kwanza Angola (AOA - Kz)</option>
                      <option value="BRL">Real Brasileiro (BRL - R$)</option>
                      <option value="USD">Dólar Americano (USD - $)</option>
                      <option value="EUR">Euro (EUR - €)</option>
                    </select>
                  </div>

                  {/* Date representation style */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Formato de Data</span>
                    <select
                      value={state.settings.dateFormat}
                      onChange={(e: any) => handleUpdateSettings('dateFormat', e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:border-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="DD/MM/YYYY">Dia/Mês/Ano (DD/MM/YYYY)</option>
                      <option value="MM/DD/YYYY">Mês/Dia/Ano (MM/DD/YYYY)</option>
                    </select>
                  </div>
                </div>

                {/* Backups Import & Export */}
                <div className={`p-4.5 rounded-2xl border flex flex-col gap-4 ${state.settings.theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 border-b border-slate-800/50 pb-2">
                    <Upload className="w-4 h-4 text-slate-400" /> Gerenciamento de Backups
                  </span>

                  <div className="flex flex-col gap-3">
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      Restaure de um backup anterior carregando seu arquivo de formato JSON (.json). O sistema validará o esquema para evitar corrupções.
                    </p>

                    <label className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs py-2.5 px-4 rounded-xl font-bold cursor-pointer transition-colors text-center select-none active:scale-95 shadow">
                      <Upload className="w-4 h-4" /> Importar Backup (.json)
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImportBackup} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                {/* Wipe all data block option */}
                <div className="p-4.5 rounded-2xl border border-rose-500/10 bg-rose-500/5 flex flex-col gap-3.5">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
                      ⚠️ Área Destrutiva de Risco
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Wipe completo. Apaga todas as transações, metas e reconfigura o app para o estado inicial padrão. Esta ação é definitiva e irreversível.
                    </p>
                  </div>

                  {showClearConfirm ? (
                    <div className="flex flex-col gap-2.5 border-t border-rose-500/10 pt-3 animate-fade-in">
                      <span className="text-[9px] uppercase font-bold text-slate-300 block">
                        Para prosseguir, digite <strong className="font-extrabold text-rose-400">CONFIRMAR</strong> abaixo:
                      </span>
                      <input
                        type="text"
                        placeholder="Escreva CONFIRMAR em maiúsculas"
                        value={clearConfirmInput}
                        onChange={(e) => setClearConfirmInput(e.target.value)}
                        className="bg-slate-950 border border-rose-500/30 rounded-xl px-3.5 py-2.5 text-xs text-rose-200 outline-none font-bold"
                      />
                      <div className="grid grid-cols-2 gap-2.5 mt-1">
                        <button
                          onClick={() => {
                            setShowClearConfirm(false);
                            setClearConfirmInput('');
                          }}
                          className="bg-slate-800 text-slate-300 py-2 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleWipeData}
                          className="bg-rose-600 hover:bg-rose-500 text-slate-100 py-2 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Limpar Tudo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="flex items-center justify-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Apagar Todo Histórico
                    </button>
                  )}
                </div>

                {/* About credits footer */}
                <div className="text-center text-[10px] text-slate-500 py-4 flex flex-col gap-0.5">
                  <p>SmartSave Pro v1.0.0</p>
                  <p>Investimentos salvos localmente no navegador</p>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── CENTRAL FLOATING ACTION LOG DEPOSITS TRIGGER MODAL ── */}
      {isAddingSavings && (
        <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center animate-fade-in">
          <div className="w-full max-w-lg">
            <SavingsForm 
              goals={state.goals}
              customCategories={state.customCategories}
              currency={state.settings.currency}
              onSave={handleSaveTransaction}
              onCancel={() => setIsAddingSavings(false)}
            />
          </div>
        </div>
      )}

      {/* ── GOAL CREATION / EDITING POPUP OVERLAY MODAL ── */}
      {isAddingGoal && (
        <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center animate-fade-in">
          <div className="w-full max-w-lg">
            <GoalForm 
              goals={state.goals}
              customCategories={state.customCategories}
              currency={state.settings.currency}
              editingGoal={editingGoal}
              onSave={handleSaveGoal}
              onCancel={() => {
                setIsAddingGoal(false);
                setEditingGoal(null);
              }}
            />
          </div>
        </div>
      )}

      {/* ── LEDGER FILTERS BOTTOM SHEET OVERLAY DRAWER ── */}
      <FilterDrawer 
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        customCategories={state.customCategories}
        currency={state.settings.currency}
        currentFilters={filters}
        onApplyFilters={(updatedFilters) => setFilters(updatedFilters)}
        onClearFilters={() => setFilters({
          searchQuery: '',
          startDate: '',
          endDate: '',
          selectedCategoryIds: [],
          minAmount: 0,
          maxAmount: 0,
          sortBy: 'date_desc'
        })}
      />

      {/* ── DIAGNOSTIC AND EXPORTS DETAILED REPORTS OVERLAY MODAL ── */}
      <ReportsModal 
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        state={state}
        currency={state.settings.currency}
      />

      {/* ── 5-TAB NAVIGATION FOOTER BAR ─────────────────────────────────────── */}
      <nav className={`fixed bottom-0 left-0 right-0 z-30 h-16 border-t flex items-center justify-around select-none ${state.settings.theme === 'dark' ? 'bg-[#111827]/95 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-500 shadow-md'} px-2 backdrop-blur-md`}>
        
        {/* TAB 1: HOME */}
        <button
          onClick={() => {
            setActiveTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors relative ${activeTab === 'home' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'}`}
        >
          <HomeIcon className="w-5 h-5 stroke-[2]" />
          <span className="text-[9px] uppercase tracking-wider font-extrabold mt-1">Home</span>
          {activeTab === 'home' && (
            <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-fade-in" />
          )}
        </button>

        {/* TAB 2: GOALS */}
        <button
          onClick={() => {
            setActiveTab('goals');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors relative ${activeTab === 'goals' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'}`}
        >
          <TargetIcon className="w-5 h-5 stroke-[2]" />
          <span className="text-[9px] uppercase tracking-wider font-extrabold mt-1">Metas</span>
          {activeTab === 'goals' && (
            <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-fade-in" />
          )}
        </button>

        {/* CENTER FLOATING ACTION: ADD DEPOSITS */}
        <div className="relative flex justify-center flex-1 h-full">
          <button
            onClick={() => setIsAddingSavings(true)}
            className="absolute -top-5 w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-[#00D4AA] flex items-center justify-center shadow-glow text-slate-900 transition-transform hover:scale-105 active:scale-95 cursor-pointer z-40 outline-none"
            title="Registrar Poupança"
          >
            <Plus className="w-8 h-8 stroke-[3] text-slate-900" />
          </button>
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 absolute bottom-1.5 select-none pointer-events-none">
            Aportar
          </span>
        </div>

        {/* TAB 3: HISTORY */}
        <button
          onClick={() => {
            setActiveTab('history');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors relative ${activeTab === 'history' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'}`}
        >
          <HistoryIcon className="w-5 h-5 stroke-[2]" />
          <span className="text-[9px] uppercase tracking-wider font-extrabold mt-1">Histórico</span>
          {activeTab === 'history' && (
            <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-fade-in" />
          )}
        </button>

        {/* TAB 4: PANEL (DASHBOARD CHARTS + SETTINGS) */}
        <button
          onClick={() => {
            setActiveTab('dashboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full cursor-pointer transition-colors relative ${activeTab === 'dashboard' ? 'text-indigo-400 font-bold' : 'hover:text-slate-200'}`}
        >
          <PanelIcon className="w-5 h-5 stroke-[2]" />
          <span className="text-[9px] uppercase tracking-wider font-extrabold mt-1">Painel</span>
          {activeTab === 'dashboard' && (
            <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-fade-in" />
          )}
        </button>

      </nav>
    </div>
  );
}
