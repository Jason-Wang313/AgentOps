"use client";

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
      // 1. FIX: Connect directly to Render (Bypass Vercel Proxy)
      fetch('https://agentops-e0zs.onrender.com/stats')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(data => {
          setStatus("Connected");
          
          // 2. Extract the history array safely
          const rawData = Array.isArray(data) ? data : (data.history || []);
          
          // 3. FIX: Map the fields exactly as the new backend sends them
          // Backend now returns pre-formatted: { "time": "HH:MM:SS", "latency": 123 }
          const formattedData = rawData.map((item: any) => ({
            time: item.time,       // Use 'time' directly (not item.ts)
            latency: item.latency  // Use 'latency' directly
          }));

          // Note: We removed .reverse() because the backend now sends data 
          // in chronological order (Oldest -> Newest)

          setChartData(formattedData);
        })
        .catch(err => {
          console.error("Fetch error:", err);
          setStatus("Error");
        });
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return <div className="h-[300px] w-full bg-zinc-900/50 rounded-xl" />;

  return (
    <div className="h-[300px] w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 relative">
      <div className="absolute top-4 right-4 z-10">
        <span className={`text-xs px-2 py-1 rounded-full ${status === "Connected" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
          {status}
        </span>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis dataKey="time" stroke="#666" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
          <YAxis stroke="#666" tick={{fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}ms`} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} 
            itemStyle={{ color: '#fff' }}
          />
          <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}