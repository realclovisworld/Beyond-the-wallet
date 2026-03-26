import { subDays, startOfMonth, format, isSameDay, addHours } from 'date-fns';

export type TransactionType = 'Deposit' | 'Withdrawal' | 'P2P' | 'Bill Pay';

export interface Transaction {
  user_id: string;
  timestamp: Date;
  transaction_type: TransactionType;
  amount: number;
  balance_after: number;
  recipient_id?: string;
}

export interface UserFeatures {
  userId: string;
  financialStability: number; // CV of monthly deposits
  utilityReliability: number; // Count of unique months with Bill Pay
  entrepreneurialActivity: number; // Unique recipients in P2P
  retentionRate: number; // Avg % balance remaining 24h after deposit
}

export interface SavingsPlan {
  type: 'Fixed' | 'Percentage' | 'Round-up';
  recommendedAmount: number;
  frequency: string;
  reasoning: string;
  projectedGrowth: { month: string; balance: number }[];
}

export interface LeakageData {
  totalLeakage: number;
  leakageCount: number;
  idleCapital: number;
  safeToSave: number;
  daysToGoal: number;
}

export interface CreditReport {
  userId: string;
  name: string;
  score: number;
  category: 'High Risk' | 'Medium Risk' | 'Prime/Low Risk';
  features: UserFeatures;
  featureImportance: { name: string; value: number }[]; // SHAP simulation
  savingsPlan: SavingsPlan;
  leakage: LeakageData;
}

// Helper to generate synthetic data for a user
export function generateSyntheticData(userId: string, profile: 'stable' | 'unstable' | 'entrepreneur'): Transaction[] {
  const transactions: Transaction[] = [];
  let currentBalance = 100;
  const now = new Date();

  // Generate 6 months of data
  for (let i = 180; i >= 0; i--) {
    const date = subDays(now, i);
    
    // Monthly Deposit (Income)
    if (date.getDate() === 1 || date.getDate() === 15) {
      const depositAmount = profile === 'stable' ? 500 + Math.random() * 50 : 300 + Math.random() * 400;
      currentBalance += depositAmount;
      transactions.push({
        user_id: userId,
        timestamp: date,
        transaction_type: 'Deposit',
        amount: depositAmount,
        balance_after: currentBalance,
      });

      // Check retention 24h later (simulated)
      const spendAmount = profile === 'unstable' ? depositAmount * 0.9 : depositAmount * 0.4;
      currentBalance -= spendAmount;
      transactions.push({
        user_id: userId,
        timestamp: addHours(date, 24),
        transaction_type: 'Withdrawal',
        amount: spendAmount,
        balance_after: currentBalance,
      });
    }

    // Bill Pay (Reliability)
    if (date.getDate() === 5) {
      const billAmount = 50;
      if (profile !== 'unstable' || Math.random() > 0.3) {
        currentBalance -= billAmount;
        transactions.push({
          user_id: userId,
          timestamp: date,
          transaction_type: 'Bill Pay',
          amount: billAmount,
          balance_after: currentBalance,
        });
      }
    }

    // P2P (Business Activity)
    if (Math.random() < (profile === 'entrepreneur' ? 0.4 : 0.1)) {
      const p2pAmount = 20 + Math.random() * 100;
      const recipientId = `REC_${Math.floor(Math.random() * (profile === 'entrepreneur' ? 20 : 5))}`;
      currentBalance -= p2pAmount;
      transactions.push({
        user_id: userId,
        timestamp: date,
        transaction_type: 'P2P',
        amount: p2pAmount,
        balance_after: currentBalance,
        recipient_id: recipientId,
      });
    }
  }

  return transactions;
}

// Task 1: Feature Engineering
export function extractFeatures(df: Transaction[]): UserFeatures {
  const userId = df[0]?.user_id || 'unknown';

  // 1. Financial Stability (CV of monthly deposits)
  const deposits = df.filter(t => t.transaction_type === 'Deposit');
  const monthlySums: Record<string, number> = {};
  deposits.forEach(d => {
    const month = format(startOfMonth(d.timestamp), 'yyyy-MM');
    monthlySums[month] = (monthlySums[month] || 0) + d.amount;
  });
  const sums = Object.values(monthlySums);
  const mean = sums.reduce((a, b) => a + b, 0) / sums.length;
  const stdDev = Math.sqrt(sums.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / sums.length);
  const financialStability = mean === 0 ? 1 : stdDev / mean; // Lower is better (more stable)

  // 2. Utility Reliability (Unique months with Bill Pay)
  const billPays = df.filter(t => t.transaction_type === 'Bill Pay');
  const billMonths = new Set(billPays.map(b => format(startOfMonth(b.timestamp), 'yyyy-MM')));
  const utilityReliability = billMonths.size;

  // 3. Entrepreneurial Activity (Unique recipients in P2P)
  const p2pTransfers = df.filter(t => t.transaction_type === 'P2P');
  const uniqueRecipients = new Set(p2pTransfers.map(p => p.recipient_id));
  const entrepreneurialActivity = uniqueRecipients.size;

  // 4. Retention Rate (Avg % balance remaining 24h after deposit)
  // Simplified: Look at balance 24h after each deposit vs deposit amount
  let totalRetention = 0;
  let depositCount = 0;
  deposits.forEach(d => {
    const nextDayBalance = df.find(t => isSameDay(t.timestamp, addHours(d.timestamp, 24)))?.balance_after || 0;
    totalRetention += Math.min(1, nextDayBalance / d.amount);
    depositCount++;
  });
  const retentionRate = depositCount === 0 ? 0 : totalRetention / depositCount;

  return {
    userId,
    financialStability,
    utilityReliability,
    entrepreneurialActivity,
    retentionRate,
  };
}

