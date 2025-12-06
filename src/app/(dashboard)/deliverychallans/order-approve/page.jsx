"use client";

import { useEffect } from "react";
import { useCompanyBranchData } from "@/hooks/useCompanyBranchData";
import { useSharedDataStore } from "@/stores/sharedData.store";
import OrderApproveTable from "@/components/deliverychallans/OrderApproveTable";

const OrderApprovePage = () => {
  const { data: companyBranchData, isLoading, error } = useCompanyBranchData();
  const { setCompanyBranchDivisionData } = useSharedDataStore();

  useEffect(() => {
    if (companyBranchData) {
      setCompanyBranchDivisionData(companyBranchData);
    }
  }, [companyBranchData, setCompanyBranchDivisionData]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">Approved Orders</h1>
      <OrderApproveTable />
    </div>
  );
};

export default OrderApprovePage;