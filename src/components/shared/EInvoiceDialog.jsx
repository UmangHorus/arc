"use client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLoginStore } from "@/stores/auth.store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import InvoiceService from "@/lib/InvoiceService";
import { toast } from "sonner";
import { HashLoader } from "react-spinners";

const EInvoiceDialog = ({ open, onOpenChange, invoiceId }) => {
  const { token } = useLoginStore();
  const queryClient = useQueryClient();

  // State management
  const [isMismatchCheckboxSelected, setIsMismatchCheckboxSelected] = useState(false);
  const [isDiscountCheckboxSelected, setIsDiscountCheckboxSelected] = useState(false);
  const [mutationResponse, setMutationResponse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch e-Invoice details
  const { data, isLoading, error } = useQuery({
    queryKey: ["eInvoiceDetails", invoiceId, token],
    queryFn: () => InvoiceService.getEInvoice({ token, id: invoiceId }),
    enabled: open && !!invoiceId,
    refetchOnMount: "always",
    staleTime: 0,
    cacheTime: 0,
    keepPreviousData: false, // 🔥
  });

  // Add this to your useEffect that handles dialog close
  useEffect(() => {
    if (!open) {
      setIsMismatchCheckboxSelected(false);
      setIsDiscountCheckboxSelected(false);
      setMutationResponse(null);
      setIsSubmitting(false);

      // Remove only this exact query
      queryClient.removeQueries({
        queryKey: ["eInvoiceDetails", invoiceId, token],
        exact: true
      });
    }
  }, [open, invoiceId, token, queryClient]);

  const jsonData = data?.DATA;

  // Save e-Invoice mutation
  const saveMutation = useMutation({
    mutationFn: () =>
      InvoiceService.saveEInvoice({
        token,
        id: invoiceId,
        Json2nd: isMismatchCheckboxSelected ? "1" : "0",
        IsDividedPercentageWiseDiscount: isDiscountCheckboxSelected ? "1" : "0",
      }),
    onMutate: () => {
      setIsSubmitting(true);
    },
    onSuccess: (response) => {
      setMutationResponse(response);
      toast.success("e-Invoice submitted successfully!");
      // Refetch the e-Invoice details to get updated data
      queryClient.removeQueries({
        queryKey: ["eInvoiceDetails", invoiceId, token],
        exact: true
      });
    },
    onError: (error) => {
      const errorResponse = {
        status: "error",
        data: {
          status_desc: error.response?.data?.message || "Failed to save e-Invoice data. Please try again.",
        },
      };
      setMutationResponse(errorResponse);
      toast.error("Failed to submit e-Invoice");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Cancel e-Invoice mutation
  const cancelMutation = useMutation({
    mutationFn: () => InvoiceService.cancelEInvoice({
      token,
      id: invoiceId
    }),
    onSuccess: (response) => {
      setMutationResponse(response);
      toast.success("e-Invoice cancelled successfully!");
      // Refetch the e-Invoice details to get updated data
      queryClient.removeQueries({
        queryKey: ["eInvoiceDetails", invoiceId, token],
        exact: true
      });
    },
    onError: (error) => {
      const errorResponse = {
        status: "error",
        data: {
          status_desc: error.response?.data?.message || "Failed to cancel e-Invoice. Please try again.",
        },
      };
      setMutationResponse(errorResponse);
      toast.error("Failed to cancel e-Invoice");
    },
  });

  // Handle cancel with confirmation
  const handleCancelEInvoice = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this e-Invoice?"
    );

    if (confirmed) {
      cancelMutation.mutate();
    }
  };

  // Check if details is a blank array or status_cd is 0
  const isDetailsEmptyOrZero =
    !jsonData?.details ||
    (Array.isArray(jsonData?.details) && jsonData?.details.length === 0) ||
    jsonData?.details?.status_cd === "0";

  // Determine what to display based on mutation response
  const isError = mutationResponse?.status === "error";
  const isSaveSuccess =
    mutationResponse?.status === "success" &&
    mutationResponse?.data?.status_cd === "1";
  const isCancelSuccess =
    mutationResponse?.STATUS === "SUCCESS" &&
    mutationResponse?.DATA?.status_cd === "1";
  const isCancelError =
    mutationResponse?.status === "error" &&
    mutationResponse?.data?.status_cd === "0";

  // Handle checkbox changes
  const handleMismatchCheckboxChange = (checked) => {
    setIsMismatchCheckboxSelected(checked);
  };

  const handleDiscountCheckboxChange = (checked) => {
    setIsDiscountCheckboxSelected(checked);
  };

  // Render content based on state
  const renderContent = () => {
    // Cancel success or error states
    if (isCancelSuccess || isCancelError || isError) {
      return (
        <pre className="bg-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap break-words overflow-auto max-h-96">
          {mutationResponse?.data?.status_desc
            ? JSON.stringify(JSON.parse(mutationResponse.data.status_desc), null, 2)
            : "Error data unavailable"}
        </pre>
      );
    }

    // Save success state
    if (isSaveSuccess) {
      return (
        <>
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-semibold">Invoice Details</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>IRN:</strong> {mutationResponse?.data?.data?.Irn || "NA"}
                </p>
                <p>
                  <strong>Acknowledgement No:</strong>{" "}
                  {mutationResponse?.data?.data?.AckNo || "NA"}
                </p>
                <p>
                  <strong>Acknowledgement Date:</strong>{" "}
                  {mutationResponse?.data?.data?.AckDt || "NA"}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {mutationResponse?.data?.data?.Status === "ACT"
                    ? "Active"
                    : mutationResponse?.data?.data?.Status || "NA"}
                </p>
                <p>
                  <strong>Post IP:</strong> {"NA"}
                </p>
              </div>
            </div>
            {mutationResponse?.qrcodeurl && (
              <div className="flex flex-col items-center">
                <h4 className="text-sm font-semibold mb-2">QR Code</h4>
                <img
                  src={mutationResponse.qrcodeurl}
                  alt="QR Code"
                  className="w-32 h-32 md:w-40 md:h-40 object-contain"
                />
              </div>
            )}
          </div>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap break-words overflow-auto max-h-96">
            {jsonData?.invoice
              ? JSON.stringify(jsonData.invoice, null, 2)
              : "No data available"}
          </pre>
        </>
      );
    }

    // Existing e-Invoice details with status
    if (!isDetailsEmptyOrZero && jsonData?.details?.status_cd === "1") {
      return (
        <>
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
            <div className="flex-1 space-y-3">
              <h3 className="text-lg font-semibold">Invoice Details</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>IRN:</strong> {jsonData?.details?.data?.Irn || "NA"}
                </p>
                <p>
                  <strong>Acknowledgement No:</strong>{" "}
                  {jsonData?.details?.data?.AckNo || "NA"}
                </p>
                <p>
                  <strong>Acknowledgement Date:</strong>{" "}
                  {jsonData?.details?.data?.AckDt || "NA"}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {jsonData?.details?.data?.Status === "ACT"
                    ? "Active"
                    : jsonData?.details?.data?.Status || "NA"}
                </p>
                <p>
                  <strong>Post IP:</strong> {"NA"}
                </p>
              </div>
            </div>
            {jsonData?.qrcodeurl && (
              <div className="flex flex-col items-center">
                <h4 className="text-sm font-semibold mb-2">QR Code</h4>
                <img
                  src={jsonData.qrcodeurl}
                  alt="QR Code"
                  className="w-32 h-32 md:w-40 md:h-40 object-contain"
                />
              </div>
            )}
          </div>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap break-words overflow-auto max-h-96">
            {jsonData?.invoice
              ? JSON.stringify(jsonData.invoice, null, 2)
              : "No data available"}
          </pre>
        </>
      );
    }

    // Default state - show JSON data only
    return (
      <pre className="bg-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap break-words overflow-auto max-h-96">
        {jsonData?.invoice
          ? JSON.stringify(jsonData.invoice, null, 2)
          : isLoading
            ? <div className="flex items-center justify-center min-h-[200px]">
              <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
            </div>
            : error
              ? "Error loading e-Invoice data"
              : "No data available"}
      </pre>
    );
  };

  // Render action buttons based on state
  const renderActions = () => {
    // Cancel success/error or general error state
    if (isCancelSuccess || isCancelError || isError) {
      return (
        <div className="flex justify-end w-full">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      );
    }

    // Save success state
    if (isSaveSuccess) {
      return (
        <div className="flex justify-end w-full">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="destructive"
              onClick={handleCancelEInvoice}
              disabled={cancelMutation.isLoading}
              className="w-full sm:w-auto"
            >
              {cancelMutation.isLoading ? "Cancelling..." : "Cancel EInvoice"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </div>
      );
    }

    // No e-Invoice generated yet
    if (isDetailsEmptyOrZero) {
      return (
        <div className="w-full">
          <div className="space-y-3 mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mismatch-checkbox"
                checked={isMismatchCheckboxSelected}
                onCheckedChange={handleMismatchCheckboxChange}
                className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
              />
              <Label htmlFor="mismatch-checkbox" className="text-sm">
                NOTE: Please tick this checkbox only when you are getting invoice
                total amount mismatch error.
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="discount-checkbox"
                checked={isDiscountCheckboxSelected}
                onCheckedChange={handleDiscountCheckboxChange}
                className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
              />
              <Label htmlFor="discount-checkbox" className="text-sm">
                If the issue arises where the discount is not divided among each
                product, at that time, use this tick to divide the discount by
                percentage.
              </Label>
            </div>
          </div>
          <div className="flex justify-end w-full">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={isSubmitting || saveMutation.isLoading}
                className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d]"
              >
                {isSubmitting || saveMutation.isLoading ? "Submitting..." : "Submit to Govt. Portal"}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Existing e-Invoice - show cancel option
    return (
      <div className="flex justify-end w-full">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="destructive"
            onClick={handleCancelEInvoice}
            disabled={cancelMutation.isLoading}
            className="w-full sm:w-auto"
          >
            {cancelMutation.isLoading ? "Cancelling..." : "Cancel EInvoice"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
            e-Invoice JSON
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4" />
        </DialogHeader>

        <div className="space-y-6">
          {renderContent()}
        </div>

        <div className="flex flex-col gap-4 pt-4 border-t">
          {renderActions()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EInvoiceDialog;