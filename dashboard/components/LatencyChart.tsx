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
      fetch('https://agentops-e0zs.onrender.com/stats')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(data => {
          setStatus("Connected");
          const rawData = Array.isArray(data) ? data : (data.history || []);
          
          if (rawData.length === 0) {
            setStatus("No Data");
            return;
          }

          const formattedData = rawData.map((item: any) => ({
            time: item.time,
            latency: item.latency
          }));

          setChartData(formattedData);
        })
        .catch(err => {
          console.error("Fetch error:", err);
          setStatus("Error");
        });
    };

    fetchData(); // Fetch immediately
    const interval = setInterval(fetchData, 1000); // <--- UPDATE EVERY 1 SECOND
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return <div className="h-[300px] w-full bg-zinc-900/50 rounded-xl" />;

  return (
    <div 
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 relative"
      style={{ height: '350px', width: '100%' }}
    >
      <div className="absolute top-4 right-4 z-10">
        <span className={`text-xs px-2 py-1 rounded-full ${
          status === "Connected" ? "bg-green-500/20 text-green-400" : 
          status === "Error" ? "bg-red-500/20 text-red-400" : 
          "bg-yellow-500/20 text-yellow-400"
        }`}>
          {status}
        </span>
      </div>

      <h3 className="text-zinc-400 text-sm font-medium mb-4">Real-time Latency (ms)</h3>

      {chartData.length > 0 ? (
        <div style={{ width: '100%', height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="time" stroke="#666" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
              <YAxis stroke="#666" tick={{fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}ms`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} 
                itemStyle={{ color: '#fff' }}
              />
              <Line 
                type="monotone" 
                dataKey="latency" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
          {status === "No Data" ? "Waiting for agents..." : "Initializing..."}
        </div>
      )}
    </div>
  );
}git add .