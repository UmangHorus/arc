import { useQuery } from "@tanstack/react-query";
import { useLoginStore } from "@/stores/auth.store";
import OrderService from "@/lib/OrderService";
import { useSharedDataStore } from "@/stores/sharedData.store";

export const useCompanyBranchData = () => {
  const { token, user } = useLoginStore();
  const { companyBranchDivisionData } = useSharedDataStore();

  return useQuery({
    queryKey: ["companyBranchDivision", user?.id],
    queryFn: async () => {
      const userId = user?.id;

      const response = await OrderService.getCompanyBranchDivisionData(
        token,
        userId
      );

      // Handle both array and object response formats
      const result = Array.isArray(response) ? response[0] : response;

      if (result?.STATUS === "SUCCESS") {

        // Return the data as-is without formatting
        return result?.DATA || {};
      }

      throw new Error(result?.MSG || "Failed to fetch company data");
    },
    enabled: !!token && !!user?.id && !companyBranchDivisionData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};
