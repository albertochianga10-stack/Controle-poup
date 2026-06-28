import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Transaction, Goal, Category } from '../types';
import { formatCurrency, getCategoryColor, getCategoryIcon, getCategoryLabel } from '../utils';

// Glass-morphic Tooltip
const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1C2436] border border-[#1E2D45] rounded-xl p-3 shadow-float backdrop-blur-md">
      <p className="text-[#8896B3] text-xs font-semibold mb-1">{label}</p>
      {payload.map((item: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
          <p className="text-[#F0F4FF] font-bold text-sm">
            {item.name}: <span className="font-mono">{formatCurrency(item.value, currency)}</span>
          </p>
        </div>
      ))}
    </div>
  );
};

interface AreaEvolutionProps {
  transactions: Transaction[];
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
}

// 1. AREA CHART - Evolution of Savings (Last 12 Months)
export function AreaEvolutionChart({ transactions, currency }: AreaEvolutionProps) {
  const chartData = useMemo(() => {
    const today = new Date('2026-06-28');
    const result = [];
    
    // Generate last 12 months data
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth();
      
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthLabel = `${monthNames[monthNum]}/${String(year).slice(-2)}`;
      
      // Filter transactions for this month and year
      const total = transactions
        .filter(t => {
          const tDate = new Date(t.date + 'T00:00:00');
          return tDate.getFullYear() === year && tDate.getMonth() === monthNum;
        })
        .reduce((sum, t) => sum + t.amount, 0);
        
      result.push({
        month: monthLabel,
        amount: total,
        'Poupado': total
      });
    }
    return result;
  }, [transactions]);

  return (
    <div className="w-full h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#8896B3', fontSize: 10 }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: '#8896B3', fontSize: 10 }} 
            tickFormatter={(v) => formatCurrency(v, currency).split(',')[0]} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Area 
            type="monotone" 
            dataKey="amount" 
            name="Poupado"
            stroke="#6C63FF" 
            fill="url(#areaGradient)" 
            strokeWidth={2.5} 
            dot={{ r: 3, stroke: '#6C63FF', strokeWidth: 1.5, fill: '#0A0E1A' }} 
            activeDot={{ r: 6 }} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MonthlyComparisonProps {
  transactions: Transaction[];
  customCategories: Category[];
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
}

// 2. BAR CHART - Compare Current vs. Previous Month allocations
export function MonthlyComparisonChart({ transactions, customCategories, currency }: MonthlyComparisonProps) {
  const comparisonData = useMemo(() => {
    const today = new Date('2026-06-28');
    
    // Current month (June 2026)
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Previous month (May 2026)
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();
    
    // Aggregate by categories (limit to top 4 categories to keep design clean)
    const categoryTotalsCurrent: { [key: string]: number } = {};
    const categoryTotalsPrev: { [key: string]: number } = {};
    
    transactions.forEach(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      const yr = tDate.getFullYear();
      const m = tDate.getMonth();
      
      if (yr === currentYear && m === currentMonth) {
        categoryTotalsCurrent[t.categoryId] = (categoryTotalsCurrent[t.categoryId] || 0) + t.amount;
      } else if (yr === prevYear && m === prevMonth) {
        categoryTotalsPrev[t.categoryId] = (categoryTotalsPrev[t.categoryId] || 0) + t.amount;
      }
    });

    // Merge categories
    const allCatIds = Array.from(new Set([...Object.keys(categoryTotalsCurrent), ...Object.keys(categoryTotalsPrev)]));
    
    const result = allCatIds.map(catId => {
      return {
        name: getCategoryLabel(catId, customCategories),
        'Mês Anterior': categoryTotalsPrev[catId] || 0,
        'Mês Atual': categoryTotalsCurrent[catId] || 0,
      };
    });

    // Return top 5 elements by combined volume
    return result
      .sort((a, b) => (b['Mês Atual'] + b['Mês Anterior']) - (a['Mês Atual'] + a['Mês Anterior']))
      .slice(0, 5);
  }, [transactions, customCategories]);

  return (
    <div className="w-full h-[240px]">
      {comparisonData.length === 0 ? (
        <div className="flex items-center justify-center h-full text-xs text-slate-400">
          Dados insuficientes para comparação.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={comparisonData} margin={{ top: 15, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#8896B3', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#8896B3', fontSize: 10 }} 
              tickFormatter={(v) => formatCurrency(v, currency).split(',')[0]}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend 
              verticalAlign="top" 
              height={36} 
              wrapperStyle={{ fontSize: '10px', color: '#F0F4FF' }} 
            />
            <Bar 
              dataKey="Mês Anterior" 
              fill="rgba(108, 99, 255, 0.4)" 
              radius={[4, 4, 0, 0]} 
              animationBegin={0}
              animationDuration={800}
            />
            <Bar 
              dataKey="Mês Atual" 
              fill="#00D4AA" 
              radius={[4, 4, 0, 0]} 
              animationBegin={100}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

interface PieBreakdownProps {
  transactions: Transaction[];
  customCategories: Category[];
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
}

// 3. PIE CHART - Donut breakdown with expanded slice on click
export function CategoryDonutChart({ transactions, customCategories, currency }: PieBreakdownProps) {
  const [activeIndex, setActiveIndex] = useState(-1);

  const pieData = useMemo(() => {
    const categoriesMap: { [key: string]: number } = {};
    let totalAll = 0;
    
    transactions.forEach(t => {
      categoriesMap[t.categoryId] = (categoriesMap[t.categoryId] || 0) + t.amount;
      totalAll += t.amount;
    });

    return Object.entries(categoriesMap).map(([id, amount]) => {
      return {
        id,
        name: getCategoryLabel(id, customCategories),
        value: amount,
        percentage: totalAll > 0 ? (amount / totalAll) * 100 : 0,
        color: getCategoryColor(id, customCategories),
        icon: getCategoryIcon(id, customCategories)
      };
    }).sort((a, b) => b.value - a.value);
  }, [transactions, customCategories]);

  const totalSaved = useMemo(() => {
    return pieData.reduce((sum, item) => sum + item.value, 0);
  }, [pieData]);

  const handlePieClick = (_: any, index: number) => {
    setActiveIndex(prev => prev === index ? -1 : index);
  };

  return (
    <div className="w-full flex flex-col sm:flex-row items-center gap-6 p-2">
      <div className="relative w-[150px] h-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={68}
              paddingAngle={3}
              dataKey="value"
              onClick={handlePieClick}
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                  style={{
                    filter: activeIndex === index ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none',
                    transform: activeIndex === index ? 'scale(1.04)' : 'none',
                    transformOrigin: '50% 50%',
                    transition: 'all 0.2s ease-out',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any) => [formatCurrency(value, currency), 'Total']}
              contentStyle={{ background: '#111827', borderColor: '#1E2D45', borderRadius: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total label inside donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total</span>
          <span className="text-sm font-extrabold text-slate-100 font-display max-w-[100px] truncate leading-tight mt-0.5">
            {activeIndex !== -1 ? pieData[activeIndex].name : 'Geral'}
          </span>
          <span className="text-[10px] font-bold text-[#00D4AA] font-mono mt-0.5">
            {activeIndex !== -1 
              ? `${pieData[activeIndex].percentage.toFixed(1)}%` 
              : formatCurrency(totalSaved, currency).split(',')[0]}
          </span>
        </div>
      </div>

      {/* Mini scrollable legends breakdown list */}
      <div className="flex-1 w-full flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
        {pieData.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setActiveIndex(prev => prev === index ? -1 : index)}
            className={`w-full flex items-center justify-between text-xs p-2 rounded-xl transition-all text-left ${activeIndex === index ? 'bg-indigo-500/10 border border-indigo-500/30' : 'border border-transparent hover:bg-slate-800/40'}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{item.icon}</span>
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: item.color }} 
              />
              <span className="text-slate-200 font-medium truncate max-w-[90px]">{item.name}</span>
            </div>
            <div className="text-right font-semibold font-mono text-slate-300">
              <span className="text-indigo-300 block text-[10px]">{item.percentage.toFixed(1)}%</span>
              <span>{formatCurrency(item.value, currency).split(',')[0]}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface LineGoalProgressProps {
  goals: Goal[];
  transactions: Transaction[];
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
}

// 4. LINE CHART - Progress over time of active goals (Max 5)
export function GoalLinesChart({ goals, transactions, currency }: LineGoalProgressProps) {
  const activeGoals = useMemo(() => {
    return goals.filter(g => g.status === 'active').slice(0, 3);
  }, [goals]);

  const lineChartData = useMemo(() => {
    // Generate 6 timestamps intervals from creation to deadline or last 5 months
    const today = new Date('2026-06-28');
    const points = 5;
    const result = [];

    // Let's create monthly points for the past 5 months
    for (let p = points - 1; p >= 0; p--) {
      const pointDate = new Date(today.getFullYear(), today.getMonth() - p, 1);
      const label = `${pointDate.toLocaleString('pt', { month: 'short' })}/${String(pointDate.getFullYear()).slice(-2)}`;
      
      const pointObj: { [key: string]: any } = { name: label };
      
      activeGoals.forEach(g => {
        // Calculate accrued sum up to this specific end of month
        const endOfMonthDate = new Date(pointDate.getFullYear(), pointDate.getMonth() + 1, 0, 23, 59, 59);
        
        const accumulated = transactions
          .filter(t => t.goalId === g.id && new Date(t.date + 'T00:00:00') <= endOfMonthDate)
          .reduce((sum, t) => sum + t.amount, 0);
          
        pointObj[g.name] = accumulated;
      });

      result.push(pointObj);
    }
    return result;
  }, [activeGoals, transactions]);

  return (
    <div className="w-full h-[240px]">
      {activeGoals.length === 0 ? (
        <div className="flex items-center justify-center h-full text-xs text-slate-400 text-center p-4">
          Crie metas de poupança ativas para visualizar o gráfico de progressão temporal.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineChartData} margin={{ top: 15, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#8896B3', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#8896B3', fontSize: 10 }}
              tickFormatter={(v) => formatCurrency(v, currency).split(',')[0]}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend 
              verticalAlign="top" 
              height={36} 
              wrapperStyle={{ fontSize: '9px', color: '#F0F4FF' }} 
            />
            {activeGoals.map((g, idx) => (
              <Line
                key={g.id}
                type="monotone"
                dataKey={g.name}
                stroke={g.color || '#6C63FF'}
                strokeWidth={2}
                dot={{ r: 3, fill: '#0A0E1A', strokeWidth: 1.5 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

interface HorizontalBarProps {
  transactions: Transaction[];
  customCategories: Category[];
  currency: 'AOA' | 'BRL' | 'USD' | 'EUR';
}

// 5. HORIZONTAL BAR CHART - Categories leader breakdown
export function CategoriesHorizontalChart({ transactions, customCategories, currency }: HorizontalBarProps) {
  const listData = useMemo(() => {
    const map: { [key: string]: number } = {};
    transactions.forEach(t => {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });

    const result = Object.entries(map).map(([id, amount]) => {
      return {
        id,
        category: getCategoryLabel(id, customCategories),
        value: amount,
        icon: getCategoryIcon(id, customCategories),
        color: getCategoryColor(id, customCategories)
      };
    }).sort((a, b) => b.value - a.value).slice(0, 6);

    const max = result[0]?.value || 1;
    return result.map(item => ({
      ...item,
      percentageOfMax: (item.value / max) * 100
    }));
  }, [transactions, customCategories]);

  return (
    <div className="w-full flex flex-col gap-3.5 p-1">
      {listData.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-10">
          Nenhum registro para exibir ranking.
        </div>
      ) : (
        listData.map((item, idx) => (
          <div key={item.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-200">
                <span className="w-5 text-center text-sm">{item.icon}</span>
                <span>{item.category}</span>
                {idx < 3 && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.2 rounded font-extrabold uppercase">
                    🏆 {idx + 1}º
                  </span>
                )}
              </div>
              <span className="font-mono font-bold text-slate-100">
                {formatCurrency(item.value, currency)}
              </span>
            </div>
            
            {/* Background progress track */}
            <div className="w-full h-2 rounded-full bg-slate-800/60 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${item.percentageOfMax}%`, 
                  backgroundColor: item.color 
                }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}
