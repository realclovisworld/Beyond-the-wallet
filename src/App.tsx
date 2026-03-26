import { useState, useMemo, type ReactNode, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line
} from 'recharts';
import { 
  Wallet, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  Info, 
  AlertCircle, 
  CheckCircle2,
  Activity,
  CreditCard,
  History,
  Upload,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Target,
  Droplets,
  LogOut
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { 
  generateSyntheticData, 
  extractFeatures, 
  calculateTrustScore, 
  sampleUsers,
  type CreditReport,
  type Transaction
} from './dataService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(sampleUsers[0].id);
  const [isUploading, setIsUploading] = useState(false);
  const [nudges, setNudges] = useState<string | null>(null);
  const [isGeneratingNudges, setIsGeneratingNudges] = useState(false);

  const [uploadedTransactions, setUploadedTransactions] = useState<Transaction[] | null>(null);

  // Memoized data processing
  const { report, transactions } = useMemo(() => {
    let rawData: Transaction[];
    if (uploadedTransactions) {
      rawData = uploadedTransactions;
    } else {
      const user = sampleUsers.find(u => u.id === selectedUserId)!;
      rawData = generateSyntheticData(user.id, user.profile);
    }
    const features = extractFeatures(rawData);
    const creditReport = calculateTrustScore(features, rawData);
    return { report: creditReport, transactions: rawData.slice(0, 10) };
  }, [selectedUserId, uploadedTransactions]);

  const generateNudges = async () => {
    setIsGeneratingNudges(true);
    try {
      const prompt = `
        System: You are a Lead Fintech Data Scientist and Financial Coach.
        Context: "Beyond the Wallet" AI project.
        User Data:
        - Total Leakage (non-essential spending): ${report.leakage.totalLeakage.toFixed(2)} units
        - Leakage Count: ${report.leakage.leakageCount} small transactions
        - Safe-to-Save (Idle Capital): ${report.leakage.safeToSave.toFixed(2)} units
        - Goal: 500 units stock purchase
        - Days to Goal: ${report.leakage.daysToGoal} days
        
        Task: Generate 3 actionable "Nudges" written in a supportive, coaching tone.
        Format: Markdown list.
        Example: "I noticed you spent 15,000 UGX on small data bundles this week. Buying a weekly 10,000 UGX bundle instead would save you 5,000 UGX for your savings goal."
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setNudges(response.text);
    } catch (error) {
      console.error("Error generating nudges:", error);
      setNudges("I'm having trouble analyzing your leakage right now. Try again in a moment!");
    } finally {
      setIsGeneratingNudges(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      setIsLoggedIn(true);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract-momo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to extract data");

      const data = await response.json();
      
      // Map backend transactions to frontend Transaction type
      const mappedTransactions: Transaction[] = data.transactions.map((t: any) => ({
        user_id: "UPLOADED_USER",
        timestamp: new Date(t.date.split('-').reverse().join('-')), // Convert DD-MM-YYYY to YYYY-MM-DD
        transaction_type: t.details.toLowerCase().includes('topup') || t.details.toLowerCase().includes('airtime') ? 'Bill Pay' : 
                          t.details.toLowerCase().includes('deposit') ? 'Deposit' : 
                          t.details.toLowerCase().includes('p2p') || t.details.toLowerCase().includes('transfer') ? 'P2P' : 'Withdrawal',
        amount: t.amount,
        balance_after: t.balance,
        recipient_id: t.details.match(/REC_\d+/) ? t.details.match(/REC_\d+/)[0] : undefined
      }));

      setUploadedTransactions(mappedTransactions);
      generateNudges();
    } catch (error) {
      console.error("Upload Error:", error);
      alert("Failed to process the PDF. Please ensure it's a valid MoMo statement.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="p-8 bg-emerald-900 text-white text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              <Wallet size={32} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">Beyond the Wallet</h1>
            <p className="text-emerald-200 text-sm mt-2">AI-Driven Financial Inclusion</p>
          </div>
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  required
                />
                <Lock className="absolute right-4 top-3.5 text-gray-300" size={18} />
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
              Sign In
              <ArrowRight size={18} />
            </button>
            <p className="text-center text-xs text-gray-400">
              By signing in, you agree to our <span className="underline">Privacy Policy</span>.
            </p>
          </form>
        </div>
      </div>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  const radarData = [
    { subject: 'Stability', A: Math.round((1 - report.features.financialStability) * 100), fullMark: 100 },
    { subject: 'Reliability', A: Math.round((report.features.utilityReliability / 6) * 100), fullMark: 100 },
    { subject: 'Activity', A: Math.round((report.features.entrepreneurialActivity / 15) * 100), fullMark: 100 },
    { subject: 'Retention', A: Math.round((report.features.retentionRate / 0.5) * 100), fullMark: 100 },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Beyond the Wallet</h1>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-emerald-600">AI for Social Good</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
            >
              {sampleUsers.map(u => (
                <option key={u.id} value={u.id}>{u.desc}</option>
              ))}
            </select>
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Task 4: PDF Upload Section */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-md">
              <h2 className="text-2xl font-bold mb-2">Secure Statement Processing</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Upload your MTN or Airtel MoMo PDF statement. Our AI processes it in memory—no data is stored permanently.
              </p>
              <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest">
                <ShieldCheck size={16} />
                Privacy-First Encryption
              </div>
            </div>
            <div className="w-full md:w-auto">
              <label className={cn(
                "flex flex-col items-center justify-center w-full md:w-64 h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                isUploading ? "bg-emerald-50 border-emerald-300" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              )}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isUploading ? (
                    <>
                      <Activity className="w-8 h-8 mb-3 text-emerald-500 animate-pulse" />
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Processing...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mb-3 text-gray-400" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upload PDF</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
              </label>
            </div>
          </div>
        </section>

        {/* Hero Section */}
        <section className="mb-12">
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Financial Inclusion through AI</h2>
              <p className="text-emerald-100 text-lg leading-relaxed mb-6">
                Most informal workers have high transaction volumes on mobile money but no formal credit history. 
                Our AI translates their digital footprints into a <span className="text-white font-bold underline decoration-emerald-400 underline-offset-4">Trust Score</span>, 
                unlocking access to low-interest capital.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <span className="text-sm font-medium">Alternative Data</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                  <Users size={18} className="text-emerald-400" />
                  <span className="text-sm font-medium">Community Driven</span>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -mr-48 -mb-48 blur-3xl" />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Score & Radar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Score Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Trust Score</h3>
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-gray-100"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={552.92}
                    strokeDashoffset={552.92 - (552.92 * (report.score - 300)) / 550}
                    className={cn(
                      "transition-all duration-1000 ease-out",
                      report.category === 'Prime/Low Risk' ? "text-emerald-500" : 
                      report.category === 'Medium Risk' ? "text-amber-500" : "text-rose-500"
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-gray-900">{report.score}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">of 850</span>
                </div>
              </div>
              <div className={cn(
                "mt-6 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                report.category === 'Prime/Low Risk' ? "bg-emerald-100 text-emerald-700" : 
                report.category === 'Medium Risk' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
              )}>
                {report.category}
              </div>
            </div>

            {/* Savings Potential Dashboard */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Savings Potential</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets size={18} className="text-rose-500" />
                    <span className="text-sm font-medium text-gray-600">Monthly Leakage</span>
                  </div>
                  <span className="font-bold text-rose-600">-{report.leakage.totalLeakage.toFixed(0)} units</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-emerald-500" />
                    <span className="text-sm font-medium text-gray-600">Safe-to-Save</span>
                  </div>
                  <span className="font-bold text-emerald-600">+{report.leakage.safeToSave.toFixed(0)} units</span>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={18} className="text-blue-500" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Goal Tracking</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    At current <span className="font-bold text-emerald-600">Safe-to-Save</span> levels, you are <span className="font-bold text-blue-600">{report.leakage.daysToGoal} days</span> away from your <span className="underline">500 unit stock purchase</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Behavioral Profile</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} />
                    <Radar
                      name="User"
                      dataKey="A"
                      stroke="#059669"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Middle & Right Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Generative Financial Nudges */}
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl p-8 shadow-sm border border-emerald-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Sparkles className="text-emerald-200" size={32} />
              </div>
              <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Activity size={18} />
                AI Financial Coaching
              </h3>
              
              {isGeneratingNudges ? (
                <div className="space-y-4">
                  <div className="h-4 bg-emerald-100 rounded-full w-3/4 animate-pulse" />
                  <div className="h-4 bg-emerald-100 rounded-full w-1/2 animate-pulse" />
                  <div className="h-4 bg-emerald-100 rounded-full w-2/3 animate-pulse" />
                </div>
              ) : nudges ? (
                <div className="prose prose-sm prose-emerald max-w-none">
                  <Markdown>{nudges}</Markdown>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 italic mb-4">Upload a statement to receive personalized AI coaching.</p>
                  <button 
                    onClick={generateNudges}
                    className="text-emerald-600 font-bold text-sm hover:underline"
                  >
                    Or generate from current history →
                  </button>
                </div>
              )}
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard 
                icon={<TrendingUp className="text-emerald-600" />}
                title="Financial Stability"
                value={`${(report.features.financialStability * 100).toFixed(1)}%`}
                desc="Coefficient of variation in monthly deposits. Lower is better."
                impact="Stable income signals low default risk."
              />
              <FeatureCard 
                icon={<Activity className="text-blue-600" />}
                title="Utility Reliability"
                value={`${report.features.utilityReliability} Months`}
                desc="Consistency in paying bills via MoMo."
                impact="Regular bill pay shows high responsibility."
              />
              <FeatureCard 
                icon={<Users className="text-amber-600" />}
                title="Entrepreneurial Activity"
                value={`${report.features.entrepreneurialActivity} Partners`}
                desc="Unique recipients in P2P transfers."
                impact="Large business network indicates growth potential."
              />
              <FeatureCard 
                icon={<CreditCard className="text-rose-600" />}
                title="Retention Rate"
                value={`${(report.features.retentionRate * 100).toFixed(1)}%`}
                desc="Avg % balance remaining 24h after deposit."
                impact="High retention suggests better liquidity management."
              />
            </div>

            {/* SHAP Importance */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Explainability (SHAP)</h3>
                  <p className="text-xs text-gray-500 mt-1">What factors drove this specific score?</p>
                </div>
                <Info size={18} className="text-gray-300" />
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={report.featureImportance} margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {report.featureImportance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Micro-Investment Bot */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4">
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Activity size={12} />
                  AI Bot Active
                </div>
              </div>
              
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Micro-Investment Bot</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{report.savingsPlan.type} Savings Plan</h4>
                      <p className="text-xs text-gray-500">{report.savingsPlan.frequency}</p>
                    </div>
                  </div>
                  
                  <div className="text-3xl font-black text-gray-900 mb-4">
                    {report.savingsPlan.type === 'Percentage' ? `${report.savingsPlan.recommendedAmount}%` : `${report.savingsPlan.recommendedAmount} units`}
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                    <p className="text-sm text-gray-600 leading-relaxed italic">
                      "{report.savingsPlan.reasoning}"
                    </p>
                  </div>
                  
                  <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2">
                    Activate Automated Savings
                    <ArrowRight size={18} />
                  </button>
                </div>
                
                <div className="h-64 w-full">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Projected 6-Month Growth</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.savingsPlan.projectedGrowth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="balance" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Transaction History Preview */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <History size={20} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Recent Digital Footprint</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="pb-4 font-bold">Type</th>
                      <th className="pb-4 font-bold">Amount</th>
                      <th className="pb-4 font-bold">Balance</th>
                      <th className="pb-4 font-bold">Recipient</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((t, i) => (
                      <tr key={i} className="group hover:bg-gray-50 transition-colors">
                        <td className="py-4 font-medium text-gray-900">{t.transaction_type}</td>
                        <td className={cn(
                          "py-4 font-bold",
                          t.transaction_type === 'Deposit' ? "text-emerald-600" : "text-gray-600"
                        )}>
                          {t.transaction_type === 'Deposit' ? '+' : '-'}{t.amount.toFixed(2)}
                        </td>
                        <td className="py-4 text-gray-500">{t.balance_after.toFixed(2)}</td>
                        <td className="py-4 text-gray-400 font-mono text-xs">{t.recipient_id || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Inclusion Flywheel */}
        <section className="mt-16 mb-12">
          <h3 className="text-2xl font-bold text-center mb-12">The Financial Inclusion Flywheel</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <FlywheelStep 
              number="01"
              title="Data Capture"
              desc="Worker uses MoMo for daily business transactions."
            />
            <FlywheelStep 
              number="02"
              title="Trust Creation"
              desc="AI translates raw data into a normalized Score."
            />
            <FlywheelStep 
              number="03"
              title="Capital Access"
              desc="The Score unlocks low-interest formal loans."
            />
            <FlywheelStep 
              number="04"
              title="Growth"
              desc="Business grows, generating more data. Cycle repeats."
            />
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">
            &copy; 2026 Beyond the Wallet. Built for Social Good.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, value, desc, impact }: { icon: ReactNode, title: string, value: string, desc: string, impact: string }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition-all group">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h4 className="font-bold text-gray-900">{title}</h4>
      </div>
      <div className="text-2xl font-black text-gray-900 mb-2">{value}</div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">{desc}</p>
      <div className="pt-4 border-t border-gray-50 flex items-start gap-2">
        <ArrowRight size={14} className="text-emerald-500 mt-0.5 shrink-0" />
        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">{impact}</p>
      </div>
    </div>
  );
}

function FlywheelStep({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="relative group">
      <div className="text-6xl font-black text-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 -left-4 z-0">
        {number}
      </div>
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-6 shadow-lg shadow-emerald-200">
          {number}
        </div>
        <h4 className="text-lg font-bold mb-2">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
