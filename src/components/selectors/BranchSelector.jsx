import React from "react";
import { useLoginStore } from "@/stores/auth.store";
import useBasicSettingsStore from "@/stores/basicSettings.store";

const BranchSelector = ({
  // Support multiple entity types
  entityIdParam,
  entityDetails,
  entityType = "order", // Default to order, but can be 'quotation', 'lead', 'invoice', etc.
}) => {
  const { mainbranchname } = useBasicSettingsStore();
  const { user, appConfig } = useLoginStore();

  // Determine the branch name based on entity type
  const getEntityBranchName = () => {
    if (!entityDetails) return "N/A";
    
    switch (entityType) {
      case "order":
        return entityDetails.branch_name || "N/A";
      case "quotation":
        return entityDetails.branch_name || entityDetails.branchName || "N/A";
         case "order_by_quotation":
        return entityDetails.branch_name || entityDetails.branchName || "N/A";
      // case "lead":
      //   return entityDetails.branch || entityDetails.branch_name || "N/A";
      // case "invoice":
      //   return entityDetails.billing_branch || entityDetails.branch_name || "N/A";
      default:
        // For future entities, try common property names
        return entityDetails.branch_name || 
               entityDetails.branchName || 
               entityDetails.branch || 
               "N/A";
    }
  };

  // If we have an entity ID parameter and entity details, display as read-only
  if (entityIdParam && entityDetails) {
    return (
      <div className="space-y-2">
        <label className="block text-base font-medium text-[#4a5a6b]">
          Branch
        </label>
        <div className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm">
          {getEntityBranchName()}
        </div>
      </div>
    );
  }

  // Default behavior for new entities
  const displayBranchName = user?.isEmployee
    ? appConfig?.branch_name || "N/A"
    : mainbranchname || "N/A";

  return (
    <div className="space-y-2">
      <label className="block text-base font-medium text-[#4a5a6b]">
        Branch
      </label>
      <div className="w-full border border-input bg-background px-3 py-2 rounded-md text-sm">
        {displayBranchName}
      </div>
    </div>
  );
};

export default BranchSelector;