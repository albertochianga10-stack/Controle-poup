import React, { useState, useMemo, useEffect } from 'react';
import { Goal, Category } from '../types';
import { DEFAULT_CATEGORIES, formatCurrency, maskCurrencyInput } from '../utils';
import { Target, Calendar, BarChart2, Star, Check, X } from 'lucide-react';

interface GoalFormProps {
  goals: Goal[];
  customCategories: Category[];
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
  editingGoal?: Goal | null;
  onSave: (goal: Omit<Goal, 'id' | 'currentAmount' | 'createdAt'>) => void;
  onCancel: () => void;
}

const PALETTE_COLORS = [
  '#6C63FF', // Roxo elétrico
  '#00D4AA', // Verde-água
  '#FF4D6D', // Vermelho suave
  '#FFB800', // Amarelo âmbar
  '#45B7D1', // Azul turquesa
  '#9370DB', // Violeta médio
  '#32CD32', // Verde lima
  '#FF69B4', // Rosa quente
];

const EMOJI_OPTIONS = ['🎯', '✈️', '🚗', '🏠', '🎓', '🚨', '💻', '🏍️', '💍', '👶', '📈', '🛒', '🌴'];

export default function GoalForm({ customCategories, currency, editingGoal, onSave, onCancel }: GoalFormProps) {
  const [name, setName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [deadline, setDeadline] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [status, setStatus] = useState<'active' | 'paused' | 'completed' | 'abandoned'>('active');
  const [color, setColor] = useState('#6C63FF');
  const [icon, setIcon] = useState('🎯');
  const [notes, setNotes] = useState('');

  const [invalidFields, setInvalidFields] = useState<{ [key: string]: boolean }>({});

  const allCategories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [customCategories]);

  // Load editing goal if provided
  useEffect(() => {
    if (editingGoal) {
      setName(editingGoal.name);
      setTargetAmount(editingGoal.targetAmount);
      const { maskedText } = maskCurrencyInput(String(editingGoal.targetAmount * 100), currency);
      setTargetAmountStr(maskedText);
      setDeadline(editingGoal.deadline);
      setCategoryId(editingGoal.categoryId);
      setPriority(editingGoal.priority);
      setStatus(editingGoal.status);
      setColor(editingGoal.color);
      setIcon(editingGoal.icon);
      setNotes(editingGoal.notes || '');
    } else {
      // Defaults for new goal
      setName('');
      setTargetAmount(0);
      setTargetAmountStr('');
      const tomorrow = new Date('2026-06-29');
      setDeadline(tomorrow.toISOString().split('T')[0]);
      setCategoryId(DEFAULT_CATEGORIES[0].id);
      setPriority('medium');
      setStatus('active');
      setColor('#6C63FF');
      setIcon('🎯');
      setNotes('');
    }
  }, [editingGoal, currency]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const { numericValue, maskedText } = maskCurrencyInput(rawValue, currency);
    setTargetAmount(numericValue);
    setTargetAmountStr(maskedText);
    if (numericValue > 0) {
      setInvalidFields(prev => ({ ...prev, targetAmount: false }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: boolean } = {};

    if (!name.trim()) {
      errors.name = true;
    }
    if (targetAmount <= 0) {
      errors.targetAmount = true;
    }
    if (!deadline) {
      errors.deadline = true;
    }
    if (!categoryId) {
      errors.categoryId = true;
    }

    if (Object.keys(errors).length > 0) {
      setInvalidFields(errors);
      setTimeout(() => {
        setInvalidFields({});
      }, 500);
      return;
    }

    onSave({
      name: name.trim(),
      targetAmount,
      deadline,
      categoryId,
      priority,
      status,
      color,
      icon,
      notes: notes.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 bg-slate-900 rounded-3xl border border-slate-800/80 max-w-lg mx-auto shadow-float">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800/50">
        <h3 className="text-lg font-bold font-display text-slate-100 flex items-center gap-2">
          🎯 {editingGoal ? 'Editar Meta de Poupança' : 'Nova Meta de Poupança'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 1. Goal Name */}
      <div className={`flex flex-col gap-1.5 ${invalidFields.name ? 'animate-shake' : ''}`}>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Nome da Meta
        </label>
        <input
          type="text"
          placeholder="Ex: Viagem para Europa, Entrada da Casa, Notebook..."
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setInvalidFields(prev => ({ ...prev, name: false }));
          }}
          className={`w-full bg-slate-950 text-slate-100 rounded-xl px-4 py-3 text-sm border outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${invalidFields.name ? 'border-rose-500/50' : 'border-slate-800'}`}
        />
      </div>

      {/* 2. Target Amount */}
      <div className={`flex flex-col gap-1.5 ${invalidFields.targetAmount ? 'animate-shake' : ''}`}>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Valor Alvo Necessário
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder={formatCurrency(0, currency)}
          value={targetAmountStr}
          onChange={handleAmountChange}
          className={`w-full bg-slate-950 text-emerald-400 rounded-xl px-4 py-3 text-sm font-bold border outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-mono ${invalidFields.targetAmount ? 'border-rose-500/50' : 'border-slate-800'}`}
        />
      </div>

      {/* 3. Deadline Date Picker */}
      <div className={`flex flex-col gap-1.5 ${invalidFields.deadline ? 'animate-shake' : ''}`}>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Prazo Estimado (Deadline)
        </label>
        <input
          type="date"
          value={deadline}
          min="2026-06-29"
          onChange={(e) => {
            setDeadline(e.target.value);
            setInvalidFields(prev => ({ ...prev, deadline: false }));
          }}
          className={`w-full bg-slate-950 text-slate-100 rounded-xl px-4 py-3 text-sm border outline-none transition-all focus:border-indigo-500 cursor-pointer ${invalidFields.deadline ? 'border-rose-500/50' : 'border-slate-800'}`}
        />
      </div>

      {/* 4. Link Category dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Categoria Associada
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full bg-slate-950 text-slate-100 rounded-xl px-4 py-3 text-sm border border-slate-800 outline-none transition-all focus:border-indigo-500 cursor-pointer"
        >
          {allCategories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Goal Priority */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
          Prioridade da Meta
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'medium', 'high'] as const).map(p => {
            const labelMap = { low: 'Baixa 🟢', medium: 'Média 🟡', high: 'Alta 🔴' };
            const isSelected = priority === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isSelected ? 'bg-indigo-600 border-indigo-500 text-slate-100 scale-105' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300'}`}
              >
                {labelMap[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Icon Picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
          Ícone / Emoji
        </label>
        <div className="flex flex-wrap gap-2 p-3 bg-slate-950/40 rounded-xl border border-slate-800">
          {EMOJI_OPTIONS.map(emo => (
            <button
              key={emo}
              type="button"
              onClick={() => setIcon(emo)}
              className={`w-9 h-9 flex items-center justify-center text-lg rounded-lg transition-all cursor-pointer select-none active:scale-90 ${icon === emo ? 'bg-indigo-600 border border-indigo-400 scale-110 shadow-md' : 'bg-slate-900/60 hover:bg-slate-800'}`}
            >
              {emo}
            </button>
          ))}
        </div>
      </div>

      {/* 7. Color Palette Picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
          Cor Customizável
        </label>
        <div className="flex flex-wrap gap-2.5 p-3 bg-slate-950/40 rounded-xl border border-slate-800">
          {PALETTE_COLORS.map(col => (
            <button
              key={col}
              type="button"
              onClick={() => setColor(col)}
              style={{ backgroundColor: col }}
              className={`w-6 h-6 rounded-full transition-all cursor-pointer select-none active:scale-90 relative ${color === col ? 'scale-125 ring-2 ring-indigo-400 shadow-md' : 'hover:opacity-90'}`}
            >
              {color === col && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* If editing, show status options */}
      {editingGoal && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Status da Meta
          </label>
          <select
            value={status}
            onChange={(e: any) => setStatus(e.target.value)}
            className="w-full bg-slate-950 text-slate-100 rounded-xl px-4 py-3 text-sm border border-slate-800 outline-none transition-all focus:border-indigo-500 cursor-pointer"
          >
            <option value="active">Em andamento (Ativa)</option>
            <option value="paused">Pausada</option>
            <option value="completed">Concluída (Atingida) ✅</option>
            <option value="abandoned">Cancelada / Abandonada</option>
          </select>
        </div>
      )}

      {/* 8. Optional notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex justify-between items-center">
          <span>Detalhes ou Anotações</span>
          <span className="text-[10px] font-semibold text-slate-500 normal-case">opcional</span>
        </label>
        <textarea
          placeholder="Anotações adicionais sobre o andamento e propósitos desta meta..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-slate-950 text-slate-100 rounded-xl px-4 py-3 text-sm border border-slate-800 outline-none transition-all focus:border-indigo-500 resize-none"
        />
      </div>

      {/* Action buttons */}
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
          <Check className="w-4 h-4 text-slate-900 stroke-[3]" /> Salvar Meta
        </button>
      </div>
    </form>
  );
}
