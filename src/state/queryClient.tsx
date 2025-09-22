import React from "react";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

export function setupAppFocus() {
  // Refocus on app foreground
  AppState.addEventListener("change", (state) => {
    if (Platform.OS !== "web" && state === "active") {
      focusManager.setFocused(true);
    }
  });
}

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export { queryClient };


