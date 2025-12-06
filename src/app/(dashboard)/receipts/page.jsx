"use client";
import ReceiptsTable from "@/components/receipts/ReceiptsTable";

const ReceiptsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">Receipts</h1>
      <ReceiptsTable />
    </div>
  );
};

export default ReceiptsPage;


