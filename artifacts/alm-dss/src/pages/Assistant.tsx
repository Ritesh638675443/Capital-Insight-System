import { useState, useRef, useEffect } from "react";
import { useApiPost } from "@/hooks/useApi";
import { fmtBn, fmtPct, fmt } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface ChatMessage { role: "user" | "assistant"; content: string; }
interface ChatRequest { message: string; conversationHistory: ChatMessage[]; }
interface ChatResponse { response: string; sources: string[]; metrics: Record<string, number>; }

const SUGGESTIONS = [
  "What is our current duration gap and how should we address it?",
  "Analyze our solvency ratio trend and capital adequacy",
  "What's the optimal reinsurance structure for our cat exposure?",
  "How does a 300bp rate shock impact our ALM position?",
  "Recommend portfolio adjustments to improve our Sharpe ratio",
  "Explain the key Solvency II SCR components in our portfolio",
];

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I'm your Insurance ALM Decision Support AI. I have full context on your $2.45B portfolio, solvency position (1.43x SCR), duration gap (1.85 yrs), and catastrophe exposure ($3.2B gross). How can I help with your capital investment decisions today?",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const mutation = useApiPost<ChatRequest, ChatResponse>("/assistant/chat");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, mutation.isPending]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    const userMsg: ChatMessage = { role: "user", content: msg };
    const history = [...messages];
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    mutation.mutate(
      { message: msg, conversationHistory: history },
      {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
        },
        onError: () => {
          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please add your OPENAI_API_KEY to the environment secrets and restart." }]);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="AI Decision Assistant" subtitle="GPT-powered ALM & Capital Investment Advisory — Powered by your portfolio data">
        <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Sparkles className="w-3 h-3" />
          <span>AI Powered</span>
        </div>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 mt-0.5 ${msg.role === "assistant" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                  {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === "assistant" ? "bg-card border border-card-border text-foreground" : "bg-primary text-primary-foreground"}`}>
                  {msg.content.split("\n").map((line, j) => (
                    <p key={j} className={j > 0 ? "mt-1.5" : ""}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-card border border-card-border rounded-xl px-4 py-3">
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-6 pb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-6 pb-6">
            <div className="flex gap-3 border border-border rounded-xl bg-card px-4 py-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Ask about ALM, capital allocation, risk management..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                disabled={mutation.isPending}
              />
              <button
                onClick={() => send()}
                disabled={mutation.isPending || !input.trim()}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-opacity hover:opacity-90"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Requires OPENAI_API_KEY in environment secrets. Add it via the Secrets panel.
            </p>
          </div>
        </div>

        {/* Sidebar — Context panel */}
        <div className="w-64 border-l border-border bg-sidebar/50 p-4 overflow-y-auto hidden lg:block">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Portfolio Context</p>
          <div className="space-y-3">
            {[
              { label: "Total AUM", value: "$2.45B", color: "text-blue-400" },
              { label: "Solvency Ratio", value: "1.43x", color: "text-green-400" },
              { label: "Duration Gap", value: "1.85 yrs", color: "text-amber-400" },
              { label: "Portfolio Return", value: "7.82%", color: "text-green-400" },
              { label: "Volatility", value: "12.45%", color: "text-amber-400" },
              { label: "VaR 95% (1M)", value: "$94.8M", color: "text-red-400" },
              { label: "Cat Exposure", value: "$3.2B", color: "text-red-400" },
              { label: "Reins. Coverage", value: "65.6%", color: "text-blue-400" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`font-semibold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Data Sources</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• S&P 500 (FRED)</p>
              <p>• VIX (CBOE)</p>
              <p>• US Treasury 10Y</p>
              <p>• CPI / GDP (FRED)</p>
              <p>• AAA Credit Spreads</p>
              <p>• Liability Cashflows</p>
              <p>• Cat Risk Scenarios</p>
              <p>• Solvency Projections</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
