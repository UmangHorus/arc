import { useState, useEffect } from "react";
import api, { ensureInitialized } from "@/lib/api/axios";

export const useApiInitializer = () => {
  const [isApiReady, setIsApiReady] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await ensureInitialized();
        setIsApiReady(true);
      } catch (error) {
        console.error("Failed to initialize API:", error);
        setApiError(error);
      }
    };

    initialize();
  }, []);

  return { isApiReady, apiError };
};
