"use client";

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '@/lib/config';

export function LatencyChart() {
  const [status, setStatus] = useState("Connecting...");
  const [chartData, setChartData] = useState([]); 
  const [mounted, setMounted] = useState(false); // <--- NEW: Track if we are in the browser

  useEffect(() => {
    setMounted(true); // Set to true once the page loads
    
    // 1. Check Health
    const checkHealth = () => {
      fetch(`${API_URL}/`)
        .then(res => res.ok ? res.json() : Promise.reject('Health check failed'))
        .then(() => setStatus("Connected"))
        .catch(() => setStatus("Connection Failed"));
    };

    // 2. Fetch Real Stats
    const fetchData = () => {
      fetch(`${API_URL}/stats`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch stats'))
        .then(data => {
          // The API might return the array in a 'history' property, or as the root object.
          const rawData = data?.history || data;
          
          // **DEFENSIVE CHECK**: Only process the data if it's an array.
          if (Array.isArray(rawData)) {
            const formattedData = rawData.map(item => ({
              // Map API keys to the keys the chart expects.
              time: new Date(item.timestamp).toLocaleTimeString(),
              latency: item.avg_latency
            })).reverse(); // Show latest data on the right.

            setChartData(formattedData);
          } else {
            // If data is not an array, log an error and don't update the chart.
            console.error("Received data is not an array:", rawData);
          }
        })
        .catch(err => {
          console.error("Fetch error:", err);
          // Don't change status here, let the health check handle it.
        });
    };

    checkHealth();
    fetchData();
    const healthInterval = setInterval(checkHealth, 10000);
    const dataInterval = setInterval(fetchData, 5000); 

    return () => {
      clearInterval(healthInterval);
      clearInterval(dataInterval);
    };
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