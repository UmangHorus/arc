"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLoginStore } from "@/stores/auth.store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import InvoiceService from "@/lib/InvoiceService";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HashLoader } from "react-spinners";

const EWaybillDialog = ({ open, onOpenChange, invoiceId }) => {
  const { token } = useLoginStore();
  const queryClient = useQueryClient();
  const [saveResponse, setSaveResponse] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ewaybillDetails", invoiceId, token],
    queryFn: () => InvoiceService.getEWaybill({ token, id: invoiceId }),
    enabled: open && !!invoiceId,
    refetchOnMount: "always",
  });

  const saveMutation = useMutation({
    mutationFn: () => InvoiceService.saveEWaybill({ token, id: invoiceId }),
    onSuccess: (response) => {
      const responseData = Array.isArray(response) ? response[0] : response;
      
      // Check if status_cd is "0" (error)
      if (responseData?.data?.status_cd == "0") {
        setSaveResponse(responseData.data);
        toast.error("Error occurred while saving e-waybill");
      } else if (responseData?.data?.status_cd == "1") {
        // Success case - store the data object
        setSaveResponse(responseData.data);
        toast.success("E-waybill saved successfully");
      } else {
        setSaveResponse(null);
        toast.success("E-waybill saved successfully");
        // Refetch ewaybill details after successful save
        queryClient.invalidateQueries({
          queryKey: ["ewaybillDetails", invoiceId, token],
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to save e-waybill");
      setSaveResponse(null);
    },
  });

  // Clear cache and save response when dialog closes
  useEffect(() => {
    if (!open) {
      queryClient.removeQueries({
        queryKey: ["ewaybillDetails", invoiceId, token],
        exact: true
      });
      setSaveResponse(null);
    }
  }, [open, invoiceId, token, queryClient]);

  // Handle getEWaybill response
  const getFormattedData = () => {
    // If there's a save success response (status_cd == "1"), show the data object
    if (saveResponse && saveResponse.status_cd == "1") {
      return saveResponse.data || null;
    }

    // If there's a save error response, show only the error object
    if (saveResponse && saveResponse.status_cd == "0") {
      return saveResponse.error || null;
    }

    // Handle getEWaybill response
    if (!data) return null;

    const responseData = Array.isArray(data) ? data[0] : data;
    
    if (responseData?.STATUS == "SUCCESS" && responseData?.DATA) {
      const dataObj = responseData.DATA;
      
      // Check if status_cd == "1" and is_cancel is true
      if (dataObj.status_cd == "1" && dataObj.is_cancel) {
        // Return cancel payload for JSON display
        return dataObj.CancelPayload || null;
      }
      
      // Otherwise, show invoice data directly
      if (dataObj.invoice) {
        return [dataObj.invoice];
      }
    }

    return null;
  };

  const formattedJsonData = getFormattedData();
  const responseData = Array.isArray(data) ? data[0] : data;
  const dataObj = responseData?.DATA || {};
  const isCancelled = dataObj.status_cd == "1" && dataObj.is_cancel;
  const hasError = saveResponse && saveResponse.status_cd == "0";
  const hasSuccess = saveResponse && saveResponse.status_cd == "1";
  const showSubmitButton = !hasError && !isCancelled && !hasSuccess;
  const showCloseButton = hasError || isCancelled || hasSuccess;

  // Show loading state
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] max-w-[900px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-2xl font-bold text-center">E-Way Bill JSON</DialogTitle>
            <DialogClose className="absolute right-4 top-4" />
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[900px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl font-bold text-center">E-Way Bill JSON</DialogTitle>
          <DialogClose className="absolute right-4 top-4" />
        </DialogHeader>
        <div className="space-y-4">
          {/* Show cancelled e-waybill info */}
          {isCancelled && dataObj.invoice && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
              <p className="text-sm font-medium text-yellow-800">
                <strong>E way Bill No:</strong> {dataObj.invoice.ewayBillNo || dataObj.ewbNo || "N/A"}
              </p>
              <p className="text-sm font-medium text-yellow-800">
                <strong>E way Bill cancel Date:</strong> {dataObj.invoice.cancelDate || "N/A"}
              </p>
            </div>
          )}

          {/* Show JSON data */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              {hasError
                ? "Error JSON:"
                : hasSuccess
                ? "E-Way Bill JSON:"
                : isCancelled
                ? "Cancel Payload JSON:"
                : "E-Way Bill JSON:"}
            </p>
            <pre className="bg-gray-100 p-3 rounded text-xs whitespace-pre-wrap break-words">
              {formattedJsonData ? JSON.stringify(formattedJsonData, null, 2) : "No data available"}
            </pre>
          </div>

          {showSubmitButton && (
            <div className="flex gap-2 justify-end flex-wrap">
              <Button 
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending || isLoading}
                className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
              >
                {saveMutation.isPending ? "Submitting..." : "Submit to Govt. Portal"}
              </Button>
            </div>
          )}

          {showCloseButton && (
            <div className="flex gap-2 justify-end flex-wrap">
              <Button 
                onClick={() => onOpenChange(false)} 
                className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EWaybillDialog;


