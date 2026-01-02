"use client";

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Defs, LinearGradient, Stop } from 'recharts';

interface ChartDataPoint {
  time: string;
  latency: number;
}

export function LatencyChart() {
  const [status, setStatus] = useState("Connecting...");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const fetchData = () => {
      // Fetch directly from Render
      fetch('https://agentops-e0zs.onrender.com/stats')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(data => {
          setStatus("Live");
          const rawData = Array.isArray(data) ? data : (data.history || []);
          
          if (rawData.length === 0) return;

          const formattedData = rawData.map((item: any) => ({
            time: item.time,
            latency: item.latency
          }));

          setChartData(formattedData);
        })
        .catch(err => setStatus("Error"));
    };

    fetchData();
    // ⚡ SUPER FAST POLLING (100ms) for smooth animation
    const interval = setInterval(fetchData, 100); 
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return <div className="h-[300px] w-full bg-zinc-900/50 rounded-xl" />;

  return (
    <div 
      className="bg-black border border-zinc-800 rounded-xl p-4 relative overflow-hidden"
      style={{ height: '350px', width: '100%' }}
    >
      {/* Live Indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-green-400 font-mono uppercase tracking-wider">
          {status}
        </span>
      </div>

      <h3 className="text-zinc-400 text-sm font-medium mb-4 tracking-wide">REAL-TIME LATENCY</h3>

      {chartData.length > 0 ? (
        <div style={{ width: '100%', height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <defs>
                {/* ✨ The Gradient Definition */}
                <linearGradient id="colorLatency" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={1}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              
              {/* Hide X Axis for cleaner look like the video */}
              <XAxis dataKey="time" hide={true} />
              
              <YAxis 
                stroke="#444" 
                tick={{fontSize: 10, fill: '#666'}} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}ms`}
                domain={[0, 150]} // Keep the scale stable
              />
              
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} 
                itemStyle={{ color: '#fff' }}
                cursor={{ stroke: '#333', strokeWidth: 1 }}
              />
              
              {/* 🌊 The Glowing Line */}
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="url(#colorLatency)" 
                strokeWidth={3} 
                dot={false} 
                isAnimationActive={false}
                style={{ filter: 'drop-shadow(0px 0px 8px rgba(59, 130, 246, 0.5))' }} // NEON GLOW
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-sm animate-pulse">
          INITIALIZING UPLINK...
        </div>
      )}
    </div>
  );
}