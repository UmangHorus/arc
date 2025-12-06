import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import useBasicSettingsStore from "@/stores/basicSettings.store";
import { useLoginStore } from "@/stores/auth.store";

const CompanySelector = ({
  options,
  value,
  onValueChange,
  // Support multiple entity types
  entityIdParam,
  entityDetails,
  entityType = "order", // Default to order, but can be 'quotation', 'lead', 'invoice', etc.
}) => {
  const { maincompanyname } = useBasicSettingsStore();
  const { user } = useLoginStore();

  // Determine the company name based on entity type
  const getEntityCompanyName = () => {
    if (!entityDetails) return "N/A";

    switch (entityType) {
      case "order":
        return entityDetails.company_name || "N/A";
      case "quotation":
        return entityDetails.company_name || entityDetails.companyName || "N/A";
           case "order_by_quotation":
        return entityDetails.company_name || entityDetails.companyName || "N/A";
      // case "lead":
      //   return entityDetails.company || entityDetails.company_name || "N/A";
      // case "invoice":
      //   return entityDetails.billing_company || entityDetails.company_name || "N/A";
      default:
        // For future entities, try common property names
        return entityDetails.company_name ||
          entityDetails.companyName ||
          entityDetails.company ||
          "N/A";
    }
  };

  // If we have an entity ID parameter and entity details, display as read-only
  if (entityIdParam && entityDetails) {
    return (
      <div className="space-y-2">
        <label className="block text-base font-medium text-[#4a5a6b]">
          Company
        </label>
        <div className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm">
          {getEntityCompanyName()}
        </div>
      </div>
    );
  }

  // Default behavior for new entities (non-employees see main company)
  if (!user?.isEmployee) {
    return (
      <div className="space-y-2">
        <label className="block text-base font-medium text-[#4a5a6b]">
          Company
        </label>
        <div className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm">
          {maincompanyname || "N/A"}
        </div>
      </div>
    );
  }

  // Employees see the company selector
  return (
    <div className="space-y-2">
      <label className="block text-base font-medium text-[#4a5a6b]">
        Select Company
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((company) => (
            <SelectItem key={company.company_id} value={company.company_id}>
              {company.company_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CompanySelector;