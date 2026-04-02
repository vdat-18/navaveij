"use client";

import React, { useState } from "react";
import { useAuth } from "@/shared/auth-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import {
  TrendingUp,
  Package,
  Target,
  Sparkles,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  DollarSign,
  Star,
  Users,
  Filter,
  ArrowDown
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/utils";

// In a real app, this would be fetched from an API
import dashboardData from "@/data/manage_stats.json";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value);
};

// --- Animations ---
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemAnim = {
  hidden: { y: 20, opacity: 0 },
  show: { 
    y: 0, 
    opacity: 1, 
    transition: { type: "spring" as const, stiffness: 100 } 
  }
};

const FUNNEL_COLORS = ["#00ABC7", "#0EA5E9", "#34D399", "#52C41A"];
const TIME_RANGES = ["1W", "2W", "1M", "3M", "ALL"] as const;
const TIME_RANGE_LABELS: Record<string, string> = {
  "1W": "1 Week",
  "2W": "2 Weeks",
  "1M": "1 Month",
  "3M": "3 Months",
  "ALL": "All Time",
};

export function ManagementDashboard() {
  const { user } = useAuth();
  const [funnelRange, setFunnelRange] = useState<string>("ALL");
  const {
    overview_metrics: metrics,
    weekly_performance: weekly,
    rejection_reasons: rejections,
    nurse_adoption_rates: nurses,
    conversion_funnel: funnel,
  } = dashboardData as any;

  const getTrendIcon = (direction: string) => {
    if (direction === "up") return <TrendingUp className="w-2.5 h-2.5" />;
    if (direction === "down") return <TrendingDown className="w-2.5 h-2.5" />;
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#F8F9FA] overflow-y-auto custom-scrollbar">
      {/* HUD Header Section */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 mb-8 sticky top-0 z-20 backdrop-blur-md bg-white/80 shrink-0">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#00ABC7]/10 rounded-lg text-[#00ABC7]">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-black text-[#333333] tracking-tighter uppercase italic">Control Room</h1>
            </div>
            <p className="text-[11px] text-slate-500 font-bold tracking-[0.2em] uppercase opacity-60">Performance & Patient Outcome Adoption Metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Live Sync: Active</span>
              </div>
            </div>
            <span className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-black uppercase text-[#333333]">
              {user?.role ?? "executive"}
            </span>
          </div>
        </div>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="px-8 pb-12 space-y-10 flex-1"
      >
        {/* 1. Overview Metrics HUD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {[
            { label: "Total Revenue", value: metrics.total_revenue.value, trend: metrics.total_revenue.trend, dir: metrics.total_revenue.trend_direction, isCurrency: true, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
            { label: "Uplift Revenue", value: metrics.uplift_revenue.value, trend: metrics.uplift_revenue.trend, dir: metrics.uplift_revenue.trend_direction, isCurrency: true, icon: TrendingUp, color: "bg-blue-50 text-blue-600" },
            { label: "Recommended Items", value: metrics.recommended_items.value, trend: metrics.recommended_items.trend, dir: metrics.recommended_items.trend_direction, isCurrency: false, icon: Star, color: "bg-purple-50 text-purple-600" },
            { label: "Package sold", value: metrics.package_sold.value, trend: metrics.package_sold.trend, dir: metrics.package_sold.trend_direction, isCurrency: false, icon: Package, color: "bg-amber-50 text-amber-600" },
            { label: "Adoption Rate", value: metrics.adoption_rate.value, trend: "+5.2%", dir: "up", isCurrency: false, isPercent: true, icon: Users, color: "bg-blue-50 text-blue-600" },
            { label: "Conversion Rate", value: metrics.conversion_rate.value, trend: "-2.1%", dir: "down", isCurrency: false, isPercent: true, icon: Target, color: "bg-red-50 text-red-600" }
          ].map((item, i) => (
            <motion.div key={i} variants={itemAnim} className="navavej-card p-6 bg-white group relative overflow-hidden flex flex-col min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
               <div className="flex justify-between items-start mb-4 relative z-10 w-full">
                  <span className="text-xs font-semibold text-slate-500">{item.label}</span>
                  <div className={cn("p-2 rounded-xl flex items-center justify-center", item.color)}>
                     <item.icon className="w-4 h-4" />
                  </div>
               </div>
               
               <div className="text-2xl font-black text-[#333333] tracking-tight mb-4 relative z-10">
                  {item.isCurrency ? formatCurrency(item.value).replace(".00", "") : item.isPercent ? `${item.value}%` : formatNumber(item.value)}
               </div>
               
               <div className="mt-auto flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-1.5">
                     <div className={cn("flex items-center gap-0.5 text-xs font-bold", 
                       item.dir === 'up' ? "text-emerald-500" : "text-red-500")}>
                        {getTrendIcon(item.dir)} {item.trend}
                     </div>
                     <span className="text-xs text-slate-400 font-medium whitespace-nowrap">vs last month</span>
                  </div>
               </div>
            </motion.div>
          ))}
        </div>

        {/* 2. Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[400px] items-stretch">
          <motion.div variants={itemAnim} className="lg:col-span-8 navavej-card bg-white p-6 flex flex-col group">
             <div className="flex justify-between items-start mb-8">
                <div className="space-y-1">
                   <h2 className="text-base font-black text-[#333333] tracking-tight uppercase italic">Weekly Uplift Revenue</h2>
                   <p className="text-xs text-slate-400 font-bold tracking-[0.1em] uppercase">Historical Performance Trend</p>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#52C41A]" />
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Uplift Revenue</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#818CF8]" />
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Recommendation</span>
                   </div>
                </div>
             </div>

             <div className="flex-1 w-full min-h-[220px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={weekly.chart_data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                   <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#f1f5f9" />
                   <XAxis 
                     dataKey="week" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#64748B', fontSize: 11, fontWeight: 900 }} 
                     dy={12} 
                   />
                   <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#64748B', fontSize: 11, fontWeight: 900 }} 
                     dx={-5} 
                     width={45}
                     tickFormatter={(v) => `${(v / 1000).toFixed(2)}K`} 
                   />
                   <RechartsTooltip 
                     cursor={{ fill: 'rgba(0, 171, 199, 0.02)' }}
                     contentStyle={{ borderRadius: '20px', border: '1px solid #E9ECEF', boxShadow: '0 15px 40px rgba(0,0,0,0.1)', padding: '20px' }}
                     labelStyle={{ fontWeight: 900, fontSize: '12px', color: '#1a1a1a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.15em' }}
                   />
                   <Bar dataKey="upliftRevenue" name="Uplift" fill="#52C41A" radius={[5, 5, 0, 0]} barSize={32} />
                   <Bar dataKey="recommendation" name="Recs" fill="#818CF8" radius={[5, 5, 0, 0]} barSize={32} />
                 </BarChart>
               </ResponsiveContainer>
             </div>

             {/* Bottom Summary Stats */}
             <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-3 gap-4">
                <div className="text-center space-y-1">
                   <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest opacity-60">Total Recommendations</p>
                   <p className="text-xl font-black text-[#333333] tracking-tighter">{weekly.summary.total_recommendations}</p>
                </div>
                <div className="text-center space-y-1 border-x border-slate-50">
                   <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest opacity-60">Accepted</p>
                   <p className="text-xl font-black text-[#333333] tracking-tighter">{weekly.summary.accepted}</p>
                </div>
                <div className="text-center space-y-1">
                   <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest opacity-60">Avg / Week</p>
                   <p className="text-xl font-black text-[#333333] tracking-tighter">
                      {weekly.summary.avg_per_week.currency}{formatNumber(weekly.summary.avg_per_week.value)}
                   </p>
                </div>
             </div>
          </motion.div>

          <motion.div variants={itemAnim} className="lg:col-span-4 navavej-card bg-white p-6 flex flex-col">
             <div className="mb-6">
                <h2 className="text-base font-black text-[#333333] tracking-tight uppercase italic">Rejection Reasons</h2>
                <p className="text-xs text-slate-400 font-bold tracking-[0.1em] uppercase mt-1">Why nurses removed AI suggestions</p>
             </div>
             <div className="flex-1 space-y-5">
                {rejections.data.map((item: any, idx: number) => (
                   <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-end">
                         <span className="text-xs font-black text-[#333333] uppercase tracking-widest">{item.reason}</span>
                         <span className="text-sm font-black text-[#333333]">{item.count} <span className="text-xs text-slate-400">({item.percentage}%)</span></span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                         <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ delay: 1 + idx * 0.1, duration: 1.5 }}
                            className={cn("h-full rounded-full", item.color.includes('red') ? "bg-[#9D0A31]" : "bg-[#00ABC7]")}
                         />
                      </div>
                   </div>
                ))}
             </div>
             
             {rejections.insight && (
                <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl flex gap-3 items-start border border-blue-100/30">
                   <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                   <div className="text-[11px] leading-relaxed text-blue-700/80 font-medium">
                      <span className="font-black text-blue-700">{rejections.insight.text.split(' — ')[0]}</span> — <span className="opacity-80 font-semibold">{rejections.insight.text.split(' — ')[1]}</span>
                   </div>
                </div>
             )}
          </motion.div>
        </div>

        {/* 3. AI-to-Purchase Conversion Pipeline */}
        <motion.div variants={itemAnim} className="navavej-card bg-white p-8 flex flex-col overflow-hidden relative">
           {/* Header + Time Range Selector */}
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div className="space-y-1">
                 <h2 className="text-xl font-black text-[#333333] tracking-tighter uppercase italic">AI-to-Purchase Conversion Pipeline</h2>
                 <p className="text-xs text-slate-400 font-bold tracking-[0.1em] uppercase opacity-60">Recommendation-to-Revenue Funnel Analysis</p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-2xl p-1">
                 {TIME_RANGES.map((range) => (
                    <button
                       key={range}
                       onClick={() => setFunnelRange(range)}
                       className={cn(
                          "px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                          funnelRange === range
                             ? "bg-[#00ABC7] text-white shadow-lg shadow-[#00ABC7]/25"
                             : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                       )}
                    >
                       {range}
                    </button>
                 ))}
              </div>
           </div>

           {/* Funnel Visualization */}
           {(() => {
              const stages = funnel.time_ranges[funnelRange]?.stages ?? [];
              const maxValue = stages.length > 0 ? stages[0].value : 1;
              const lastValue = stages.length > 0 ? stages[stages.length - 1].value : 0;
              const conversionRate = maxValue > 0 ? ((lastValue / maxValue) * 100).toFixed(1) : "0.0";

              return (
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Funnel bars */}
                    <div className="lg:col-span-9 space-y-1">
                       {stages.map((stage: any, idx: number) => {
                          const widthPct = (stage.value / maxValue) * 100;
                          const pctOfTotal = ((stage.value / maxValue) * 100).toFixed(1);
                          const dropOff = idx > 0
                             ? (((stages[idx - 1].value - stage.value) / stages[idx - 1].value) * 100).toFixed(1)
                             : null;

                          return (
                             <div key={stage.name}>
                                {/* Drop-off indicator */}
                                {dropOff && (
                                   <div className="flex items-center gap-2 pl-4 py-1.5">
                                      <ArrowDown className="w-3 h-3 text-red-400" />
                                      <span className="text-[11px] font-black text-red-400 tracking-widest">
                                         −{dropOff}% drop-off
                                      </span>
                                      <span className="text-[11px] text-slate-300 font-medium">
                                         ({formatNumber(stages[idx - 1].value - stage.value)} lost)
                                      </span>
                                   </div>
                                )}
                                {/* Bar row */}
                                <div className="flex items-center gap-4">
                                   <div className="w-[180px] shrink-0 text-right">
                                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-tight">
                                         {stage.name}
                                      </span>
                                   </div>
                                   <div className="flex-1 flex items-center gap-4">
                                      <div className="flex-1 h-11 bg-slate-50 rounded-xl overflow-hidden relative">
                                         <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${widthPct}%` }}
                                            transition={{ delay: 0.5 + idx * 0.15, duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                                            className="h-full rounded-xl flex items-center justify-end pr-4 relative overflow-hidden"
                                            style={{
                                               background: `linear-gradient(135deg, ${FUNNEL_COLORS[idx]}CC, ${FUNNEL_COLORS[idx]})`,
                                               boxShadow: `0 4px 15px ${FUNNEL_COLORS[idx]}30`,
                                            }}
                                         >
                                            <span className="text-white font-black text-sm drop-shadow-sm tracking-tight">
                                               {formatNumber(stage.value)}
                                            </span>
                                         </motion.div>
                                      </div>
                                      <div className="w-[60px] shrink-0">
                                         <span className="text-xs font-black text-slate-400">{pctOfTotal}%</span>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          );
                       })}
                    </div>

                    {/* Conversion Rate Callout */}
                    <div className="lg:col-span-3 flex items-center justify-center">
                       <div className="w-full p-6 rounded-2xl border-2 border-[#00ABC7]/20 bg-gradient-to-br from-[#00ABC7]/5 to-transparent flex flex-col items-center gap-4 text-center">
                          <div className="p-3 bg-[#00ABC7]/10 rounded-2xl">
                             <Target className="w-6 h-6 text-[#00ABC7]" />
                          </div>
                          <div>
                             <div className="text-4xl font-black text-[#333333] tracking-tighter">
                                {conversionRate}%
                             </div>
                             <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                Conversion Rate
                             </div>
                          </div>
                          <div className="w-full h-px bg-slate-100" />
                          <div className="space-y-1">
                             <div className="text-sm font-black text-[#333333] tracking-tight">
                                {formatNumber(lastValue)} <span className="text-slate-300 font-medium">/</span> {formatNumber(maxValue)}
                             </div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Purchased ÷ AI Recs
                             </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl">
                             {TIME_RANGE_LABELS[funnelRange]}
                          </div>
                       </div>
                    </div>
                 </div>
              );
           })()}
        </motion.div>

        {/* 4. Global Practice Adoption Table - MAX PREMIUM */}
        <motion.div variants={itemAnim} className="navavej-card bg-white p-8 flex flex-col overflow-hidden relative border-t-4 border-t-[#00ABC7] shadow-2xl">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 px-4 gap-6">
              <div className="space-y-2">
                 <h2 className="text-xl font-black text-[#333333] tracking-tighter uppercase italic">Sales Adoption Rates</h2>
                 <p className="text-xs text-slate-400 font-bold tracking-[0.1em] uppercase opacity-60">Who trusts the AI recommendations key for change management</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    <span className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">{">"}80% High adopter</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                    <span className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">60-79% Growing</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />
                    <span className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">{"<"}60% Needs support</span>
                 </div>
              </div>
           </div>

           <div className="overflow-x-auto custom-scrollbar pb-4 px-4">
              <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                 <thead>
                    <tr className="text-xs font-black text-slate-400 uppercase tracking-[0.35em] border-b border-slate-100">
                       <th className="pb-4 pr-10">User</th>
                       <th className="pb-4 px-10">Adoption Rate</th>
                       <th className="pb-4 px-10 text-center">Accepted / Total</th>
                       <th className="pb-4 px-10 text-center">Uplift Revenue</th>
                       <th className="pb-4 px-10 text-center">Avg AI Confidence</th>
                       <th className="pb-4 px-10 text-center">Trend</th>
                       <th className="pb-4 px-10 text-center">Last Active</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {nurses.users.map((user: any, idx: number) => {
                       const statusColor = user.adoption_rate >= 80 ? "emerald" : user.adoption_rate >= 60 ? "amber" : "red";
                       const trackBg = statusColor === 'emerald' ? "bg-emerald-500" : statusColor === 'amber' ? "bg-amber-500" : "bg-[#9D0A31]";
                       const textClr = statusColor === 'emerald' ? "text-emerald-700" : statusColor === 'amber' ? "text-amber-700" : "text-[#9D0A31]";

                       return (
                       <tr key={user.id} className="hover:bg-slate-50/80 transition-all group">
                          <td className="py-4 pr-10">
                             <div className="flex items-center gap-4">
                                <div className={cn("w-9 h-9 rounded-[12px] flex items-center justify-center font-black text-xs text-white shadow-lg", trackBg)}>
                                   {user.name[0]}
                                </div>
                                <div className="space-y-0.5">
                                   <div className="font-black text-[#333333] text-sm tracking-tight group-hover:text-[#00ABC7] transition-colors">
                                      {user.name}
                                   </div>
                                   {user.badge && (
                                      <div className="text-[11px] text-[#00ABC7] font-black uppercase tracking-widest">{user.badge}</div>
                                   )}
                                </div>
                             </div>
                          </td>
                          <td className="py-4 px-10">
                             <div className="flex items-center gap-4 min-w-[180px]">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                   <motion.div 
                                      initial={{ width: 0 }} 
                                      animate={{ width: `${user.adoption_rate}%` }} 
                                      transition={{ delay: 1.2 + idx * 0.1, duration: 2 }}
                                      className={cn("h-full rounded-full shadow-sm", trackBg)}
                                   />
                                </div>
                                <span className={cn("font-black text-sm", textClr)}>{user.adoption_rate}%</span>
                             </div>
                          </td>
                          <td className="py-4 px-10 text-center font-black text-[#333333] text-sm tracking-tighter">
                             {user.accepted} <span className="text-slate-200 text-xs font-medium mx-1">/</span> <span className="text-slate-400 text-xs font-bold">{user.total}</span>
                             <span className="text-[#9D0A31] text-xs font-bold ml-2">({user.rejected} rej.)</span>
                          </td>
                          <td className="py-4 px-10 text-center font-black text-[#333333] text-sm tracking-tighter">
                             {formatCurrency(user.uplift_revenue).replace(".00", "")}
                          </td>
                          <td className="py-4 px-10 text-center text-[#333333]">
                             <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                                <Activity className="w-3.5 h-3.5 text-blue-400 opacity-60" />
                                <span>{user.avg_ai_confidence}%</span>
                             </div>
                          </td>
                          <td className="py-4 px-10 text-center">
                             <div className={cn("flex items-center justify-center gap-1 font-black text-[11px]", 
                                user.trend_direction === 'up' ? "text-emerald-500" : user.trend_direction === 'down' ? "text-red-500" : "text-slate-400")}>
                                {getTrendIcon(user.trend_direction)}
                                <span className="uppercase">{user.trend}</span>
                             </div>
                          </td>
                          <td className="py-4 px-10 text-center">
                             <div className="text-slate-400 font-bold text-[11px] tracking-tight">{user.last_active}</div>
                          </td>
                       </tr>
                    )})}
                 </tbody>
              </table>
           </div>
            {nurses.insight && (
               <div className="mt-8 p-6 bg-blue-50/50 rounded-2xl flex gap-4 items-start border border-blue-100/30">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed text-blue-700/80 font-medium">
                     <span className="font-extrabold text-blue-700">Napaporn Wongchai</span> and <span className="font-extrabold text-blue-700">Prapa Sangthong</span> have adoption rates <span className="font-black text-blue-700">below 60%</span>. Consider <span className="font-black text-blue-700 uppercase tracking-wider">1:1 coaching sessions</span> and reviewing which recommendation categories they reject most. Low adoption correlates with <span className="font-extrabold text-red-600">฿86,200/mo</span> in <span className="font-black text-blue-700 italic">unrealized revenue</span>.
                  </div>
               </div>
            )}
         </motion.div>
      </motion.div>
    </div>
  );
}
