"use client";

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '@/lib/config';

export function LatencyChart() {
  const [status, setStatus] = useState("Connecting...");
  const [chartData, setChartData] = useState([]); 
  const [mounted, setMounted] = useState(false); // <--- NEW: Track if we are in the browser

  useEffect(() => {
    setMounted(true); // <--- NEW: Set to true once the page loads
    
    // 1. Check Health
    fetch(`${API_URL}/`)
      .then(res => res.json())
      .then(() => setStatus("Connected"))
      .catch(() => setStatus("Connection Failed"));

    // 2. Fetch Real Stats
    const fetchData = () => {
      fetch(`${API_URL}/stats`)
        .then(res => res.json())
        .then(data => {
          console.log("📊 Chart Data:", data);
          // If the API returns { history: [...] }, use that. Otherwise use data directly.
          setChartData(data.history || data); 
        })
        .catch(err => console.error("Fetch error:", err));
    };

    fetchData(); 
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval); 
  }, []);

  // <--- NEW: Prevent rendering the chart until the browser is ready
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
          <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} />
          <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}