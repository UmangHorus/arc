import { useQuery } from "@tanstack/react-query";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { leadService } from "@/lib/leadService";
import { toast } from "sonner";
import { useEffect } from "react";

export const useCompanyDetails = () => {
  const { companyInfo, companyDetails, setCompanyInfo, setCompanyDetails } =
    useSharedDataStore();

  const {
    data: companyDetailsData,
    error: companyDetailsError,
    isLoading: companyDetailsLoading,
  } = useQuery({
    queryKey: ["companyDetails"],
    queryFn: () => leadService.getCompanyDetails(),
    enabled: !companyInfo && !companyDetails,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Handle company details data updates
  useEffect(() => {
    if (companyDetailsData) {
      const responseData = Array.isArray(companyDetailsData)
        ? companyDetailsData[0]
        : companyDetailsData;
      if (responseData?.STATUS === "SUCCESS") {
        setCompanyInfo(responseData.DATA?.Companyinfo || responseData.DATA || {});
        setCompanyDetails(responseData.DETAILS || responseData.DATA || {});
      } else {
        toast.error(
          responseData?.MSG || "Invalid company details response data"
        );
      }
    }
  }, [companyDetailsData, setCompanyInfo, setCompanyDetails]);

  return {
    companyInfo,
    companyDetails,
    isLoading: companyDetailsLoading,
    error: companyDetailsError,
  };
};

