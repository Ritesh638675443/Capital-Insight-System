import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Shell from "@/components/Shell";
import Dashboard from "@/pages/Dashboard";
import ALM from "@/pages/ALM";
import Portfolio from "@/pages/Portfolio";
import Risk from "@/pages/Risk";
import ESG from "@/pages/ESG";
import Optimization from "@/pages/Optimization";
import Catastrophe from "@/pages/Catastrophe";
import Solvency from "@/pages/Solvency";
import Scenario from "@/pages/Scenario";
import Assistant from "@/pages/Assistant";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/alm" component={ALM} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/risk" component={Risk} />
        <Route path="/esg" component={ESG} />
        <Route path="/optimization" component={Optimization} />
        <Route path="/catastrophe" component={Catastrophe} />
        <Route path="/solvency" component={Solvency} />
        <Route path="/scenario" component={Scenario} />
        <Route path="/assistant" component={Assistant} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
