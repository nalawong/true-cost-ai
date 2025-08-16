"use client";

import React, { useEffect, useRef, useState } from "react";

// Gen Z facts for loading screen
const funFacts = [
  "No cap, that iPhone probably cost like $50 to make but they're charging you $1000+ 💀",
  "Bestie, your Starbucks cup is literally just paper but they're making bank on it ☕️",
  "Fr fr, that designer bag is just leather and thread but they're taxing you $500+ 💼",
  "Periodt, some brands be having 1000%+ markup and we're just eating it up 😭",
  "Slay, the fashion industry be marking up clothes by 400-800% and we still buy it 👗",
  "No lie, electronics have the highest profit margins and we're all falling for it 📱",
  "Fr, that $200 sneaker probably cost $20 to make and we're still copping it 👟",
  "Literally, luxury brands be having 10x markup and we're still obsessed ✨",
  "Periodt, bottled water has 4000% markup and we're still buying it 💧",
  "Bestie, some products are literally just repackaged versions of cheaper stuff 🤡"
];

// ----------------------------------------------
// Helpers + Lightweight Tests
// ----------------------------------------------
function sanitizeResult(raw: any) {
  const res = raw ? { ...raw } : {};
  
  // Sanitize estimatedBOM
  if (res.estimatedBOM) {
    let low = Number(res.estimatedBOM.lowUSD ?? 0);
    let high = Number(res.estimatedBOM.highUSD ?? low);
    if (Number.isNaN(low)) low = 0;
    if (Number.isNaN(high)) high = low;
    // clamp & order
    low = Math.max(0, low);
    high = Math.max(low, high);
    res.estimatedBOM = { ...res.estimatedBOM, lowUSD: low, highUSD: high };
  }
  
  // Sanitize marketPrice
  if (res.marketPrice) {
    let low = Number(res.marketPrice.lowUSD ?? 0);
    let high = Number(res.marketPrice.highUSD ?? low);
    if (Number.isNaN(low)) low = 0;
    if (Number.isNaN(high)) high = low;
    // clamp & order
    low = Math.max(0, low);
    high = Math.max(low, high);
    res.marketPrice = { 
      ...res.marketPrice, 
      lowUSD: low, 
      highUSD: high,
      currency: res.marketPrice.currency || 'USD',
      notes: res.marketPrice.notes || ''
    };
  }
  
  return res;
}

function runSanitizeResultTests() {
  const cases = [
    {
      name: "orders high >= low",
      input: { estimatedBOM: { lowUSD: 12, highUSD: 5 } },
      check: (out: any) => out.estimatedBOM.lowUSD === 12 && out.estimatedBOM.highUSD === 12,
    },
    {
      name: "clamps negatives to 0",
      input: { estimatedBOM: { lowUSD: -3, highUSD: -1 } },
      check: (out: any) => out.estimatedBOM.lowUSD === 0 && out.estimatedBOM.highUSD === 0,
    },
    {
      name: "missing high uses low",
      input: { estimatedBOM: { lowUSD: 7 } },
      check: (out: any) => out.estimatedBOM.lowUSD === 7 && out.estimatedBOM.highUSD === 7,
    },
    {
      name: "NaN becomes 0",
      input: { estimatedBOM: { lowUSD: "nope", highUSD: "nah" } },
      check: (out: any) => out.estimatedBOM.lowUSD === 0 && out.estimatedBOM.highUSD === 0,
    },
  ];
  let passed = 0;
  for (const c of cases) {
    const out = sanitizeResult(c.input);
    if (!c.check(out)) {
      console.error("[sanitizeResult test failed]", c.name, out);
    } else {
      passed += 1;
    }
  }
  console.log(`[sanitizeResult] ${passed}/${cases.length} tests passed`);
}

if (typeof window !== "undefined") {
  try { runSanitizeResultTests(); } catch (e) { /* ignore */ }
}

