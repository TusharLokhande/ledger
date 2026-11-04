import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/queryClient";
import { NotFoundPage } from "@/components/NotFoundPage";
import { RootLayout } from "@/components/layout/RootLayout";
import { AccountsPage } from "@/features/accounts";
import { LoginPage, RequireAuth } from "@/features/auth";
import { CategoriesPage } from "@/features/categories";
import { HomePage } from "@/features/home";
import { ImportPage } from "@/features/imports";
import { ReportsPage } from "@/features/reports";
import { SettingsPage } from "@/features/settings";
import { TransactionsPage } from "@/features/transactions";
import { useAppliedDensity } from "@/hooks/useAppliedDensity";
import { useAppliedTheme } from "@/hooks/useAppliedTheme";
import { TooltipProvider } from "@/ui/tooltip";
import { Toaster } from "@/ui/sonner";

function App() {
  useAppliedTheme();
  useAppliedDensity();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<RootLayout />}>
                <Route path="home" element={<HomePage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="import" element={<ImportPage />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
