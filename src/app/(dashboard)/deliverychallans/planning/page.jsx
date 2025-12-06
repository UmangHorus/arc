"use client";

import { useEffect } from "react";
import { useCompanyBranchData } from "@/hooks/useCompanyBranchData";
import { useSharedDataStore } from "@/stores/sharedData.store";
import DeliveryPlanning from "@/components/deliverychallans/DeliveryPlanning";
import { useLoginStore } from "@/stores/auth.store";

const DeliveryPlanningPage = () => {
  const title = useLoginStore(
    (state) => state.navConfig?.labels?.deliverychallans || "Delivery Challans"
  );
  const { data: companyBranchData, isLoading, error } = useCompanyBranchData();
  const { setCompanyBranchDivisionData } = useSharedDataStore();

  useEffect(() => {
    if (companyBranchData) {
      setCompanyBranchDivisionData(companyBranchData);
    }
  }, [companyBranchData, setCompanyBranchDivisionData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold mb-6">{title} - Planning</h1>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">{title} - Planning</h1>
      <DeliveryPlanning />
    </div>
  );
};

export default DeliveryPlanningPage;



