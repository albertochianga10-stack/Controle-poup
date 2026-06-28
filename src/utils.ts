import { Category, Transaction, Goal, State } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'casa',         label: 'Casa',         color: '#FF6B6B', icon: '🏠' },
  { id: 'carro',        label: 'Carro',        color: '#4ECDC4', icon: '🚗' },
  { id: 'viagem',       label: 'Viagem',       color: '#45B7D1', icon: '✈️' },
  { id: 'faculdade',    label: 'Faculdade',    color: '#96CEB4', icon: '🎓' },
  { id: 'empresa',      label: 'Empresa',      color: '#FFEAA7', icon: '🏢' },
  { id: 'investimento', label: 'Investimento', color: '#DDA0DD', icon: '📈' },
  { id: 'emergencia',   label: 'Emergência',   color: '#FF8C00', icon: '🚨' },
  { id: 'celular',      label: 'Celular',      color: '#00CED1', icon: '📱' },
  { id: 'notebook',     label: 'Notebook',     color: '#9370DB', icon: '💻' },
  { id: 'moto',         label: 'Moto',         color: '#32CD32', icon: '🏍️' },
  { id: 'casamento',    label: 'Casamento',    color: '#FF69B4', icon: '💍' },
  { id: 'filhos',       label: 'Filhos',       color: '#FFD700', icon: '👶' },
  { id: 'outros',       label: 'Outros',       color: '#A0A0A0', icon: '📦' },
];

export const getCategoryColor = (categoryId: string, customCategories: Category[] = []): string => {
  const cat = [...DEFAULT_CATEGORIES, ...customCategories].find(c => c.id === categoryId);
  return cat ? cat.color : '#A0A0A0';
};

export const getCategoryIcon = (categoryId: string, customCategories: Category[] = []): string => {
  const cat = [...DEFAULT_CATEGORIES, ...customCategories].find(c => c.id === categoryId);
  return cat ? cat.icon : '📦';
};

export const getCategoryLabel = (categoryId: string, customCategories: Category[] = []): string => {
  const cat = [...DEFAULT_CATEGORIES, ...customCategories].find(c => c.id === categoryId);
  return cat ? cat.label : 'Outros';
};

// Formats number into specified currency locale
export const formatCurrency = (value: number, currency: 'AOA' | 'BRL' | 'USD' | 'EUR' = 'AOA'): string => {
  switch (currency) {
    case 'AOA':
      // Kwanza format: e.g., Kz 1.850,00
      return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value).replace('AOA', 'Kz').trim();
    case 'BRL':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    case 'EUR':
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
      }).format(value);
    default:
      return `${value.toFixed(2)}`;
  }
};

// Real-time input masking for currency typing (converts digit stream like "2500" to format like "25,00")
export const maskCurrencyInput = (rawText: string, currency: 'AOA' | 'BRL' | 'USD' | 'EUR' = 'AOA'): { numericValue: number; maskedText: string } => {
  // Extract all digits
  const cleanDigits = rawText.replace(/\D/g, '');
  if (!cleanDigits) {
    return { numericValue: 0, maskedText: '' };
  }
  const numericValue = parseInt(cleanDigits, 10) / 100;
  const maskedText = formatCurrency(numericValue, currency);
  return { numericValue, maskedText };
};

// Utility to parse numeric inputs back from masked strings
export const cleanCurrencyString = (val: string): number => {
  const clean = val.replace(/\D/g, '');
  return clean ? parseInt(clean, 10) / 100 : 0;
};

// Human-friendly date formatting
export const formatDateString = (dateStr: string, format: 'DD/MM/YYYY' | 'MM/DD/YYYY' = 'DD/MM/YYYY'): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  
  if (format === 'MM/DD/YYYY') {
    return `${month}/${day}/${year}`;
  }
  return `${day}/${month}/${year}`;
};

// Returns relative time text like "há 2 horas", "ontem", "há 3 dias"
export const getRelativeTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(dateStr + 'T00:00:00');
  
  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Hoje';
  } else if (diffDays === 1) {
    return 'Ontem';
  } else if (diffDays === 2) {
    return 'Anteontem';
  } else if (diffDays > 2 && diffDays <= 7) {
    return `Há ${diffDays} dias`;
  } else if (diffDays > 7 && diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  } else {
    // Return standard formatted date
    return formatDateString(dateStr);
  }
};

