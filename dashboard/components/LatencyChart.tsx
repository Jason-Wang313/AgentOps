"use client";

import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  time: string;
  latency: number;
}

export function LatencyChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [mounted, setMounted] = useState(false);
  // Using a ref to track data without triggering re-renders too early
  const dataRef = useRef<ChartDataPoint[]>([]);

  useEffect(() => {
    setMounted(true);

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
          
          // ✨ Update the ref buffer
          dataRef.current = formattedData;
          setChartData([...formattedData]);
        }
      } catch (err) {
        console.error("Uplink error:", err);
      }
    };

    // ⚡ Fast Sync: Poll the server every 200ms
    const interval = setInterval(fetchData, 200); 
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return <div className="h-[350px] w-full bg-black rounded-xl" />;

  return (
    <div className="bg-black border border-zinc-800 rounded-xl p-4 relative overflow-hidden" style={{ height: '350px', width: '100%' }}>
      {/* Live Neon Indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
        <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-[0.2em]">Live Uplink</span>
      </div>

      <h3 className="text-zinc-500 text-[10px] font-bold mb-6 tracking-[0.3em] uppercase">System Latency Monitor</h3>

      <div style={{ width: '100%', height: '260px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="#111" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis 
              domain={[0, 160]} 
              hide 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #222', fontSize: '12px' }}
              itemStyle={{ color: '#06b6d4' }}
              cursor={{ stroke: '#222' }}
            />
            <Line 
              type="basis" // ✨ 'basis' creates the liquid, organic curve from the video
              dataKey="latency" 
              stroke="url(#lineGradient)" 
              strokeWidth={4} 
              dot={false}
              isAnimationActive={true}
              animationDuration={400} // ✨ Smooths the transition between data polls
              style={{
                filter: 'drop-shadow(0px 0px 12px rgba(6, 182, 212, 0.6))',
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Visual Bottom Detail */}
      <div className="mt-4 flex justify-between items-center opacity-30">
        <div className="text-[9px] text-white font-mono">BUFFER_SYNC_STABLE</div>
        <div className="text-[9px] text-white font-mono">98.4% UPTIME</div>
      </div>
    </div>
  );
}