"use client";
import QuotationTable from "@/components/quotation/QuotationTable";
import { useLoginStore } from "@/stores/auth.store";
const TrackQuotationsPage = () => {

  const quotationLabel = useLoginStore(
    (state) => state.navConfig?.labels?.Quotation_config_name || "Quotation"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">{quotationLabel}</h1>
      <QuotationTable />
    </div>
  );
};

export default TrackQuotationsPage;
