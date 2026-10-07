"use client";
import { useState } from "react";
import { Search, Brain, Shield, Target, AlertCircle, CheckCircle, Zap } from "lucide-react";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [report, setReport] = useState<any>(null);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setReport(null);
    setStatusMsg("Initializing validation agent...");

    try {
      // Connect to our Python FastAPI Backend
      const response = await fetch("http://localhost:8000/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, audience }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.replace("data: ", ""));
            if (data.status === "thinking") {
              setStatusMsg(data.message);
            } else if (data.status === "complete") {
              setReport(data.report);
              setLoading(false);
            } else if (data.status === "error") {
              setStatusMsg("Error: " + data.message);
              setLoading(false);
            }
          }
        }
      }
    } catch (err) {
      setStatusMsg("Failed to connect to backend. Is the Python server running?");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4 pt-12">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4">
            <Zap className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            AI Startup Validator
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            100% Free AI pipeline. We scrape the live web, analyze competitors, and stress-test your idea using Gemini 1.5.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleValidate} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">What are you building?</label>
              <textarea 
                required
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-28"
                placeholder="e.g., An AI agent that automates inbound customer refunds for Shopify stores."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Who is the target audience?</label>
              <input 
                required
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g., D2C Shopify brands doing $1M-$10M GMV."
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? "Analyzing Market Data..." : "Validate Idea"}
          </button>

          {/* Live Agent Status Ticker */}
          {loading && (
            <div className="mt-6 flex items-center justify-center gap-3 text-indigo-400 animate-pulse bg-indigo-500/10 py-3 rounded-lg border border-indigo-500/20">
              <Brain className="w-5 h-5" />
              <span className="font-mono text-sm">{statusMsg}</span>
            </div>
          )}
        </form>

        {/* Dashboard Results */}
        {report && (
          <div className="space-y-6 pb-20 animate-in fade-in duration-700">
            
            {/* Top Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-neutral-400 text-sm font-medium mb-2">Overall Viability</span>
                <span className={`text-5xl font-bold ${report.score >= 70 ? 'text-emerald-400' : report.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {report.score}/100
                </span>
              </div>
              <div className="col-span-1 md:col-span-2 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Final Verdict</h3>
                  <p className="text-neutral-400">Based on market saturation and technical moat.</p>
                </div>
                <div className={`px-6 py-3 rounded-xl font-bold text-2xl tracking-widest ${
                  report.verdict === 'GO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  report.verdict === 'PIVOT' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {report.verdict}
                </div>
              </div>
            </div>

            {/* Detailed Analysis Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 text-white">
                  <Target className="text-indigo-400" />
                  <h3 className="font-bold text-lg">Market Demand</h3>
                </div>
                <p className="text-neutral-300 leading-relaxed">{report.market_demand}</p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-3 text-white">
                  <Shield className="text-indigo-400" />
                  <h3 className="font-bold text-lg">Defensibility & Moat</h3>
                </div>
                <p className="text-neutral-300 leading-relaxed">{report.defensibility}</p>
              </div>
            </div>

            {/* Competitors & Action Items */}
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-6">
              <h3 className="font-bold text-lg text-white flex items-center gap-3">
                <AlertCircle className="text-indigo-400" /> Competitor Weaknesses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.competitors?.map((c: any, i: number) => (
                  <div key={i} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <span className="font-bold text-white block mb-2">{c.name}</span>
                    <span className="text-sm text-neutral-400">{c.weakness}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-2xl space-y-4">
              <h3 className="font-bold text-lg text-indigo-400 flex items-center gap-3">
                <CheckCircle className="text-indigo-400" /> Execution Playbook
              </h3>
              <ul className="space-y-3">
                {report.recommendations?.map((rec: string, i: number) => (
                  <li key={i} className="flex gap-3 text-neutral-200">
                    <span className="text-indigo-400 font-mono">{i + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}