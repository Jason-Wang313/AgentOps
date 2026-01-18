"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, useAnimation, useMotionValue } from "framer-motion";
import { clsx } from "clsx";

// --- CONFIGURATION ---
const MAX_DATA_POINTS = 40; // Number of points visible
const FETCH_INTERVAL = 200; // Fetch data every 200ms (Decoupled from anim speed)
const ANIMATION_DURATION = 0.05; // Speed of the scroll (Lower = Faster flow)
const Y_MAX = 250; // Fixed Y-axis max value
const Y_MIN = 0;   // Fixed Y-axis min value

interface DataPoint {
  id: string; // Unique ID for keying
  val: number;
}

export function LatencyChart() {
  // Use a Ref for the queue to prevent re-renders on every incoming packet
  const incomingQueue = useRef<number[]>([]); 
  
  // The visual state (what is currently on screen)
  // Initialize with "flatline" data to start smoothly
  const [data, setData] = useState<DataPoint[]>(() => 
    Array.from({ length: MAX_DATA_POINTS + 2 }).map((_, i) => ({
      id: `init-${i}`,
      val: 20 // Base latency so it's not at very bottom
    }))
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Framer Motion controls
  const controls = useAnimation();

  // --- 1. RESIZE OBSERVER ---
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // --- 2. DATA FETCHER (The Producer) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://agentops-e0zs.onrender.com/stats');
        const json = await res.json();
        
        // Handle different API shapes
        const rawList = Array.isArray(json) ? json : (json.history || []);
        
        if (rawList.length > 0) {
          // We only care about the latest data. 
          // If the API returns a bulk history, we take the last few.
          // If it returns a single point, we push that.
          const latestPoints = rawList.slice(-5).map((d: any) => d.latency);
          
          // Push to our Ref Queue (Avoiding React State for high-freq updates)
          incomingQueue.current.push(...latestPoints);
        }
      } catch (err) {
        console.error("Link Failure", err);
      }
    };

    const interval = setInterval(fetchData, FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // --- 3. ANIMATION LOOP (The Consumer) ---
  useEffect(() => {
    let isRunning = true;

    const tick = async () => {
      if (!isRunning) return;

      // 1. Get next value from queue, or repeat last value (Heartbeat effect)
      // If queue is empty, we maintain the last level to avoid "flatlining" to 0
      const nextValue = incomingQueue.current.length > 0 
        ? incomingQueue.current.shift()! 
        : (data[data.length - 1]?.val || 0);

      // 2. Animate the slide to the left
      // We move x from 0% to -StepSize%
      await controls.start({
        x: -100 / MAX_DATA_POINTS + "%", 
        transition: { duration: ANIMATION_DURATION, ease: "linear" }
      });

      // 3. THE SWAP (The Optical Illusion)
      if (isRunning) {
        setData((prev) => {
          const newData = [...prev.slice(1)]; // Remove first
          newData.push({ 
            id: crypto.randomUUID(), 
            val: nextValue 
          }); // Add new to end
          return newData;
        });

        // Instantly reset X to 0 without animation
        controls.set({ x: "0%" });
        
        // Immediate recursive call for next frame
        requestAnimationFrame(tick);
      }
    };

    tick();
    return () => { isRunning = false; };
  }, [controls]); // Dependencies intentionally empty to run once

  // --- 4. PATH GENERATION (Basis Spline) ---
  // Calculates the SVG path based on current data + dimensions
  const pathData = useMemo(() => {
    if (!dimensions.width || !dimensions.height || data.length === 0) return "";

    // X distance between points
    const stepX = dimensions.width / (MAX_DATA_POINTS - 1);
    
    // Map function for Y
    const getY = (val: number) => {
      const normalized = Math.max(0, Math.min(1, (val - Y_MIN) / (Y_MAX - Y_MIN)));
      return dimensions.height - (normalized * dimensions.height);
    };

    // Construct points array: [[x, y], [x, y]...]
    const points = data.map((d, i) => [i * stepX, getY(d.val)]);

    // Generate smooth curve (Catmull-Rom-like approach simplified)
    // To mimic "Basis" interpolation, we use cubic bezier commands
    if (points.length < 2) return "";

    let d = `M ${points[0][0]},${points[0][1]}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i == 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;

      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
    }

    return d;
  }, [data, dimensions]);


  return (
    <div className="relative w-full h-[350px] bg-black border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-start z-20">
        <div>
          <h3 className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase">
            Latency Stream
          </h3>
          <div className="text-cyan-400 text-2xl font-mono font-bold mt-1 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
            {Math.round(data[data.length - 2]?.val || 0)} <span className="text-xs text-zinc-600">ms</span>
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/50 px-2 py-1 rounded-full backdrop-blur-sm">
           <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
           <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* --- CHART CONTAINER --- */}
      <div ref={containerRef} className="absolute inset-0 top-16 bottom-8 z-10 w-[105%] -left-[2.5%]">
         {/* Motion Div moves the SVG left. 
            We use 105% width to render extra points off-screen for smoothness.
         */}
        <motion.div 
          animate={controls}
          className="w-full h-full"
        >
          <svg className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="gradientStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0891b2" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="1" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* The Line */}
            <path
              d={pathData}
              fill="none"
              stroke="url(#gradientStroke)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              vectorEffect="non-scaling-stroke" 
            />
            
            {/* Optional: Area Fill (Gradient under the line) */}
            <path
              d={`${pathData} L ${dimensions.width} ${dimensions.height} L 0 ${dimensions.height} Z`}
              fill="url(#gradientFill)"
              stroke="none"
              opacity="0.2"
            />
             <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4}/>
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
          </svg>
        </motion.div>
      </div>

      {/* --- GRID LINES (Static Background) --- */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
         <div className="w-full h-full" 
              style={{ backgroundImage: `linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
         ></div>
      </div>

      {/* --- FOOTER --- */}
      <div className="mt-auto flex justify-between items-center opacity-40 z-20">
        <div className="text-[9px] text-white font-mono uppercase tracking-wider">Window: 5s</div>
        <div className="text-[9px] text-white font-mono uppercase tracking-wider">Protocol: WebSocket/REST</div>
      </div>

    </div>
  );
}