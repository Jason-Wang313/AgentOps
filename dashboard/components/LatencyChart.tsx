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

    const fetchData = async () => {
      try {
        const res = await fetch('https://agentops-e0zs.onrender.com/stats');
        const data = await res.json();
        const rawData = Array.isArray(data) ? data : (data.history || []);
        
        if (rawData.length > 0) {
          // Keep only the last 20-30 points to ensure smooth scrolling performance
          const slicedData = rawData.slice(-30); 
          
          const formattedData = slicedData.map((item: any) => ({
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

    // CRITICAL CHANGE: 
    // Ideally, for "liquid" smooth motion, you want 100ms or faster.
    // If your API limit allows, set this to 100. If 200 is fixed, the chart will step at 5fps.
    const interval = setInterval(fetchData, 100); 
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return <div className="h-[350px] w-full bg-black rounded-xl" />;

  return (
    <div className="bg-black border border-zinc-800 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between" style={{ height: '350px', width: '100%' }}>
      
      {/* Live Neon Indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
        <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-[0.2em]">Live Uplink</span>
      </div>

      <h3 className="text-zinc-500 text-[10px] font-bold mb-2 tracking-[0.3em] uppercase">System Latency Monitor</h3>

      <div className="w-full h-[260px] min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              {/* === GRADIENT MATCHING THE VIDEO === */}
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0891b2" /> {/* Darker Cyan */}
                <stop offset="100%" stopColor="#22d3ee" /> {/* Bright Cyan */}
              </linearGradient>
              
              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="0" stroke="#111" vertical={false} />
            <XAxis dataKey="time" hide />
            {/* Fixed domain is crucial for the 'wave' effect so the Y-axis doesn't jump */}
            <YAxis domain={[0, 'auto']} hide />
            
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #222', fontSize: '12px', borderRadius: '8px' }}
              itemStyle={{ color: '#22d3ee' }}
              cursor={{ stroke: '#333', strokeWidth: 1 }}
            />

            <Area 
              // 'basis' creates the liquid curve
              type="basis" 
              dataKey="latency" 
              stroke="url(#lineGradient)" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorLatency)" 
              
              // === THE FIX ===
              // We DISABLE internal animation. 
              // This stops the chart from "morphing" and allows it to "stream" 
              // smoothly as new data points arrive.
              isAnimationActive={false}
              
              style={{
                filter: 'drop-shadow(0px 0px 6px rgba(6, 182, 212, 0.5))',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-2 flex justify-between items-center opacity-30">
        <div className="text-[9px] text-white font-mono uppercase">Buffer: Stable</div>
        <div className="text-[9px] text-white font-mono uppercase">Status: Optimal</div>
      </div>
    </div>
  );
}