'use client';

import React, { useEffect, useRef, useState } from 'react';

// --- Configuration ---
const CONFIG = {
  // Visuals
  LINE_COLOR: '#22d3ee', // Tailwind cyan-400
  FILL_TOP_OPACITY: 0.2,
  GLOW_BLUR: 15,
  LINE_WIDTH: 3,
  
  // Animation Physics
  SCROLL_SPEED: 0.1, // Pixels per millisecond (Higher = faster flow)
  
  // Data
  FETCH_URL: 'https://agentops-e0zs.onrender.com/stats',
  FETCH_INTERVAL: 500, // Fallback if server doesn't dictate
  MAX_LATENCY_Y: 300,  // Latency value that maps to top of graph (scaling)
  KEEP_HISTORY_MS: 10000, // How many seconds of history to keep in memory
};

interface DataPoint {
  val: number;
  time: number;
}

export default function LatencyChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // We use Refs for data to avoid React re-renders interrupting the Canvas loop
  const dataRef = useRef<DataPoint[]>([]);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  
  // For debugging/status only
  const [currentLatency, setCurrentLatency] = useState<number>(0);

  // ---------------------------------------------------------
  // 1. Data Fetching Loop (Decoupled)
  // ---------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const res = await fetch(CONFIG.FETCH_URL);
        const json = await res.json();
        
        if (isMounted && typeof json.latency === 'number') {
          const now = Date.now();
          const newVal = json.latency;
          
          // Add to our data buffer
          dataRef.current.push({ val: newVal, time: now });
          setCurrentLatency(newVal);

          // Prune old data to keep memory usage stable
          const cutoff = now - CONFIG.KEEP_HISTORY_MS;
          if (dataRef.current[0] && dataRef.current[0].time < cutoff) {
             // Removing from front is O(N), but array is small enough (<100 items)
             // for this to be negligible compared to Canvas ops.
            dataRef.current = dataRef.current.filter(p => p.time > cutoff);
          }
        }
      } catch (err) {
        console.error("Fetch failed", err);
      }
      
      if (isMounted) {
        // Use recursive timeout to adjust for network delay variation
        setTimeout(fetchData, 200); 
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, []);

  // ---------------------------------------------------------
  // 2. The Rendering Loop (60FPS Physics)
  // ---------------------------------------------------------
  const draw = (time: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize Logic inline to ensure 1:1 pixel mapping
    const { clientWidth, clientHeight } = container;
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
      canvas.width = clientWidth;
      canvas.height = clientHeight;
    }

    const width = canvas.width;
    const height = canvas.height;
    const now = Date.now();

    // Clear Screen
    ctx.clearRect(0, 0, width, height);

    // --- Prepare Points ---
    // We combine historical data with a "Live Head" point
    // The "Live Head" projects the last known value to "now" so the line 
    // doesn't stop moving while waiting for the next network packet.
    const pointsToRender = [...dataRef.current];
    if (pointsToRender.length > 0) {
        const lastPoint = pointsToRender[pointsToRender.length - 1];
        if (now - lastPoint.time > 0) {
            pointsToRender.push({ val: lastPoint.val, time: now });
        }
    }

    if (pointsToRender.length < 2) {
      requestRef.current = requestAnimationFrame(draw);
      return; 
    }

    // Map Time -> X Coordinates
    // X = Width - (Age of point * Speed)
    // This makes points flow from Right (New) to Left (Old)
    const mappedPoints = pointsToRender.map(p => {
        const age = now - p.time;
        const x = width - (age * CONFIG.SCROLL_SPEED);
        // Map Latency Value to Y (Invert because Canvas Y=0 is top)
        // Clamp value between 0 and 1 for safe scaling
        const normalizedY = Math.min(Math.max(p.val / CONFIG.MAX_LATENCY_Y, 0), 1); 
        // 10% padding on bottom, 20% on top
        const availableHeight = height * 0.7; 
        const y = height - (normalizedY * availableHeight) - (height * 0.15); 
        return { x, y };
    });

    // Filter points that are way off screen to the left to optimize render
    // We keep 1 point off-screen to ensure the line flows out smoothly
    const renderWindow = mappedPoints.filter((p, i, arr) => {
        if (p.x >= -50) return true;
        // Keep the one point immediately to the left of the screen
        if (arr[i+1] && arr[i+1].x > -50) return true;
        return false;
    });

    if (renderWindow.length < 2) {
        requestRef.current = requestAnimationFrame(draw);
        return;
    }

    // --- Draw the "Liquid" Path ---
    ctx.beginPath();
    
    // Start at the first point
    ctx.moveTo(renderWindow[0].x, renderWindow[0].y);

    // Catmull-Rom Spline Interpolation Loop
    for (let i = 0; i < renderWindow.length - 1; i++) {
        const p0 = renderWindow[i - 1] || renderWindow[i]; // Virtual previous
        const p1 = renderWindow[i];
        const p2 = renderWindow[i + 1];
        const p3 = renderWindow[i + 2] || p2; // Virtual next

        // Calculate Control Points using Catmull-Rom algorithm logic
        // Tension 6.0 creates a nice organic curve
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;

        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    // Visual Styling
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = CONFIG.LINE_WIDTH;
    ctx.strokeStyle = CONFIG.LINE_COLOR;
    
    // Glow Effect
    ctx.shadowColor = CONFIG.LINE_COLOR;
    ctx.shadowBlur = CONFIG.GLOW_BLUR;
    
    ctx.stroke();

    // --- Draw Gradient Fill ---
    // Close the path to create a shape for filling
    ctx.lineTo(renderWindow[renderWindow.length - 1].x, height); // Down to bottom-right
    ctx.lineTo(renderWindow[0].x, height); // Left to bottom-left
    ctx.closePath();

    // Turn off shadow for the fill so it doesn't look muddy
    ctx.shadowBlur = 0; 
    
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, hexToRgba(CONFIG.LINE_COLOR, CONFIG.FILL_TOP_OPACITY));
    gradient.addColorStop(1, hexToRgba(CONFIG.LINE_COLOR, 0));
    
    ctx.fillStyle = gradient;
    ctx.fill();

    requestRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(draw);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden backdrop-blur-sm">
        {/* Header / Stats Overlay */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-800/50">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-medium text-cyan-100/70 tracking-wider uppercase">Live Latency</span>
            </div>
            <div className="text-right">
                <span className="text-2xl font-bold text-cyan-400 font-mono tracking-tighter">
                    {currentLatency.toFixed(0)}
                </span>
                <span className="text-xs text-cyan-400/50 ml-1">ms</span>
            </div>
        </div>

        {/* The Canvas Container */}
        <div ref={containerRef} className="relative flex-1 w-full min-h-[200px]">
            {/* CSS Grid Overlay for Retro Effect */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: `linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }} 
            />
            
            <canvas 
                ref={canvasRef}
                className="block w-full h-full"
            />
        </div>
    </div>
  );
}

// Helper to convert hex to rgba for the gradient
function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}