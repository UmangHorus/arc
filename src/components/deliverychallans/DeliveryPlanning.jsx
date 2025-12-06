"use client";

import React from "react";
import OrderCountCards from "./OrderCountCards";
import DeliveryListTable from "./DeliveryListTable";

const DeliveryPlanning = () => {
  return (
    <div className="w-full space-y-4">
      {/* Order Count Cards */}
      <OrderCountCards />

      {/* Delivery List Table - Contains all the logic for listing, filtering, and dispatching */}
      <DeliveryListTable />
    </div>
  );
};

export default DeliveryPlanning;

