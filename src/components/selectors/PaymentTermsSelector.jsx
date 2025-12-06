"use client";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const PaymentTermsSelector = ({
  options,
  selectedTerm,
  customDays,
  onChange,
  selectedContact,
  entityIdParam,
  entityDetails,
  entityType = "order",
  defaultTerm = "F", // Configurable default term
}) => {
  const [hasManuallyChanged, setHasManuallyChanged] = useState(false);

  // Initialize selectedTerm and customDays for order_by_quotation
  useEffect(() => {
    if (entityIdParam && entityType == "order_by_quotation" && entityDetails) {
      const { termProp, daysProp } = getPaymentTermsProperties();
      const termFromEntity = entityDetails[termProp] || defaultTerm;
      const daysFromEntity =
        termFromEntity == "F" ? entityDetails[daysProp]?.toString() || "" : "";

      // Validate entityDetails
      if (!entityDetails[termProp]) {
        console.warn(`Missing ${termProp} in entityDetails for ${entityType}`);
      }

      // Set initial values in parent state via onChange
      onChange({
        term: termFromEntity,
        days: daysFromEntity,
      });
      setHasManuallyChanged(false);
    }
  }, [entityIdParam, entityType, entityDetails, defaultTerm]);

  // Auto-fill customDays with creditlimit_days for other cases when selectedTerm is "F"
  useEffect(() => {
    if (entityType != "order_by_quotation" && selectedTerm == "F") {
      if (selectedContact?.creditlimit_days != null && !hasManuallyChanged) {
        // Auto-fill with contact's credit days
        onChange({
          term: selectedTerm,
          days: selectedContact.creditlimit_days.toString(),
        });
      } else if (!selectedContact?.creditlimit_days && !hasManuallyChanged) {
        // Clear days if contact has no creditlimit_days
        onChange({
          term: selectedTerm,
          days: "",
        });
      }
    }
  }, [entityType, selectedTerm, selectedContact, onChange, hasManuallyChanged]);

  // Reset manual change flag when selectedContact changes
  useEffect(() => {
    setHasManuallyChanged(false);
  }, [selectedContact]);

  // Determine payment terms property names based on entity type
  const getPaymentTermsProperties = () => {
    switch (entityType) {
      case "order":
      case "quotation":
      case "order_by_quotation":
        return {
          termProp: "payments_terms",
          daysProp: "credit_days",
        };
      default:
        return {
          termProp: "payments_terms",
          daysProp: "credit_days",
        };
    }
  };

  const { termProp, daysProp } = getPaymentTermsProperties();

  // Handle term change and preserve customDays
  const handleTermChange = (value) => {
    setHasManuallyChanged(false);
    // Preserve customDays instead of clearing it for non-"F" terms
    onChange({ term: value, days: customDays });
  };

  // Handle days change and update customDays via onChange
  const handleDaysChange = (e) => {
    const value = e.target.value == "" ? "" : e.target.value.replace(/\D/g, "");
    if (!hasManuallyChanged) setHasManuallyChanged(true);
    onChange({ term: selectedTerm, days: value });
  };

  // Use selectedTerm and customDays for order_by_quotation, otherwise use original logic
  const displayTerm =
    entityIdParam && entityType == "order_by_quotation"
      ? selectedTerm || defaultTerm
      : entityIdParam
      ? entityDetails?.[termProp] || selectedTerm || defaultTerm
      : selectedTerm || defaultTerm;

  const displayDays =
    entityIdParam && entityType == "order_by_quotation"
      ? customDays || ""
      : entityIdParam && entityDetails?.[termProp] == "F"
      ? entityDetails?.[daysProp]?.toString() || ""
      : customDays || "";

  const selectedOption = options.find((option) => option.value == displayTerm);
  const displayLabel = selectedOption ? selectedOption.label : "Select...";

  // Enable editing for order_by_quotation
  const shouldDisable = !!entityIdParam && entityType != "order_by_quotation";

  return (
    <div className="space-y-2">
      <h3 className="block text-base font-medium text-[#4a5a6b]">
        Payment Terms
      </h3>

      <div className="flex">
        <div
          className={`relative ${displayTerm == "F" ? "w-[80%]" : "w-full"} ${
            shouldDisable ? "bg-gray-100" : "bg-white"
          }`}
        >
          <Select
            value={displayTerm}
            onValueChange={handleTermChange}
            disabled={shouldDisable}
          >
            <SelectTrigger
              className={`${displayTerm == "F" ? "rounded-r-none" : ""}`}
            >
              <SelectValue placeholder={displayLabel} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {displayTerm == "F" && (
          <div className="w-[20%]">
            <Input
              type="text"
              value={displayDays}
              onChange={handleDaysChange}
              placeholder="Days"
              className={`rounded-l-none border-l-0 pl-3 border-[#ced4da] focus:border-[#ced4da] focus:ring-0 ${
                shouldDisable ? "bg-gray-100" : "bg-white"
              }`}
              disabled={shouldDisable}
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentTermsSelector;