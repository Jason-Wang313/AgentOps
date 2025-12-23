"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { API_URL } from "@/lib/config";

// Define the shape of the data
interface SearchResult {
  agent_id: string;
  latency: number;
  time: string;
  payload?: any; // <--- The secret data
}

interface SearchBarProps {
  onSelect: (result: SearchResult) => void; // <--- Parent callback
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    try {
      const res = await fetch(`${API_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      console.error("Search failed", err);
    }
  };

  return (
    <div className="w-full max-w-md relative">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search agents..."
          className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      {results.length > 0 && (
        <div className="absolute top-12 left-0 w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 z-50 shadow-xl">
          {results.map((r, i) => (
            <div 
              key={i} 
              onClick={() => {
                onSelect(r);   // <--- Send data to parent
                setResults([]); // Close dropdown
                setQuery("");   // Clear search
              }}
              className="flex justify-between p-2 hover:bg-zinc-800 rounded cursor-pointer transition-colors"
            >
              <span className="text-zinc-300 text-sm font-medium">{r.agent_id}</span>
              <span className="text-zinc-500 text-xs">{r.latency}ms • {r.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}