"use client";

import { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  time: string;
  latency: number;
}

export function LatencyChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [mounted, setMounted] = useState(false);
  const dataRef = useRef<ChartDataPoint[]>([]);

  useEffect(() => {
    setMounted(true);
    // ... (Your fetch logic remains the same) ...
    // For this example, I'm keeping your existing fetch logic structure
    const fetchData = async () => {
      try {
        const res = await fetch('https://agentops-e0zs.onrender.com/stats');
        const data = await res.json();
        const rawData = Array.isArray(data) ? data : (data.history || []);
        
        if (rawData.length > 0) {
          const formattedData = rawData.map((item: any) => ({
            time: item.time,
            latency: item.latency
          }));
          
          dataRef.current = formattedData;
          setChartData([...formattedData]);
        }
      } catch (err) {
        console.error("Uplink error:", err);
      }
    };

    const interval = setInterval(fetchData, 200); 
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return <div className="h-[350px] w-full bg-black rounded-xl" />;

  return (
    <div className="bg-black border border-zinc-800 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between" style={{ height: '350px', width: '100%' }}>
      
      {/* Live Neon Indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse" />
        <span className="text-[10px] text-blue-400 font-mono uppercase tracking-[0.2em]">Live Uplink</span>
      </div>

      <h3 className="text-zinc-500 text-[10px] font-bold mb-2 tracking-[0.3em] uppercase">System Latency Monitor</h3>

      <div className="w-full h-[260px] min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              {/* === CHANGE 1: THE BLUE GRADIENT === */}
              {/* This makes the line go from Cyan to Deep Blue (No Purple) */}
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan */}
                <stop offset="100%" stopColor="#2563eb" /> {/* Deep Blue */}
              </linearGradient>
              
              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="0" stroke="#111" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 200]} hide />
            
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #222', fontSize: '12px', borderRadius: '8px' }}
              itemStyle={{ color: '#3b82f6' }}
              cursor={{ stroke: '#222' }}
            />

            <Area 
              // === CHANGE 2: THE SNAKE EFFECT ===
              // 'basis' creates that smooth, organic curve you saw in the video
              type="basis" 
              dataKey="latency" 
              stroke="url(#lineGradient)" 
              strokeWidth={4} 
              fillOpacity={1} 
              fill="url(#colorLatency)" 
              isAnimationActive={true}
              animationDuration={300} 
              style={{
                // === CHANGE 3: THE GLOW ===
                // This adds the neon light effect around the line
                filter: 'drop-shadow(0px 0px 8px rgba(59,