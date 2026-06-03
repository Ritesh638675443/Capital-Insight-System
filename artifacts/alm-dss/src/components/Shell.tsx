import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Activity, BarChart3, Shield, TrendingUp,
  Target, CloudLightning, Lock, FlaskConical, Bot, ChevronLeft, ChevronRight, Building2
} from "lucide-react";

const NAV = [
  { path: "/", label: "Executive Dashboard", icon: LayoutDashboard },
  { path: "/alm", label: "ALM Engine", icon: Activity },
  { path: "/portfolio", label: "Portfolio Analytics", icon: BarChart3 },
  { path: "/risk", label: "Risk & Capital", icon: Shield },
  { path: "/esg", label: "Economic Scenarios", icon: TrendingUp },
  { path: "/optimization", label: "Portfolio Optimization", icon: Target },
  { path: "/catastrophe", label: "Catastrophe Risk", icon: CloudLightning },
  { path: "/solvency", label: "Solvency Monitoring", icon: Lock },
  { path: "/scenario", label: "Scenario Builder", icon: FlaskConical },
  { path: "/assistant", label: "AI Assistant", icon: Bot },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary shrink-0">
            <Building2 className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-sidebar-foreground truncate">ALM Decision</p>
              <p className="text-[10px] text-muted-foreground truncate">Support System</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV.map(({ path, label, icon: Icon }) => {
            const active = location === path || (path !== "/" && location.startsWith(path));
            return (
              <Link key={path} href={path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors text-sm",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center py-3 border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
