"use client";
import InvoiceTable from "@/components/invoices/InvoiceTable";
import { useLoginStore } from "@/stores/auth.store";

const InvoicesPage = () => {
  const invoiceLabel = useLoginStore(
    (state) => state.navConfig?.labels?.invoices || "Invoice"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">{invoiceLabel} History</h1>
      <InvoiceTable />
    </div>
  );
};

export default InvoicesPage;


