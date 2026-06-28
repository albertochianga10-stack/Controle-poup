export interface Category {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  goalId?: string; // Associated goal
}

export interface Goal {
  id: string;
  name: string;            // Required
  targetAmount: number;    // Required target savings
  currentAmount: number;   // Calculated automatically from associated transactions
  deadline: string;        // Target date (YYYY-MM-DD)
  categoryId: string;      // Linked category
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  createdAt: string;
  color: string;           // Custom hex color
  icon: string;            // Emoji or symbol
  notes?: string;
}

export interface Settings {
  username: string;
  theme: 'dark' | 'light';
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
  defaultMonthlyGoal: number;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
}

export interface State {
  transactions: Transaction[];
  goals: Goal[];
  settings: Settings;
  customCategories: Category[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface HistoryFilters {
  searchQuery: string;
  startDate: string;
  endDate: string;
  selectedCategoryIds: string[];
  minAmount: number;
  maxAmount: number;
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}