// ----------------------------------------------
// Component
// ----------------------------------------------
export default function TrueCostAI() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [currentFact, setCurrentFact] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    let activeStream: MediaStream | undefined;
    const getCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: false 
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreaming(true);
        }
      } catch (e: any) {
        setError((e && e.message) || "Could not access camera");
      }
    };
    getCam();
    return () => {
      try {
        const s = activeStream || (videoRef.current && videoRef.current.srcObject);
        if (s && 'getTracks' in s) {
          Array.from(s.getTracks()).forEach((t: MediaStreamTrack) => t.stop());
        }
      } catch (_) {}
    };
  }, []);

  const analyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || loading) return;
    
    let progressInterval: NodeJS.Timeout | undefined;
    let factInterval: NodeJS.Timeout | undefined;
    
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setCurrentFact(0);
      
      // Start progress animation
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);
      
      // Rotate through fun facts
      factInterval = setInterval(() => {
        setCurrentFact(prev => (prev + 1) % funFacts.length);
      }, 3000);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const w = video.videoWidth || 720;
      const h = video.videoHeight || 1280;
      
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      console.log("Image captured, size:", dataUrl.length);
      
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      console.log("Frontend received:", json);
      const cleaned = sanitizeResult(json);
      console.log("Cleaned result:", cleaned);
      setResult(cleaned);
    } catch (e: any) {
      console.error("Analysis error:", e);
      setError((e && e.message) || "Analysis failed");
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      if (factInterval) clearInterval(factInterval);
      setLoadingProgress(100);
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
      }, 500);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col p-4 gap-4 bg-white pb-20">
      <header className="w-full flex flex-col sm:flex-row sm:justify-between items-start sm:items-center">
        <h1 className="text-xl sm:text-2xl font-bold">TrueCost AI 💸</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-0">Exposing the real cost of your faves</p>
      </header>

      <section className="w-full flex flex-col gap-4 flex-1">
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white p-3 flex flex-col items-center relative">
          <div className="relative w-full">
            <video ref={videoRef} className="w-full rounded-lg aspect-video object-cover" playsInline muted />
            {loading && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
                <div className="text-white text-center p-6 max-w-sm">
                                     {/* Simple logo */}
                   <div className="mb-6">
                     <div className="text-sm text-gray-300">Exposing the tea on your product</div>
                   </div>
                  
                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs mb-2">
                      <span>Progress</span>
                      <span>{Math.round(loadingProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1 overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${loadingProgress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                                     {/* Fact */}
                   <div className="mb-6">
                     <div className="text-xs text-gray-400 mb-2">💡 The tea</div>
                     <div className="text-sm leading-relaxed">
                       {funFacts[currentFact]}
                     </div>
                   </div>
                  
                  {/* Simple loading dots */}
                  <div className="flex justify-center space-x-2">
                    <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="w-full mt-3 flex gap-2">
            <button 
              onClick={analyzeFrame} 
              disabled={!streaming || loading} 
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-black bg-white hover:bg-gray-50 disabled:opacity-50 transition-all duration-200 font-medium"
            >
              {loading ? "Analyzing..." : "Find actual product cost"}
            </button>
            {result && (
              <button 
                onClick={reset} 
                className="px-4 py-3 rounded-lg border border-gray-300 text-black bg-white hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

                 <div className="rounded-xl overflow-hidden shadow-lg bg-white p-6 border border-gray-100">
           <h2 className="font-bold mb-4 text-lg sm:text-xl text-gray-900 border-b border-gray-200 pb-2">Product cost finder</h2>
           {error && <div className="text-red-700 text-sm bg-red-50 p-3 rounded-lg border border-red-200 font-medium">{error}</div>}
           {!result && !error && <div className="text-gray-600 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">Point your camera at something and click "Find actual product cost" to see what's really going on.</div>}
          {result && (
            <div className="space-y-6 text-sm">
              {result.productName && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                  <div className="text-purple-700 font-semibold text-xs uppercase tracking-wide mb-1">Product</div>
                  <div className="text-lg font-bold text-gray-900">{result.productName}</div>
                </div>
              )}
              {result.category && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-gray-700 font-semibold text-xs uppercase tracking-wide mb-1">Category</div>
                  <div className="text-base font-medium text-gray-900">{result.category}</div>
                </div>
              )}
              {Array.isArray(result.materials) && result.materials.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-gray-700 font-semibold text-xs uppercase tracking-wide mb-2">Likely Materials</div>
                  <ul className="list-disc ml-5 space-y-1">
                    {result.materials.map((m: string, i: number) => (
                      <li key={i} className="text-gray-900 font-medium">{m}</li>
                    ))}
                  </ul>
                </div>
              )}
                             {result.estimatedBOM && (
                 <div className="p-5 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 shadow-sm">
                   <div className="text-red-800 font-bold text-sm uppercase tracking-wide mb-2">💸 What it actually costs to make</div>
                   <div className="text-2xl font-black text-red-900 mb-2">
                     ${result.estimatedBOM.lowUSD.toFixed(2)} – ${result.estimatedBOM.highUSD.toFixed(2)}
                   </div>
                   <div className="text-xs text-red-700 mt-2 leading-relaxed bg-red-100 p-2 rounded border border-red-200">{result.estimatedBOM.methodology}</div>
                 </div>
               )}
              {result.marketPrice && result.marketPrice.lowUSD !== undefined && result.marketPrice.highUSD !== undefined && (
                                 <div className="p-5 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm">
                   <div className="text-blue-800 font-bold text-sm uppercase tracking-wide mb-2">💰 What they're charging you</div>
                   <div className="text-2xl font-black text-blue-900 mb-2">
                     ${Number(result.marketPrice.lowUSD || 0).toFixed(2)} – ${Number(result.marketPrice.highUSD || 0).toFixed(2)}
                   </div>
                   <div className="text-xs text-blue-700 mt-2 leading-relaxed bg-blue-100 p-2 rounded border border-blue-200">{result.marketPrice.notes || ''}</div>
                 </div>
              )}
              {result.estimatedBOM && result.marketPrice && result.estimatedBOM.lowUSD !== undefined && result.estimatedBOM.highUSD !== undefined && result.marketPrice.lowUSD !== undefined && result.marketPrice.highUSD !== undefined && (
                                 <div className="p-5 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-sm">
                   <div className="text-green-800 font-bold text-sm uppercase tracking-wide mb-3">💀 The markup is crazy</div>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="text-gray-600 font-medium text-xs mb-1">Low BOM Cost</div>
                        <div className="text-lg font-bold text-gray-900">${Number(result.estimatedBOM.lowUSD || 0).toFixed(2)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="text-gray-600 font-medium text-xs mb-1">High BOM Cost</div>
                        <div className="text-lg font-bold text-gray-900">${Number(result.estimatedBOM.highUSD || 0).toFixed(2)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="text-gray-600 font-medium text-xs mb-1">Low Market Price</div>
                        <div className="text-lg font-bold text-gray-900">${Number(result.marketPrice.lowUSD || 0).toFixed(2)}</div>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <div className="text-gray-600 font-medium text-xs mb-1">High Market Price</div>
                        <div className="text-lg font-bold text-gray-900">${Number(result.marketPrice.highUSD || 0).toFixed(2)}</div>
                      </div>
                    </div>
                                         <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border border-green-300">
                       <div className="flex justify-between items-center">
                         <span className="text-green-800 font-bold text-base">They're taxing you:</span>
                         <span className="text-green-900 font-black text-xl">
                          {(() => {
                            const lowBOM = Number(result.estimatedBOM.lowUSD || 0);
                            const highBOM = Number(result.estimatedBOM.highUSD || 0);
                            const lowMarket = Number(result.marketPrice.lowUSD || 0);
                            const highMarket = Number(result.marketPrice.highUSD || 0);
                            
                            if (lowMarket <= 0 || highMarket <= 0) return 'N/A';
                            
                            const lowMargin = lowMarket > highBOM ? ((lowMarket - highBOM) / lowMarket * 100) : 0;
                            const highMargin = highMarket > lowBOM ? ((highMarket - lowBOM) / highMarket * 100) : 0;
                            
                            return `${lowMargin.toFixed(1)}% - ${highMargin.toFixed(1)}%`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {result.environmentalImpact && (
                <div className="p-5 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-sm">
                  <div className="text-emerald-800 font-bold text-sm uppercase tracking-wide mb-3">🌱 Environmental Impact</div>
                  <div className="space-y-4">
                    {result.environmentalImpact.carbonFootprint && result.environmentalImpact.carbonFootprint.kgCO2e !== undefined && (
                      <div className="bg-white p-4 rounded-lg border border-emerald-200">
                        <div className="text-emerald-700 font-semibold text-sm mb-2">Carbon Footprint</div>
                        <div className="text-2xl font-black text-emerald-900 mb-2">
                          {Number(result.environmentalImpact.carbonFootprint.kgCO2e || 0).toFixed(1)} kg CO₂e
                        </div>
                        <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 leading-relaxed">
                          {result.environmentalImpact.carbonFootprint.methodology || ''}
                        </div>
                      </div>
                    )}
                    {result.environmentalImpact.sustainabilityScore !== undefined && (
                      <div className="bg-white p-4 rounded-lg border border-emerald-200">
                        <div className="text-emerald-700 font-semibold text-sm mb-2">Sustainability Score</div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl font-black text-emerald-900">
                            {Number(result.environmentalImpact.sustainabilityScore || 0).toFixed(0)}/100
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-3 shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-300 shadow-sm"
                              style={{ width: `${Math.min(100, Math.max(0, Number(result.environmentalImpact.sustainabilityScore || 0)))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {result.environmentalImpact.recyclability && result.environmentalImpact.recyclability.percentage !== undefined && (
                      <div className="bg-white p-4 rounded-lg border border-emerald-200">
                        <div className="text-emerald-700 font-semibold text-sm mb-2">Recyclability</div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl font-black text-emerald-900">
                            {Number(result.environmentalImpact.recyclability.percentage || 0).toFixed(0)}%
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-3 shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300 shadow-sm"
                              style={{ width: `${Math.min(100, Math.max(0, Number(result.environmentalImpact.recyclability.percentage || 0)))}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200 leading-relaxed">
                          {result.environmentalImpact.recyclability.notes || ''}
                        </div>
                      </div>
                    )}
                    {result.environmentalImpact.environmentalNotes && (
                      <div className="text-sm text-emerald-800 bg-emerald-100 p-3 rounded-lg border border-emerald-300 font-medium leading-relaxed">
                        {result.environmentalImpact.environmentalNotes}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {result.retailEstimates && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-gray-700 font-semibold text-xs uppercase tracking-wide mb-2">Retail Context</div>
                  <div className="text-sm text-gray-900 leading-relaxed bg-white p-3 rounded border border-gray-200">{result.retailEstimates.commentary}</div>
                </div>
              )}
              {typeof result.confidence === "number" && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-gray-700 font-semibold text-xs uppercase tracking-wide mb-2">Confidence</div>
                  <div className="text-lg font-bold text-gray-900">{Math.round(result.confidence * 100)}%</div>
                </div>
              )}
              {result.caution && (
                <div className="text-sm text-amber-800 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-lg border-2 border-amber-200 font-medium leading-relaxed shadow-sm">{result.caution}</div>
              )}
            </div>
          )}
        </div>
      </section>

            <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
