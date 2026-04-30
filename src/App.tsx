import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPrompt } from "@/components/InstallPrompt";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Secrets from "./pages/Secrets";
import Games from "./pages/Games";
import Passaggi from "./pages/Passaggi";
import People from "./pages/People";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AppProvider>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/" element={<ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>} />
            <Route path="/secrets" element={<ProtectedRoute><Layout><Secrets /></Layout></ProtectedRoute>} />
            <Route path="/games" element={<ProtectedRoute><Layout><Games /></Layout></ProtectedRoute>} />
            <Route path="/passaggi" element={<ProtectedRoute><Layout><Passaggi /></Layout></ProtectedRoute>} />
            <Route path="/people" element={<ProtectedRoute><Layout><People /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <InstallPrompt />
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