// Mock data generator for premium feel
export const getSeededInitialState = (): State => {
  const currentDate = new Date('2026-06-28');
  
  // Format dates relative to 2026-06-28
  const formatDateOffset = (daysAgo: number): string => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const initialGoals: Goal[] = [
    {
      id: 'g-viagem',
      name: 'Viagem dos Sonhos (Europa)',
      targetAmount: 5000000, // 5M Kz
      currentAmount: 2200000,
      deadline: '2026-12-31',
      categoryId: 'viagem',
      priority: 'high',
      status: 'active',
      createdAt: formatDateOffset(120),
      color: '#45B7D1',
      icon: '✈️',
      notes: 'Passagens, hotéis e alimentação para duas semanas em Portugal e Espanha.'
    },
    {
      id: 'g-reserva',
      name: 'Fundo de Emergência',
      targetAmount: 3000000, // 3M Kz
      currentAmount: 1800000,
      deadline: '2026-10-15',
      categoryId: 'emergencia',
      priority: 'high',
      status: 'active',
      createdAt: formatDateOffset(180),
      color: '#FF8C00',
      icon: '🚨',
      notes: 'Equivalente a 6 meses de despesas básicas garantidas.'
    },
    {
      id: 'g-notebook',
      name: 'MacBook Pro M3 Max',
      targetAmount: 2400000, // 2.4M Kz
      currentAmount: 2400000,
      deadline: '2026-06-15',
      categoryId: 'notebook',
      priority: 'medium',
      status: 'completed',
      createdAt: formatDateOffset(90),
      color: '#9370DB',
      icon: '💻',
      notes: 'Equipamento essencial para upgrade de produtividade de trabalho.'
    }
  ];

  const initialTransactions: Transaction[] = [
    // June 2026 transactions (Current Month)
    {
      id: 't-1',
      description: 'Depósito Viagem Europa',
      amount: 450000,
      categoryId: 'viagem',
      date: formatDateOffset(2), // June 26
      notes: 'Sobrou do bônus trimestral',
      goalId: 'g-viagem'
    },
    {
      id: 't-2',
      description: 'Poupança Emergência',
      amount: 250000,
      categoryId: 'emergencia',
      date: formatDateOffset(5), // June 23
      notes: 'Transferência mensal automática',
      goalId: 'g-reserva'
    },
    {
      id: 't-3',
      description: 'Cofrinho Casa Nova',
      amount: 150000,
      categoryId: 'casa',
      date: formatDateOffset(10), // June 18
      notes: 'Comprar luminárias e armário planejado'
    },
    {
      id: 't-4',
      description: 'MacBook Pro Conclusão',
      amount: 400000,
      categoryId: 'notebook',
      date: formatDateOffset(13), // June 15
      notes: 'Última parcela para fechar a meta do MacBook!',
      goalId: 'g-notebook'
    },
    {
      id: 't-5',
      description: 'Aporte Carteira de Ações',
      amount: 300000,
      categoryId: 'investimento',
      date: formatDateOffset(18), // June 10
      notes: 'Dividendos reinvestidos + aporte principal'
    },
    {
      id: 't-6',
      description: 'Fundo Faculdade',
      amount: 100000,
      categoryId: 'faculdade',
      date: formatDateOffset(24), // June 4
      notes: 'Mensalidade do MBA'
    },
    // May 2026 transactions
    {
      id: 't-7',
      description: 'Depósito Mensal Viagem',
      amount: 500000,
      categoryId: 'viagem',
      date: formatDateOffset(32), // May 27
      goalId: 'g-viagem'
    },
    {
      id: 't-8',
      description: 'Reserva Financeira Mensal',
      amount: 350000,
      categoryId: 'emergencia',
      date: formatDateOffset(35), // May 24
      goalId: 'g-reserva'
    },
    {
      id: 't-9',
      description: 'MacBook Upgrade',
      amount: 600000,
      categoryId: 'notebook',
      date: formatDateOffset(42), // May 17
      goalId: 'g-notebook'
    },
    {
      id: 't-10',
      description: 'Sobras de Caixa',
      amount: 80000,
      categoryId: 'outros',
      date: formatDateOffset(50) // May 9
    },
    // April 2026 transactions
    {
      id: 't-11',
      description: 'Aporte Viagem',
      amount: 450000,
      categoryId: 'viagem',
      date: formatDateOffset(62),
      goalId: 'g-viagem'
    },
    {
      id: 't-12',
      description: 'Poupança Emergência',
      amount: 350000,
      categoryId: 'emergencia',
      date: formatDateOffset(65),
      goalId: 'g-reserva'
    },
    {
      id: 't-13',
      description: 'MacBook Lançamento',
      amount: 500000,
      categoryId: 'notebook',
      date: formatDateOffset(72),
      goalId: 'g-notebook'
    },
    {
      id: 't-14',
      description: 'Reserva Investimento Bolsa',
      amount: 200000,
      categoryId: 'investimento',
      date: formatDateOffset(80)
    },
    // March 2026 transactions
    {
      id: 't-15',
      description: 'Fundo Viagem Europa',
      amount: 400000,
      categoryId: 'viagem',
      date: formatDateOffset(92),
      goalId: 'g-viagem'
    },
    {
      id: 't-16',
      description: 'Aporte Emergencial',
      amount: 300000,
      categoryId: 'emergencia',
      date: formatDateOffset(95),
      goalId: 'g-reserva'
    },
    {
      id: 't-17',
      description: 'MacBook Início',
      amount: 900000,
      categoryId: 'notebook',
      date: formatDateOffset(102),
      goalId: 'g-notebook'
    },
    {
      id: 't-18',
      description: 'Fundo Emergência Inicial',
      amount: 550000,
      categoryId: 'emergencia',
      date: formatDateOffset(125),
      goalId: 'g-reserva'
    }
  ];

  return {
    transactions: initialTransactions,
    goals: initialGoals,
    settings: {
      username: 'Alberto Chianga',
      theme: 'dark',
      currency: 'AOA',
      defaultMonthlyGoal: 2000000, // 2M Kz monthly savings target
      dateFormat: 'DD/MM/YYYY'
    },
    customCategories: []
  };
};

