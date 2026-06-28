import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Category, Transaction, Goal } from '../types';
import { DEFAULT_CATEGORIES, formatCurrency, maskCurrencyInput } from '../utils';
import { Calendar, Tag, Paperclip, ChevronDown, Check, X, PlusCircle } from 'lucide-react';

interface SavingsFormProps {
  goals: Goal[];
  customCategories: Category[];
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
  onSave: (transaction: Omit<Transaction, 'id'>, customCatName?: string) => void;
  onCancel: () => void;
}

export default function SavingsForm({ goals, customCategories, currency, onSave, onCancel }: SavingsFormProps) {
  const [amountStr, setAmountStr] = useState('');
  const [numericAmount, setNumericAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date('2026-06-28');
    return today.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('');

  // Custom Category State
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  // Invalid shaking fields indicator state
  const [invalidFields, setInvalidFields] = useState<{ [key: string]: boolean }>({});

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Filter linked goals depending on selected category (if any)
  const availableGoals = useMemo(() => {
    return goals.filter(g => g.status === 'active' && (!selectedCategoryId || g.categoryId === selectedCategoryId));
  }, [goals, selectedCategoryId]);

  // Combine default categories with custom ones
  const allCategories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Handle typing currency digits
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const { numericValue, maskedText } = maskCurrencyInput(rawValue, currency);
    setNumericAmount(numericValue);
    setAmountStr(maskedText);
    
    if (numericValue > 0) {
      setInvalidFields(prev => ({ ...prev, amount: false }));
    }
  };

  const handleCategorySelect = (catId: string) => {
    if (catId === 'custom-trigger') {
      setIsCustomCategory(true);
      setSelectedCategoryId('');
    } else {
      setIsCustomCategory(false);
      setSelectedCategoryId(catId);
    }
    setInvalidFields(prev => ({ ...prev, category: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: boolean } = {};

    if (numericAmount <= 0 || numericAmount > 9999999.99) {
      errors.amount = true;
    }
    if (!selectedCategoryId && (!isCustomCategory || !customCategoryName.trim())) {
      errors.category = true;
    }
    if (!date) {
      errors.date = true;
    }
    if (!description.trim()) {
      errors.description = true;
    }

    if (Object.keys(errors).length > 0) {
      setInvalidFields(errors);
      
      // Clear shaking after animation cycles
      setTimeout(() => {
        setInvalidFields({});
      }, 500);
      return;
    }

    // Call onSave with proper data
    onSave({
      description: description.trim(),
      amount: numericAmount,
      categoryId: isCustomCategory ? 'outros' : selectedCategoryId,
      date,
      notes: notes.trim() || undefined,
      goalId: selectedGoalId || undefined
    }, isCustomCategory ? customCategoryName.trim() : undefined);
  };

  // Auto-focus value input on mount
  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 bg-slate-900 rounded-3xl border border-slate-800/80 max-w-lg mx-auto shadow-float">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
        <h3 className="text-lg font-bold font-display text-slate-100 flex items-center gap-2">
          💰 Registrar Poupança
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 1. Value input field (Big visual size) */}
      <div className={`flex flex-col gap-1.5 ${invalidFields.amount ? 'animate-shake' : ''}`}>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Valor Guardado
        </label>
        <div className="relative">
          <input
            ref={amountInputRef}
            type="text"
            inputMode="numeric"
            placeholder={formatCurrency(0, currency)}
            value={amountStr}
            onChange={handleAmountChange}
            className={`w-full text-center text-3xl font-extrabold font-display bg-slate-950 text-emerald-400 py-4 px-3 rounded-2xl border transition-all tabular-nums outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 ${invalidFields.amount ? 'border-rose-500/50' : 'border-slate-800'}`}
          />
        </div>
        <p className="text-[10px] text-slate-500 text-center">
          Formatado em tempo real na moeda do aplicativo.
        </p>
      </div>

      {/* 2. Description input field */}
      <div className={`flex flex-col gap-1.5 ${invalidFields.description ? 'animate-shake' : ''}`}>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Descrição do Depósito
        </label>
        <input
          type="text"
          placeholder="Ex: Sobrou do salário, Bônus extra..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setInvalidFields(prev => ({ ...prev, description: false }));
          }}
          className={`w-full bg-slate-950 text-slate-100 rounded-xl px-4 py-3 text-sm border outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${invalidFields.description ? 'border-rose-500/50' : 'border-slate-800'}`}
        />
      </div>

      {/* 3. Category Selector Grid */}
      <div className={`flex flex-col gap-1.5 ${invalidFields.category ? 'animate-shake' : ''}`}>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex justify-between">
          <span>Categoria</span>
          <span className="text-indigo-400 font-semibold lowercase">selecione uma</span>
        </label>
        
        {/* Chips layout (3 columns scrollable wrapper) */}
        <div className="max-h-[170px] overflow-y-auto grid grid-cols-3 gap-2 pr-1">
          {allCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id && !isCustomCategory;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                style={{ 
                  backgroundColor: isSelected ? cat.color : 'rgba(28, 36, 54, 0.4)',
                  borderColor: isSelected ? cat.color : 'rgba(30, 45, 69, 0.5)' 
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer select-none active:scale-95 ${isSelected ? 'text-slate-900 font-bold shadow-md scale-105' : 'text-slate-300 hover:bg-slate-800/40'}`}
              >
                <span className="text-xl mb-1">{cat.icon}</span>
                <span className="text-[10px] tracking-wide font-medium truncate max-w-full px-0.5">
                  {cat.label}
                </span>
              </button>
            );
          })}
          
          {/* Custom Category Button chip */}
          <button
            type="button"
            onClick={() => handleCategorySelect('custom-trigger')}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border border-dashed text-center transition-all cursor-pointer select-none active:scale-95 ${isCustomCategory ? 'bg-indigo-600 border-indigo-500 text-slate-100 font-bold scale-105' : 'bg-slate-950/20 border-slate-700/60 text-slate-400 hover:text-slate-200'}`}
          >
            <span className="text-xl mb-1">✨</span>
            <span className="text-[10px] tracking-wide font-medium">Personalizada</span>
          </button>
        </div>

        {/* Custom category inline name typing */}
        {isCustomCategory && (
          <div className="mt-2.5 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 animate-fade-in">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Nome da categoria customizada
            </label>
            <input
              type="text"
              placeholder="Ex: Presentes, Pet..."
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 rounded-lg px-3 py-2 text-xs border border-slate-800 focus:border-indigo-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* 4. Date selection */}
      <div className={`flex flex-col gap-1.5 ${invalidFields.date ? 'animate-shake' : ''}`}>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Data do Depósito
        </label>
        <div className="relative">
          <input
            type="date"
            value={date}
            max="2026-12-31"
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-950 text-slate-100 rounded-xl px-4 py-3 text-sm border border-slate-800 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
          />
        </div>
      </div>

      {/* 5. Goal Linker selector */}
      {goals.filter(g => g.status === 'active').length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex justify-between items-center">
            <span>Vincular a uma Meta</span>
            <span className="text-[10px] font-semibold text-slate-500 normal-case">opcional</span>
          </label>
          <div className="relative">
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 rounded-xl pl-4 pr-10 py-3 text-sm border border-slate-800 outline-none transition-all focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="">Não vincular a nenhuma meta</option>
              {availableGoals.map(g => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name} (Meta: {formatCurrency(g.targetAmount, currency)})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {selectedGoalId && (
            <p className="text-[10px] text-emerald-400 font-medium">
              ✨ Este depósito aumentará automaticamente o progresso da meta selecionada!
            </p>
          )}
        </div>
      )}

      {/* 6. Notes input (Optional) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex justify-between items-center">
          <span>Observações</span>
          <span className="text-[10px] font-semibold text-slate-500 normal-case">opcional</span>
        </label>
        <textarea
          placeholder="Dicas adicionais ou observações sobre esta poupança..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-slate-950 text-slate-100 rounded-xl px-4 py-3 text-sm border border-slate-800 outline-none transition-all focus:border-indigo-500 resize-none"
        />
      </div>

      {/* Form buttons */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-4 rounded-xl text-sm font-semibold transition-colors cursor-pointer text-center"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-indigo-600 to-[#00D4AA] hover:opacity-90 text-slate-900 py-3 px-4 rounded-xl text-sm font-bold transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4 text-slate-900 stroke-[3]" /> Salvar
        </button>
      </div>
    </form>
  );
}
