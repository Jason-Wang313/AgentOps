"use client";

import { useState } from "react";
import { LatencyChart } from "@/components/LatencyChart";
import { SearchBar } from "@/components/SearchBar";
import { API_URL } from "@/lib/config";

// 👇 DEFINING THE MISSING INTERFACE
interface Trace {
  agent_id: string;
  latency: number;
  time: string;
  payload: any;
  id: number;
}

export default function Home() {
  // 👇 Updated <any> to <Trace | null> for type safety
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);

  return (
    <main className="min-h-screen bg-black text-zinc-200 p-8">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 max-w-6xl mx-auto gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AgentOps</h1>
          <p className="text-zinc-500">Mission Control Center</p>
        </div>
        {/* Search Bar sits here now */}
        <SearchBar onSelect={(trace: any) => setSelectedTrace(trace)} />
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-zinc-500 text-sm font-medium">Total Events (24h)</h3>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-bold text-white">290M</span>
            <span className="text-green-500 text-sm">+12%</span>
          </div>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-zinc-500 text-sm font-medium">Active Agents</h3>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-bold text-white">8</span>
            <span className="text-green-500 text-sm">+0%</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-zinc-500 text-sm font-medium">Avg Latency</h3>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-bold text-white">45ms</span>
            <span className="text-blue-500 text-sm">-5%</span>
          </div>
        </div>
      </div>

      {/* --- MAIN DASHBOARD GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        
        {/* Left Column: Latency Chart */}
        <div className="lg:col-span-2 space-y-6">
          <LatencyChart />
        </div>

        {/* Right Column: Trace Inspector */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-full min-h-[300px] flex flex-col">
          <h2 className="text-zinc-400 text-sm font-medium mb-4 uppercase tracking-wider">
            Trace Inspector
          </h2>

          {selectedTrace ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl font-bold text-blue-400">{selectedTrace.agent_id}</span>
                  <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                    {selectedTrace.time}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">LATENCY</label>
                    <div className="text-2xl font-mono text-white">
                      {selectedTrace.latency}<span className="text-sm text-zinc-500">ms</span>
                    </div>
                  </div>

                  <div className="p-3 bg-black rounded border border-zinc-800 font-mono text-xs text-green-400 overflow-x-auto max-h-[200px] overflow-y-auto">
                    <p className="text-zinc-500 mb-1"># Payload Data</p>
                    {JSON.stringify(selectedTrace.payload, null, 2)}
                  </div>
                </div>
              </div>

              {/* 👇 THE FIXED BUTTON CODE (Safe String) 👇 */}
              <button 
                onClick={async () => {
                  if(!confirm("Are you sure?")) return;
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  await fetch(`${apiUrl}/traces/${selectedTrace.id}`, { method: 'DELETE' });
                  setSelectedTrace(null); 
                  alert("Resolved! 🧹");
                }}
                className="mt-6 w-full bg-red-500/10 text-red-500 border border-red-500/50 py-3 rounded-lg flex justify-center hover:bg-red-500/20"
              >
                🗑️ Resolve Incident
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
                🔍
              </div>
              <p className="text-sm">Select an agent to inspect details</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}