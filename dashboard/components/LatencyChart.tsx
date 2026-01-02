"use client";

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '@/lib/config';

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
      // 1. Use the config API_URL
      fetch('/api/proxy/stats')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(data => {
          setStatus("Connected");
          
          // 2. Handle different data structures (array vs object)
          const rawData = Array.isArray(data) ? data : (data.history || []);
          
          // 3. FIX: Map the CORRECT database fields
          const formattedData = rawData.map((item: any) => ({
            // Backend sends 'ts', not 'timestamp'
            time: new Date(item.ts).toLocaleTimeString(),
            // Backend sends latency inside 'payload' or as 'latency'
            latency: item.payload?.latency || item.latency || 0 
          })).reverse();

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