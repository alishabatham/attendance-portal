import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Report from "@/pages/Report";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminStudentDetail from "@/pages/admin/AdminStudentDetail";
import AdminAttendance from "@/pages/admin/AdminAttendance";
import AdminSettings from "@/pages/admin/AdminSettings";
import "@/lib/auth";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { getToken } from "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RootRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (getToken()) {
      setLocation("/dashboard");
    } else {
      setLocation("/login");
    }
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/report" component={Report} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/students" component={AdminStudents} />
      <Route path="/admin/students/:id" component={AdminStudentDetail} />
      <Route path="/admin/attendance" component={AdminAttendance} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
