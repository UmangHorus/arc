"use client";

import { useEffect } from "react";
import { useCompanyBranchData } from "@/hooks/useCompanyBranchData";
import { useSharedDataStore } from "@/stores/sharedData.store";
import DeliveryHistory from "@/components/deliverychallans/DeliveryHistory";
import { useLoginStore } from "@/stores/auth.store";

const DeliveryHistoryPage = () => {
  const title = useLoginStore(
    (state) => state.navConfig?.labels?.deliverychallans || "Delivery Challans"
  );
  const { data: companyBranchData } = useCompanyBranchData();
  const { setCompanyBranchDivisionData, companyBranchDivisionData } = useSharedDataStore();

  useEffect(() => {
    if (companyBranchData) {
      setCompanyBranchDivisionData(companyBranchData);
    }
  }, [companyBranchData, setCompanyBranchDivisionData]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">{title} - History</h1>
      <DeliveryHistory />
    </div>
  );
};

export default DeliveryHistoryPage;



