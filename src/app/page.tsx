"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera, DollarSign, TrendingUp, Leaf, AlertTriangle, RefreshCw } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Product Cost Finder</h1>
              <p className="text-muted-foreground mt-1">Exposing the real cost of your faves</p>
            </div>
            <Badge variant="secondary" className="w-fit">
              <Camera className="w-3 h-3 mr-1" />
              AI-Powered Analysis
            </Badge>
          </div>
        </header>

        {/* Camera Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera Feed
            </CardTitle>
            <CardDescription>
              Point your camera at a product to analyze its true cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <video 
                ref={videoRef} 
                className="w-full rounded-lg aspect-video object-cover border" 
                playsInline 
                muted 
              />
              
              {loading && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
                  <div className="text-white text-center p-8 max-w-md">
                    <div className="mb-6">
                      <div className="text-sm text-gray-300 mb-4">Exposing the tea on your product</div>
                      <Progress value={loadingProgress} className="w-full" />
                      <div className="flex justify-between text-xs mt-2">
                        <span>Analyzing...</span>
                        <span>{Math.round(loadingProgress)}%</span>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="text-xs text-gray-400 mb-2">💡 The tea</div>
                      <div className="text-sm leading-relaxed bg-white/10 p-3 rounded">
                        {funFacts[currentFact]}
                      </div>
                    </div>
                    
                    <div className="flex justify-center space-x-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-4">
              <Button 
                onClick={analyzeFrame} 
                disabled={!streaming || loading}
                className="flex-1"
                size="lg"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Find Actual Cost
                  </>
                )}
              </Button>
              {result && (
                <Button 
                  onClick={reset} 
                  variant="outline"
                  size="lg"
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              {error && "An error occurred during analysis"}
              {!result && !error && "Point your camera at something and click 'Find Actual Cost' to see what's really going on."}
              {result && "Here's the breakdown of your product's true cost"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            
            {result && (
              <div className="space-y-6">
                {/* Product Info */}
                {result.productName && (
                  <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-purple-900">{result.productName}</CardTitle>
                      {result.category && (
                        <Badge variant="outline" className="w-fit">
                          {result.category}
                        </Badge>
                      )}
                    </CardHeader>
                  </Card>
                )}

                {/* Materials */}
                {Array.isArray(result.materials) && result.materials.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Likely Materials</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {result.materials.map((m: string, i: number) => (
                          <Badge key={i} variant="secondary">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* BOM Cost */}
                {result.estimatedBOM && (
                  <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        What it actually costs to make
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-3xl font-bold text-red-900 mb-3">
                        ${result.estimatedBOM.lowUSD.toFixed(2)} – ${result.estimatedBOM.highUSD.toFixed(2)}
                      </div>
                      <div className="text-sm text-red-700 bg-red-100 p-3 rounded border border-red-200">
                        {result.estimatedBOM.methodology}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Market Price */}
                {result.marketPrice && result.marketPrice.lowUSD !== undefined && result.marketPrice.highUSD !== undefined && (
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        What they're charging you
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-3xl font-bold text-blue-900 mb-3">
                        ${Number(result.marketPrice.lowUSD || 0).toFixed(2)} – ${Number(result.marketPrice.highUSD || 0).toFixed(2)}
                      </div>
                      {result.marketPrice.notes && (
                        <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded border border-blue-200">
                          {result.marketPrice.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Markup Analysis */}
                {result.estimatedBOM && result.marketPrice && result.estimatedBOM.lowUSD !== undefined && result.estimatedBOM.highUSD !== undefined && result.marketPrice.lowUSD !== undefined && result.marketPrice.highUSD !== undefined && (
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-green-900">💀 The markup is crazy</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-1">Low BOM Cost</div>
                          <div className="text-xl font-bold">${Number(result.estimatedBOM.lowUSD || 0).toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-1">High BOM Cost</div>
                          <div className="text-xl font-bold">${Number(result.estimatedBOM.highUSD || 0).toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-1">Low Market Price</div>
                          <div className="text-xl font-bold">${Number(result.marketPrice.lowUSD || 0).toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-1">High Market Price</div>
                          <div className="text-xl font-bold">${Number(result.marketPrice.highUSD || 0).toFixed(2)}</div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border border-green-300">
                        <div className="flex justify-between items-center">
                          <span className="text-green-800 font-bold">They're taxing you:</span>
                          <span className="text-green-900 font-black text-2xl">
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
                    </CardContent>
                  </Card>
                )}

                {/* Environmental Impact */}
                {result.environmentalImpact && (
                  <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-emerald-900 flex items-center gap-2">
                        <Leaf className="w-5 h-5" />
                        Environmental Impact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {result.environmentalImpact.carbonFootprint && result.environmentalImpact.carbonFootprint.kgCO2e !== undefined && (
                        <div className="bg-white p-4 rounded-lg border border-emerald-200">
                          <div className="text-emerald-700 font-semibold text-sm mb-2">Carbon Footprint</div>
                          <div className="text-2xl font-bold text-emerald-900 mb-2">
                            {Number(result.environmentalImpact.carbonFootprint.kgCO2e || 0).toFixed(1)} kg CO₂e
                          </div>
                          <div className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                            {result.environmentalImpact.carbonFootprint.methodology || ''}
                          </div>
                        </div>
                      )}
                      
                      {result.environmentalImpact.sustainabilityScore !== undefined && (
                        <div className="bg-white p-4 rounded-lg border border-emerald-200">
                          <div className="text-emerald-700 font-semibold text-sm mb-2">Sustainability Score</div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-2xl font-bold text-emerald-900">
                              {Number(result.environmentalImpact.sustainabilityScore || 0).toFixed(0)}/100
                            </div>
                            <Progress 
                              value={Math.min(100, Math.max(0, Number(result.environmentalImpact.sustainabilityScore || 0)))} 
                              className="flex-1"
                            />
                          </div>
                        </div>
                      )}
                      
                      {result.environmentalImpact.recyclability && result.environmentalImpact.recyclability.percentage !== undefined && (
                        <div className="bg-white p-4 rounded-lg border border-emerald-200">
                          <div className="text-emerald-700 font-semibold text-sm mb-2">Recyclability</div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-2xl font-bold text-emerald-900">
                              {Number(result.environmentalImpact.recyclability.percentage || 0).toFixed(0)}%
                            </div>
                            <Progress 
                              value={Math.min(100, Math.max(0, Number(result.environmentalImpact.recyclability.percentage || 0)))} 
                              className="flex-1"
                            />
                          </div>
                          {result.environmentalImpact.recyclability.notes && (
                            <div className="text-sm text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
                              {result.environmentalImpact.recyclability.notes}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {result.environmentalImpact.environmentalNotes && (
                        <div className="text-sm text-emerald-800 bg-emerald-100 p-3 rounded-lg border border-emerald-300 font-medium">
                          {result.environmentalImpact.environmentalNotes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.retailEstimates && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Retail Context</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">
                          {result.retailEstimates.commentary}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {typeof result.confidence === "number" && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Confidence</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl font-bold">{Math.round(result.confidence * 100)}%</div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Caution */}
                {result.caution && (
                  <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">{result.caution}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
