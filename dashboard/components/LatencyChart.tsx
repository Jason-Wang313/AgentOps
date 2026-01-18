"use client";

import React, { useEffect, useRef, useState } from "react";

// --- CONFIGURATION ---
const ANIMATION_SPEED = 2; // Pixels to scroll per frame (Higher = Faster flow)
const DATA_SMOOTHING = 0.08; // 0.01 (Sluggish) to 1.0 (Instant). 0.08 is "Liquid".
const Y_MAX = 200; // Expected max latency
const Y_MIN = 0;

export function LatencyChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentLatency, setCurrentLatency] = useState(0);

  // We use refs for values that change constantly to avoid React re-renders
  const stateRef = useRef({
    targetVal: 40, // The value the line wants to reach (from API)
    currentVal: 40, // The current position of the line "tip"
    points: [] as number[], // The history of Y positions
    width: 0,
    height: 0,
    isRunning: true,
  });

  // --- 1. DATA FETCHING (The Brain) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://agentops-e0zs.onrender.com/stats');
        const json = await res.json();
        
        // Handle API shape
        const rawData = Array.isArray(json) ? json : (json.history || []);
        
        if (rawData.length > 0) {
          // Get the very latest data point
          const latestItem = rawData[rawData.length - 1];
          const newVal = typeof latestItem === 'object' ? latestItem.latency : latestItem;
          
          // Update the TARGET. The animation loop will gradually move towards this.
          if (typeof newVal === 'number') {
            stateRef.current.targetVal = newVal;
            setCurrentLatency(Math.round(newVal)); // Update UI number
          }
        }
      } catch (err) {
        // Silent fail - chart just keeps flowing flat
      }
    };

    // Fetch often, but the animation doesn't care if this is slow or fast.
    const interval = setInterval(fetchData, 200);
    fetchData(); // Initial
    return () => clearInterval(interval);
  }, []);

  // --- 2. ANIMATION LOOP (The Heart) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle Resize
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      // Set high-res canvas dimensions
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      // Scale down with CSS for sharpness
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      // Normalize coordinate system
      ctx.scale(dpr, dpr);
      
      stateRef.current.width = width;
      stateRef.current.height = height;

      // Pre-fill points array if empty
      if (stateRef.current.points.length === 0) {
        stateRef.current.points = new Array(Math.ceil(width / ANIMATION_SPEED) + 2).fill(40);
      }
    };
    
    // Initial resize
    resize();
    window.addEventListener("resize", resize);

    // The Render Function
    const tick = () => {
      if (!stateRef.current.isRunning) return;

      const { width, height, targetVal, currentVal, points } = stateRef.current;
      
      // A. Physics Step: Smoothly move current value towards target value
      // This is the "Lerp" (Linear Interpolation) math that creates curves from steps
      const delta = targetVal - currentVal;
      stateRef.current.currentVal += delta * DATA_SMOOTHING;
      
      // B. Scroll Step: Remove left point, add new right point
      points.shift();
      points.push(stateRef.current.currentVal);

      // C. Draw Step
      ctx.clearRect(0, 0, width, height);

      // --- Draw Gradient Fill (Area) ---
      // We create a path that goes along the line, then down to bottom corners
      const gradientFill = ctx.createLinearGradient(0, 0, 0, height);
      gradientFill.addColorStop(0, "rgba(6, 182, 212, 0.4)"); // Cyan with opacity
      gradientFill.addColorStop(1, "rgba(6, 182, 212, 0)");   // Transparent at bottom

      ctx.beginPath();
      ctx.moveTo(0, height); // Start bottom left

      // Draw the wave points
      // We iterate backwards/forwards to map the array to X coordinates
      for (let i = 0; i < points.length; i++) {
        // Map Y value to canvas coordinates (inverted because Canvas Y is 0 at top)
        // Normalize: (val - min) / (max - min)
        const normalizedY = (points[i] - Y_MIN) / (Y_MAX - Y_MIN);
        // Clamp between 0.1 and 0.9 to avoid hitting edges too hard
        const clampedY = Math.max(0.05, Math.min(0.95, normalizedY));
        const yPos = height - (clampedY * height);
        
        const xPos = i * ANIMATION_SPEED;
        
        // Use quadratic curves for extra smoothness if needed, 
        // but high-density points (via ANIMATION_SPEED) usually suffice.
        ctx.lineTo(xPos, yPos);
      }

      ctx.lineTo(width, height); // Go to bottom right
      ctx.closePath();
      ctx.fillStyle = gradientFill;
      ctx.fill();

      // --- Draw Neon Line (Stroke) ---
      // Re-trace just the top line for the stroke
      ctx.beginPath();
      const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
      lineGradient.addColorStop(0, "#0891b2");
      lineGradient.addColorStop(1, "#22d3ee"); // Brighter at the "new" end

      for (let i = 0; i < points.length; i++) {
         const normalizedY = (points[i] - Y_MIN) / (Y_MAX - Y_MIN);
         const clampedY = Math.max(0.05, Math.min(0.95, normalizedY));
         const yPos = height - (clampedY * height);
         const xPos = i * ANIMATION_SPEED;
         
         if (i === 0) ctx.moveTo(xPos, yPos);
         else ctx.lineTo(xPos, yPos);
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3;
      ctx.strokeStyle = lineGradient;
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 15; // The Neon Glow
      ctx.stroke();

      // Loop
      requestAnimationFrame(tick);
    };

    const animId = requestAnimationFrame(tick);

    return () => {
      stateRef.current.isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="bg-black border border-zinc-800 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between shadow-2xl" style={{ height: '350px', width: '100%' }}>
      
      {/* UI Overlay (Absolute Positioned on top of Canvas) */}
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-zinc-500 text-[10px] font-bold tracking-[0.3em] uppercase mb-1">
          System Latency
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl text-cyan-400 font-mono font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
            {currentLatency}
          </span>
          <span className="text-xs text-zinc-600 font-mono">ms</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 border border-zinc-800 bg-zinc-900/80 px-2 py-1 rounded-full backdrop-blur-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
        <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest">Live Uplink</span>
      </div>

      {/* The Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0">
         <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Background Grid (CSS) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0" 
           style={{ backgroundImage: `linear-gradient(#222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
      />
      
      {/* Footer Info */}
      <div className="mt-auto z-10 flex justify-between items-center opacity-40 px-1">
        <div className="text-[9px] text-white font-mono uppercase tracking-wider">Stream: Smooth-Lerp</div>
        <div className="text-[9px] text-white font-mono uppercase tracking-wider