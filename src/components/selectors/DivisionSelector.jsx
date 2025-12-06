import React, { useEffect } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useLoginStore } from "@/stores/auth.store";
import { useSharedDataStore } from "@/stores/sharedData.store";

const DivisionSelector = ({
  options,
  value,
  onValueChange,
  // Support multiple entity types
  entityIdParam,
  entityDetails,
  entityType = "order", // Default to order, but can be 'quotation', 'lead', 'invoice', etc.
}) => {
  const { user } = useLoginStore();
  const { companyDetails } = useSharedDataStore();
  const companyDivisions = companyDetails?.company_division || [];

  // Set first division as default for non-employees when available
  useEffect(() => {
    if (
      companyDetails?.is_company_division_enabled === 1 &&
      !user?.isEmployee &&
      companyDivisions.length > 0 &&
      !value &&
      !entityIdParam
    ) {
      onValueChange(companyDivisions[0].div_id);
    }
  }, [user?.isEmployee, companyDivisions, value, onValueChange, entityIdParam, companyDetails]);

  // Don't render if divisions are not enabled
  if (companyDetails?.is_company_division_enabled !== 1) {
    return null;
  }

  // Determine the division name based on entity type
  const getEntityDivisionName = () => {
    if (!entityDetails) return "N/A";
    
    switch (entityType) {
      case "order":
        return entityDetails.division_name || "N/A";
      case "quotation":
        return entityDetails.division_name || entityDetails.divisionName || "N/A";
         case "order_by_quotation":
        return entityDetails.division_name || entityDetails.divisionName || "N/A";
      // case "lead":
      //   return entityDetails.division || entityDetails.division_name || "N/A";
      // case "invoice":
      //   return entityDetails.billing_division || entityDetails.division_name || "N/A";
      default:
        // For future entities, try common property names
        return entityDetails.division_name || 
               entityDetails.divisionName || 
               entityDetails.division || 
               "N/A";
    }
  };

  // If we have an entity ID parameter and entity details, display as read-only
  if (entityIdParam && entityDetails) {
    return (
      <div className="space-y-2">
        <label className="block text-base font-medium text-[#4a5a6b]">
          Division
        </label>
        <div className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm">
          {getEntityDivisionName()}
        </div>
      </div>
    );
  }

  // Don't render if no options are available for employees or no divisions for non-employees
  if (user?.isEmployee && options.length === 0) {
    return null;
  }

  if (!user?.isEmployee && companyDivisions.length === 0) {
    return null;
  }

  // Render for non-employees
  if (!user?.isEmployee) {
    return (
      <div className="space-y-2">
        <label className="block text-base font-medium text-[#4a5a6b]">
          Select Division
        </label>
        <Select
          value={value || companyDivisions[0]?.div_id}
          onValueChange={onValueChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select division" />
          </SelectTrigger>
          <SelectContent>
            {companyDivisions.map((division) => (
              <SelectItem key={division.div_id} value={division.div_id}>
                {division.div_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Render for employees
  return (
    <div className="space-y-2">
      <label className="block text-base font-medium text-[#4a5a6b]">
        Select Division
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((division) => (
            <SelectItem key={division.cd_id} value={division.cd_id}>
              {division.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DivisionSelector;