// Task 2 & 3: Scoring Engine
export function calculateTrustScore(features: UserFeatures, df: Transaction[]): CreditReport {
  // Normalized weights for our "Random Forest" simulation
  // Stability: Lower CV is better (max 1.0)
  const stabilityScore = Math.max(0, 1 - features.financialStability);
  // Reliability: 6 months is max (1.0)
  const reliabilityScore = Math.min(1, features.utilityReliability / 6);
  // Activity: 15+ recipients is max (1.0)
  const activityScore = Math.min(1, features.entrepreneurialActivity / 15);
  // Retention: 0.5+ is max (1.0)
  const retentionScore = Math.min(1, features.retentionRate / 0.5);

  // Task 2 & 3: Scoring Engine + Task 5: Micro-Investment Bot
  // Weighted probability (P(reliable))
  const p_reliable = (stabilityScore * 0.3) + (reliabilityScore * 0.3) + (activityScore * 0.2) + (retentionScore * 0.2);

  // Formula: S = 300 + (P * 550)
  const score = Math.round(300 + (p_reliable * 550));

  let category: CreditReport['category'] = 'High Risk';
  if (score > 700) category = 'Prime/Low Risk';
  else if (score > 500) category = 'Medium Risk';

  // Micro-Investment Bot Logic
  let savingsPlan: SavingsPlan;
  if (stabilityScore > 0.7) {
    savingsPlan = {
      type: 'Fixed',
      recommendedAmount: 50,
      frequency: 'Monthly',
      reasoning: 'Your income is highly stable. A fixed monthly contribution builds long-term wealth with minimal risk.',
      projectedGrowth: Array.from({ length: 6 }, (_, i) => ({ month: `M${i+1}`, balance: (i + 1) * 50 * 1.05 })),
    };
  } else if (retentionScore > 0.6) {
    savingsPlan = {
      type: 'Percentage',
      recommendedAmount: 5,
      frequency: 'Per Deposit',
      reasoning: 'You retain a good portion of your deposits. Saving 5% of every inflow will grow your buffer without affecting liquidity.',
      projectedGrowth: Array.from({ length: 6 }, (_, i) => ({ month: `M${i+1}`, balance: (i + 1) * 35 * 1.08 })),
    };
  } else {
    savingsPlan = {
      type: 'Round-up',
      recommendedAmount: 0.5,
      frequency: 'Per Transaction',
      reasoning: 'Your cash flow is variable. We recommend rounding up every transaction to the nearest 10 units to save in micro-doses.',
      projectedGrowth: Array.from({ length: 6 }, (_, i) => ({ month: `M${i+1}`, balance: (i + 1) * 15 * 1.03 })),
    };
  }

  // Task 2: Savings & Leakage Engine
  // Find non-essential spending (Leakage)
  // e.g., many small airtime top-ups vs. cheaper bulk bundles
  const withdrawals = df.filter(t => t.transaction_type === 'Withdrawal' || t.transaction_type === 'P2P');
  const smallWithdrawals = withdrawals.filter(w => w.amount < 20); // Simulated "leakage" threshold
  const totalLeakage = smallWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  
  // Calculate "Safe-to-Save" (Idle Capital)
  // Determine avg daily ending balance. If > 20, flag as "Idle Capital"
  const avgBalance = df.length > 0 ? df.reduce((sum, t) => sum + t.balance_after, 0) / df.length : 0;
  const idleCapital = Math.max(0, avgBalance - 20);
  const safeToSave = idleCapital * 0.5; // 50% of idle capital is safe to save
  
  // Goal Tracking: Days to reach 500 units
  const goal = 500;
  const daysToGoal = safeToSave > 0 ? Math.ceil(goal / (safeToSave / 30)) : 999;

  const leakage: LeakageData = {
    totalLeakage,
    leakageCount: smallWithdrawals.length,
    idleCapital,
    safeToSave,
    daysToGoal,
  };

  // SHAP Simulation (Feature Importance)
  const featureImportance = [
    { name: 'Stability', value: stabilityScore * 0.3 },
    { name: 'Reliability', value: reliabilityScore * 0.3 },
    { name: 'Activity', value: activityScore * 0.2 },
    { name: 'Retention', value: retentionScore * 0.2 },
  ].sort((a, b) => b.value - a.value);

  return {
    userId: features.userId,
    name: features.userId === 'USR_001' ? 'Kofi Mensah' : features.userId === 'USR_002' ? 'Amara Diallo' : 'Fatima Zahra',
    score,
    category,
    features,
    featureImportance,
    savingsPlan,
    leakage,
  };
}

export const sampleUsers = [
  { id: 'USR_001', profile: 'stable' as const, desc: 'Market Vendor (Consistent)' },
  { id: 'USR_002', profile: 'entrepreneur' as const, desc: 'Small Business Owner (High Network)' },
  { id: 'USR_003', profile: 'unstable' as const, desc: 'Casual Laborer (Low Retention)' },
];
