// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext.tsx";
import { ConfigProvider } from "./context/ConfigContext.tsx";
import { Toaster } from "react-hot-toast";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,

      staleTime: 5 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfigProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
            }}
          />
        </ConfigProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
  // </StrictMode>
);
