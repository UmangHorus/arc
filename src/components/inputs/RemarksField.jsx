"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

const RemarksField = ({
  placeholder = "",
  value = "", // Provide default empty string if value is undefined/null
  onChange,
  entityIdParam,
  entityDetails,
  entityType = "order",
}) => {
  const isEditMode = entityType == "order" && !!entityIdParam;
  const isQuotationMode = entityIdParam && entityType == "order_by_quotation";
  const [hasManuallyChanged, setHasManuallyChanged] = useState(false);

  // Initialize value for order_by_quotation and order edit mode
  useEffect(() => {
    if (entityIdParam && entityDetails && !hasManuallyChanged) {
      const remarksFromEntity = entityDetails.remarks || "";
      onChange?.(remarksFromEntity);
    }
  }, [entityIdParam, entityType, entityDetails, hasManuallyChanged, onChange]);

  // Determine the value to display
  const displayValue = isQuotationMode || isEditMode
    ? value || "" // Use parent-controlled value for order_by_quotation and order edit
    : value || "";

  // Determine if the Textarea should be disabled
  const shouldDisable = entityIdParam && entityType !== "order_by_quotation";

  // Handle change in Textarea
  const handleChange = (e) => {
    const newValue = e.target.value;
    if (!hasManuallyChanged) setHasManuallyChanged(true);
    onChange?.(newValue);
  };

  return (
    <Textarea
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      disabled={shouldDisable}
      className={`border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-gray-400 focus:shadow-md ${
        shouldDisable ? "bg-background" : "bg-white"
      }`}
    />
  );
};

export default RemarksField;