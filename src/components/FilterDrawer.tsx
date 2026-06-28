import { useState, useMemo, useEffect } from 'react';
import { Category, HistoryFilters } from '../types';
import { DEFAULT_CATEGORIES, formatCurrency } from '../utils';
import { Filter, Calendar, DollarSign, ArrowUpDown, X, RotateCcw } from 'lucide-react';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customCategories: Category[];
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
  currentFilters: HistoryFilters;
  onApplyFilters: (filters: HistoryFilters) => void;
  onClearFilters: () => void;
}

export default function FilterDrawer({
  isOpen,
  onClose,
  customCategories,
  currency,
  currentFilters,
  onApplyFilters,
  onClearFilters
}: FilterDrawerProps) {
  const [startDate, setStartDate] = useState(currentFilters.startDate);
  const [endDate, setEndDate] = useState(currentFilters.endDate);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(currentFilters.selectedCategoryIds);
  const [minAmount, setMinAmount] = useState<number | ''>(currentFilters.minAmount || '');
  const [maxAmount, setMaxAmount] = useState<number | ''>(currentFilters.maxAmount || '');
  const [sortBy, setSortBy] = useState(currentFilters.sortBy);

  const allCategories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Synchronize state when drawers open
  useEffect(() => {
    if (isOpen) {
      setStartDate(currentFilters.startDate);
      setEndDate(currentFilters.endDate);
      setSelectedCategoryIds(currentFilters.selectedCategoryIds);
      setMinAmount(currentFilters.minAmount || '');
      setMaxAmount(currentFilters.maxAmount || '');
      setSortBy(currentFilters.sortBy);
    }
  }, [isOpen, currentFilters]);

  if (!isOpen) return null;

  const handleToggleCategory = (catId: string) => {
    setSelectedCategoryIds(prev => {
      if (prev.includes(catId)) {
        return prev.filter(id => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleApply = () => {
    onApplyFilters({
      searchQuery: currentFilters.searchQuery, // keep search query
      startDate,
      endDate,
      selectedCategoryIds,
      minAmount: minAmount === '' ? 0 : Number(minAmount),
      maxAmount: maxAmount === '' ? 0 : Number(maxAmount),
      sortBy
    });
    onClose();
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCategoryIds([]);
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date_desc');
    onClearFilters();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />
      
      {/* Content drawer container */}
      <div 
        className="relative w-full max-w-md bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 shadow-float flex flex-col gap-5 max-h-[85vh] overflow-y-auto animate-slide-up"
        style={{ animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        {/* Handle bar for drag visual feel */}
        <div className="w-12 h-1.5 rounded-full bg-slate-800 mx-auto -mt-2 mb-2" />

        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
          <h3 className="text-base font-bold font-display text-slate-100 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-400" /> Filtrar & Ordenar
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Date Range filters */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Intervalo de Datas
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">De</span>
              <input 
                type="date" 
                value={startDate}
                max="2026-12-31"
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 cursor-pointer focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Até</span>
              <input 
                type="date" 
                value={endDate}
                max="2026-12-31"
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 cursor-pointer focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Sorting options */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> Ordenar Por
          </span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 cursor-pointer focus:border-indigo-500 outline-none appearance-none"
          >
            <option value="date_desc">Mais Recentes Primeiro</option>
            <option value="date_asc">Mais Antigos Primeiro</option>
            <option value="amount_desc">Maior Valor</option>
            <option value="amount_asc">Menor Valor</option>
          </select>
        </div>

        {/* 3. Category multi-chips selector */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Categorias ({selectedCategoryIds.length} selecionadas)
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
            {allCategories.map(cat => {
              const isChecked = selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleToggleCategory(cat.id)}
                  style={{ 
                    borderColor: isChecked ? cat.color : 'rgba(30, 45, 69, 0.5)',
                    backgroundColor: isChecked ? `${cat.color}25` : 'transparent',
                    color: isChecked ? '#FFF' : 'rgba(240,244,255,0.7)'
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all active:scale-95`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Min/Max Amount limit */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Faixa de Valores ({currency})
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Mínimo</span>
              <input 
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 outline-none font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Máximo</span>
              <input 
                type="number"
                placeholder="Sem limite"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value !== '' ? Number(e.target.value) : '')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="grid grid-cols-2 gap-3.5 pt-4 mt-2 border-t border-slate-800/60">
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Limpar Tudo
          </button>
          <button
            onClick={handleApply}
            className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 py-3 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-glow text-center"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
    </div>
  );
}