// Generates and triggers download of CSV report
export const exportCSV = (transactions: Transaction[], customCategories: Category[] = [], currency: 'AOA' | 'BRL' | 'USD' | 'EUR' = 'AOA') => {
  const headers = ['ID', 'Data', 'Valor', 'Moeda', 'Categoria', 'Descrição', 'Observações', 'Vinculado a Meta ID'];
  const rows = transactions.map(t => [
    t.id,
    t.date,
    t.amount.toFixed(2),
    currency,
    getCategoryLabel(t.categoryId, customCategories),
    t.description.replace(/;/g, ','),
    (t.notes || '').replace(/;/g, ','),
    t.goalId || 'Nenhum'
  ]);
  
  // Use BOM for Excel compatibility with Portuguese characters
  const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `smartsave_relatorio_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generates and triggers download of JSON backup
export const exportBackup = (state: State) => {
  const backupData = JSON.stringify({
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    ...state
  }, null, 2);
  
  const blob = new Blob([backupData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `smartsave_backup_${new Date().toISOString().slice(0,10)}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Validates imported JSON schema
export const validateBackupSchema = (data: any): { isValid: boolean; errorMsg?: string; parsedState?: State } => {
  try {
    if (!data || typeof data !== 'object') {
      return { isValid: false, errorMsg: 'O arquivo de backup é inválido ou está corrompido.' };
    }
    
    if (!Array.isArray(data.transactions)) {
      return { isValid: false, errorMsg: 'Formato inválido: lista de transações ausente.' };
    }
    
    if (!Array.isArray(data.goals)) {
      return { isValid: false, errorMsg: 'Formato inválido: lista de metas ausente.' };
    }
    
    if (!data.settings || typeof data.settings !== 'object') {
      return { isValid: false, errorMsg: 'Formato inválido: configurações ausentes.' };
    }
    
    // Validate required fields inside transactions
    for (const t of data.transactions) {
      if (!t.id || typeof t.description !== 'string' || typeof t.amount !== 'number' || !t.categoryId || !t.date) {
        return { isValid: false, errorMsg: 'Uma ou mais transações estão com campos obrigatórios ausentes ou incorretos.' };
      }
    }

    // Validate required fields inside goals
    for (const g of data.goals) {
      if (!g.id || typeof g.name !== 'string' || typeof g.targetAmount !== 'number' || typeof g.currentAmount !== 'number' || !g.deadline) {
        return { isValid: false, errorMsg: 'Uma ou mais metas estão com campos obrigatórios ausentes ou incorretos.' };
      }
    }
    
    const parsedState: State = {
      transactions: data.transactions,
      goals: data.goals,
      settings: {
        username: data.settings.username || 'Usuário SmartSave',
        theme: data.settings.theme === 'light' ? 'light' : 'dark',
        currency: ['AOA', 'BRL', 'USD', 'EUR'].includes(data.settings.currency) ? data.settings.currency : 'AOA',
        defaultMonthlyGoal: typeof data.settings.defaultMonthlyGoal === 'number' ? data.settings.defaultMonthlyGoal : 2000000,
        dateFormat: data.settings.dateFormat === 'MM/DD/YYYY' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'
      },
      customCategories: Array.isArray(data.customCategories) ? data.customCategories : []
    };
    
    return { isValid: true, parsedState };
  } catch (err: any) {
    return { isValid: false, errorMsg: `Erro na leitura do backup: ${err.message}` };
  }
};
