"use client";

import React from "react";
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
  LayoutDashboard
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/utils";

// In a real app, this would be fetched from an API
import dashboardData from "@/assets/manage_stats.json";

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

export function ManagementDashboard() {
  const {
    overview_metrics: metrics,
    weekly_performance: weekly,
    rejection_reasons: rejections,
    nurse_adoption_rates: nurses,
  } = dashboardData;

  const getTrendIcon = (direction: string) => {
    if (direction === "up") return <ArrowUpRight className="w-3 h-3" />;
    if (direction === "down") return <ArrowDownRight className="w-3 h-3" />;
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
            <p className="text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase opacity-60">Performance & Patient Outcome Adoption Metrics</p>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Sync: Active</span>
            </div>
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
            { label: "Gross Revenue", value: metrics.total_revenue.value, trend: metrics.total_revenue.trend, dir: metrics.total_revenue.trend_direction, isCurrency: true, icon: Activity, color: "teal" },
            { label: "Uplift Value", value: metrics.uplift_revenue.value, trend: metrics.uplift_revenue.trend, dir: metrics.uplift_revenue.trend_direction, isCurrency: true, icon: TrendingUp, color: "emerald" },
            { label: "Rec. Items", value: metrics.recommended_items.value, trend: metrics.recommended_items.trend, dir: metrics.recommended_items.trend_direction, isCurrency: false, icon: Sparkles, color: "teal" },
            { label: "Packages Sold", value: metrics.package_sold.value, trend: metrics.package_sold.trend, dir: metrics.package_sold.trend_direction, isCurrency: false, icon: Package, color: "amber" },
            { label: "Adoption Rate", value: metrics.adoption_rate.value, trend: "↑ 5.2%", dir: "up", isCurrency: false, isPercent: true, icon: Target, color: "teal" },
            { label: "Efficiency", value: metrics.conversion_rate.value, trend: "↓ 2.1%", dir: "down", isCurrency: false, isPercent: true, icon: Zap, color: "red" }
          ].map((item, i) => (
            <motion.div key={i} variants={itemAnim} className="navavej-card p-5 bg-white group relative overflow-hidden flex flex-col min-h-[140px]">
               <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</span>
                  <item.icon className={cn("w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity", 
                     item.dir === 'up' ? "text-[#00ABC7]" : "text-[#9D0A31]")} />
               </div>
               
               <div className="text-lg font-black text-[#333333] tracking-tighter mb-2 relative z-10">
                  {item.isCurrency ? formatCurrency(item.value).replace(".00", "") : item.isPercent ? `${item.value}%` : formatNumber(item.value)}
               </div>
               
               <div className="mt-auto flex items-center justify-between relative z-10">
                  <div className={cn("flex items-center gap-0.5 text-[9px] font-black px-2 py-0.5 rounded-lg", 
                    item.dir === 'up' ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" : "bg-red-50 text-[#9D0A31] border border-red-100/50")}>
                     {getTrendIcon(item.dir)} {item.trend}
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-200" />
               </div>
            </motion.div>
          ))}
        </div>

        {/* 2. Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[500px] items-stretch">
          <motion.div variants={itemAnim} className="lg:col-span-8 navavej-card bg-white p-8 flex flex-col group">
             <div className="flex justify-between items-start mb-12">
                <div className="space-y-1">
                   <h2 className="text-base font-black text-[#333333] tracking-tight uppercase italic">Clinical Outcome Yield</h2>
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-[2px] bg-[#00ABC7]" />
                     <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">Monthly Revenue Analysis</p>
                   </div>
                </div>
             </div>

             <div className="flex-1 w-full min-h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={weekly.chart_data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                   <CartesianGrid strokeDasharray="10 10" vertical={false} stroke="#f1f5f9" />
                   <XAxis 
                     dataKey="week" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                     dy={15} 
                   />
                   <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                     dx={-5} 
                     width={45}
                     tickFormatter={(v) => `${(v / 1000).toFixed(2)}K`} 
                   />
                   <RechartsTooltip 
                     cursor={{ fill: 'rgba(0, 171, 199, 0.02)' }}
                     contentStyle={{ borderRadius: '20px', border: '1px solid #E9ECEF', boxShadow: '0 15px 40px rgba(0,0,0,0.1)', padding: '20px' }}
                     labelStyle={{ fontWeight: 900, fontSize: '12px', color: '#1a1a1a', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.15em' }}
                   />
                   <Bar dataKey="upliftRevenue" name="Uplift" fill="#00ABC7" radius={[5, 5, 0, 0]} barSize={32} />
                   <Bar dataKey="recommendation" name="Recs" fill="#E9ECEF" radius={[5, 5, 0, 0]} barSize={32} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </motion.div>

          <motion.div variants={itemAnim} className="lg:col-span-4 navavej-card bg-white p-8 flex flex-col">
             <h2 className="text-base font-black text-[#333333] tracking-tight uppercase italic mb-10">Rejection Diagnostics</h2>
             <div className="flex-1 space-y-7">
                {rejections.data.map((item: any, idx: number) => (
                   <div key={idx} className="space-y-3">
                      <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black text-[#333333] uppercase tracking-widest">{item.reason}</span>
                         <span className="text-sm font-black text-[#333333]">{item.count} <span className="text-[10px] text-slate-400">({item.percentage}%)</span></span>
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
          </motion.div>
        </div>

        {/* 3. Global Practice Adoption Table - MAX PREMIUM */}
        <motion.div variants={itemAnim} className="navavej-card bg-white p-12 flex flex-col overflow-hidden relative border-t-4 border-t-[#00ABC7] shadow-2xl">
           <div className="flex justify-between items-end mb-16 px-4">
              <div className="space-y-2">
                 <h2 className="text-xl font-black text-[#333333] tracking-tighter uppercase italic">Operational Excellence Protocol</h2>
                 <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase opacity-60">Personnel Adoption & Performance Velocity</p>
              </div>
           </div>

           <div className="overflow-x-auto custom-scrollbar pb-4 px-4">
              <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
                 <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.35em] border-b border-slate-100">
                       <th className="pb-10 pr-10">Practitioner Infrastructure</th>
                       <th className="pb-10 px-10">Adoption Intensity</th>
                       <th className="pb-10 px-10 text-center">Efficiency Delta</th>
                       <th className="pb-10 px-10 text-center">Value Generation</th>
                       <th className="pb-10 pl-10 text-right">Last Sync</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {nurses.users.map((user: any, idx: number) => {
                       const statusColor = user.adoption_rate >= 80 ? "emerald" : user.adoption_rate >= 60 ? "amber" : "red";
                       const trackBg = statusColor === 'emerald' ? "bg-emerald-500" : statusColor === 'amber' ? "bg-amber-500" : "bg-[#9D0A31]";
                       const textClr = statusColor === 'emerald' ? "text-emerald-700" : statusColor === 'amber' ? "text-amber-700" : "text-[#9D0A31]";
                       const lightBg = statusColor === 'emerald' ? "bg-emerald-50" : statusColor === 'amber' ? "bg-amber-50" : "bg-red-50";

                       return (
                       <tr key={user.id} className="hover:bg-slate-50/80 transition-all group">
                          <td className="py-10 pr-10">
                             <div className="flex items-center gap-6">
                                <div className={cn("w-12 h-12 rounded-[18px] flex items-center justify-center font-black text-sm text-white shadow-lg", trackBg)}>
                                   {user.name[0]}
                                </div>
                                <div className="space-y-1">
                                   <div className="font-black text-[#333333] text-sm tracking-tight group-hover:text-[#00ABC7] transition-colors">
                                      {user.name}
                                   </div>
                                   <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest opacity-60">Clinical Practice Nurse</div>
                                </div>
                             </div>
                          </td>
                          <td className="py-10 px-10">
                             <div className="flex flex-col gap-2 min-w-[200px]">
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-[1px]">
                                   <motion.div 
                                      initial={{ width: 0 }} 
                                      animate={{ width: `${user.adoption_rate}%` }} 
                                      transition={{ delay: 1.2 + idx * 0.1, duration: 2 }}
                                      className={cn("h-full rounded-full shadow-sm relative overflow-hidden", trackBg)}
                                   >
                                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                   </motion.div>
                                </div>
                                <div className={cn("flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-lg font-black text-[10px] uppercase tracking-widest", lightBg, textClr)}>
                                   <Zap className="w-2.5 h-2.5" />
                                   <span>{user.adoption_rate}% ADOPTED</span>
                                </div>
                             </div>
                          </td>
                          <td className="py-10 px-10 text-center font-black text-[#333333] text-base tracking-tighter">
                             {user.accepted} <span className="text-slate-200 text-xs font-medium mx-1">/</span> <span className="text-slate-400 text-xs font-bold">{user.total}</span>
                          </td>
                          <td className="py-10 px-10 text-center font-black text-[#333333] text-base tracking-tighter">
                             {formatCurrency(user.uplift_revenue).replace(".00", "")}
                          </td>
                          <td className="py-10 pl-10 text-right">
                             <div className="text-[#333333] font-black text-[10px] uppercase tracking-tight">{user.last_active}</div>
                             <div className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Protocol Sync OK</div>
                          </td>
                       </tr>
                    )})}
                 </tbody>
              </table>
           </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
