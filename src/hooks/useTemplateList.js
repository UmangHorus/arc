// hooks/useTemplateList.js
'use client';

import { useQuery } from "@tanstack/react-query";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { useLoginStore } from "@/stores/auth.store";
import { QuotationService } from "@/lib/QuotationService";

export const useTemplateList = () => {
  const { token } = useLoginStore();
  const { templateList, setTemplateList } = useSharedDataStore();

  return useQuery({
    queryKey: ["templateList", token],
    queryFn: async () => {
      setTemplateList(null, true, null); // Set loading to true
      try {
        const response = await QuotationService.getTemplateList(token);

        if (response?.STATUS !== "SUCCESS") {
          throw new Error(response?.MSG || "Failed to fetch template list");
        }

        const data = response?.DATA || {
          templates: [],
        };

        setTemplateList(data, false, null);
        return data;
      } catch (error) {
        console.error("Error fetching template list:", {
          message: error.message,
          response: error.response?.data,
        });
        setTemplateList(null, false, error.message);
        throw error; // Re-throw for React Query
      }
    },
    enabled: !!token && templateList === null,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours cache
    retry: 2,
    refetchOnWindowFocus: false,
  });
};