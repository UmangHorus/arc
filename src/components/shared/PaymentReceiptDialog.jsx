"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useLoginStore } from "@/stores/auth.store";
import OrderProcessingService from "@/lib/OrderProcessingService";
import { format } from "date-fns";
import api from "@/lib/api/axios";

const PaymentReceiptDialog = ({ 
  open, 
  onOpenChange, 
  orderData = null,
  pending_amount = 0,
  onSuccess,
  getSalesorderList,
  fetchOrders,
  status,
  route_id,
  selectedCompany,
  selectedBranch,
  deliveryType,
}) => {
  const { user, token } = useLoginStore();
  const baseurl = api.defaults.baseURL;
  const buttonCancelRef = useRef(null);

  const [formData, setFormData] = useState({
    paymentMode: "",
    transactionNumber: "",
    instrumentDate: new Date(),
    amount: "",
    attachment: null,
    paymentRemarks: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment modes matching Receipt.jsx
  const paymentModes = [
    { value: "CH", label: "Cheque" },
    { value: "CA", label: "Cash" },
    { value: "BT", label: "Bank Transfer" },
    { value: "ON", label: "Online Payment" },
  ];

  // Initialize amount from pending_amount when dialog opens
  useEffect(() => {
    if (open && pending_amount) {
      try {
        let numericValue;
        if (typeof pending_amount === 'number') {
          numericValue = pending_amount;
        } else if (typeof pending_amount === 'string') {
          const cleanedValue = pending_amount.replace(/[^\d.-]/g, '');
          numericValue = parseFloat(cleanedValue);
        } else {
          numericValue = Number(pending_amount);
        }
        
        if (!isNaN(numericValue) && numericValue >= 0) {
          setFormData(prev => ({
            ...prev,
            amount: numericValue.toFixed(2)
          }));
        }
      } catch (error) {
        console.error('Error parsing pending_amount:', error);
      }
    }
  }, [open, pending_amount]);

  // Reset all data when dialog closes (handles ESC key, click outside, close button, etc.)
  useEffect(() => {
    if (!open) {
      // Reset local state
      setFormData({
        paymentMode: "",
        transactionNumber: "",
        instrumentDate: new Date(),
        amount: "",
        attachment: null,
        paymentRemarks: ""
      });
      setIsSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    buttonCancelRef.current = document.getElementById('cancelPaymentButton');
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB

    if (selectedFile) {
      // Check if the file is a JPG or PNG and within size limit
      if (['image/jpeg', 'image/png', 'image/jpg'].includes(selectedFile.type) && selectedFile.size <= maxSizeInBytes) {
        setFormData(prev => ({
          ...prev,
          attachment: selectedFile
        }));
      } else {
        toast.error(
          selectedFile.size > maxSizeInBytes
            ? 'File size must not exceed 5MB.'
            : 'Only JPG or PNG files are allowed.'
        );
        // Clear the input to prevent invalid files
        e.target.value = '';
      }
    } else {
      setFormData(prev => ({
        ...prev,
        attachment: null
      }));
    }
  };

  const handleAmountChange = (e) => {
    const inputValue = e.target.value;
    
    // Allow blank input
    if (inputValue === '') {
      setFormData(prev => ({
        ...prev,
        amount: inputValue
      }));
      return;
    }

    // Parse the input value (remove commas for calculation)
    const cleanedInput = inputValue.replace(/,/g, '');
    const numericInput = parseFloat(cleanedInput);

    // Parse pending_amount (handle both string and number types)
    let parsedPendingAmount;
    if (typeof pending_amount === 'number') {
      parsedPendingAmount = pending_amount;
    } else if (typeof pending_amount === 'string') {
      parsedPendingAmount = parseFloat(pending_amount.replace(/,/g, '')) || 0;
    } else {
      parsedPendingAmount = parseFloat(pending_amount) || 0;
    }

    // Validate input
    if (!isNaN(numericInput)) {
      if (numericInput >= 0 && numericInput <= parsedPendingAmount) {
        setFormData(prev => ({
          ...prev,
          amount: inputValue // Keep original input (with commas if any)
        }));
      } else if (numericInput > parsedPendingAmount) {
        // Format values for display
        const formattedInput = Number.isInteger(numericInput)
          ? numericInput
          : numericInput.toFixed(2);
        const formattedPending = Number.isInteger(parsedPendingAmount)
          ? parsedPendingAmount
          : parsedPendingAmount.toFixed(2);
        
        toast.error(
          `Amount entered (${formattedInput}) cannot exceed the pending amount of ${formattedPending}.`
        );
        setFormData(prev => ({
          ...prev,
          amount: ''
        }));
      }
    }
  };

  const handleAmountKeyPress = (event) => {
    // Allow numbers, decimal point, backspace, delete, arrow keys
    if (!/^[\d.,]$/.test(event.key) &&
        event.key !== 'Backspace' &&
        event.key !== 'Delete' &&
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.key !== 'ArrowUp' &&
        event.key !== 'ArrowDown') {
      event.preventDefault();
    }
  };

  const handleAmountBlur = (e) => {
    // Format to 2 decimal places when input loses focus
    const value = e.target.value;
    if (value && !isNaN(parseFloat(value.replace(/,/g, '')))) {
      const numericValue = parseFloat(value.replace(/,/g, ''));
      setFormData(prev => ({
        ...prev,
        amount: numericValue.toFixed(2)
      }));
    }
  };

  const handleSubmit = async () => {
    // Validation matching Receipt.jsx
    if (formData.paymentMode === "") {
      toast.error("Mode of payment is required.");
      return false;
    }
    
    const amountValue = formData.amount.toString().trim();
    if (amountValue === '' || parseFloat(amountValue.replace(/,/g, '')) === 0) {
      toast.error("Amount cannot be zero or blank.");
      return false;
    }

    setIsSubmitting(true);
    
    try {
      // Format instrument date
      const instrumentDateFormatted = formData.instrumentDate 
        ? format(formData.instrumentDate, 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');

      // Call API
      const response = await OrderProcessingService.savePaymentReceipt({
        token,
        employeeId: user?.id || user?.employee_id,
        salesorderId: orderData?.salesorder_id || orderData?.salesorder_id || "",
        paymentMode: formData.paymentMode,
        transactionNumber: formData.transactionNumber,
        instrumentDate: instrumentDateFormatted,
        amount: formData.amount.replace(/,/g, ''),
        remarks: formData.paymentRemarks,
        attachment: formData.attachment,
      });

      const result = Array.isArray(response) ? response[0] : response;

      if (result?.STATUS === "SUCCESS") {
        toast.success(result?.MSG || "Payment receipt saved successfully!", {
          duration: 5000,
        });
        
        if (buttonCancelRef.current) {
          buttonCancelRef.current.click();
        }

        // Call fetchOrders if provided (priority)
        if (fetchOrders) {
          fetchOrders();
        }
        // Call getSalesorderList if provided (fallback)
        else if (getSalesorderList) {
          getSalesorderList(status, route_id, selectedCompany, selectedBranch, null, deliveryType);
        }

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }

        onOpenChange(false);
      } else {
        toast.error(result?.MSG || "Failed to save payment receipt.");
        if (buttonCancelRef.current) {
          buttonCancelRef.current.click();
        }
      }
      
    } catch (error) {
      console.error("Error creating payment receipt:", error);
      toast.error("Failed to create payment receipt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:w-[90vw] max-w-[900px] max-h-[90vh] overflow-y-auto bg-white p-0 rounded-lg">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b relative">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-800">
            Make Payment
          </DialogTitle>
          <DialogClose className="absolute right-3 sm:right-4 top-3 sm:top-4" />
        </DialogHeader>

        <div className="flex flex-col lg:flex-row">
          {/* Left side - Payment illustration - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:flex w-full lg:w-1/2 p-4 sm:p-6 items-center justify-center min-h-[500px]">
            <div className="w-full max-w-xs sm:max-w-sm">
              <img
                src="/payment-vector.png"
                alt="Payment Illustration"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          {/* Right side - Payment form */}
          <div className="w-full lg:w-1/2 p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] lg:max-h-none">
            {/* Payment Mode */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                <span className="text-red-500">*</span> Select Mode of Payment :
              </Label>
              <Select 
                value={formData.paymentMode} 
                onValueChange={(value) => handleInputChange('paymentMode', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Mode" />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Number / Cheque No */}
            {formData.paymentMode && formData.paymentMode !== "CA" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  {formData.paymentMode === "CH" ? "Cheque No" : "Transaction Number"} :
                </Label>
                <Input
                  type="text"
                  value={formData.transactionNumber}
                  onChange={(e) => handleInputChange('transactionNumber', e.target.value)}
                  placeholder={formData.paymentMode === "CH" ? "Enter cheque number" : "Enter transaction number"}
                  className="w-full"
                />
              </div>
            )}

            {/* Instrument Realisation Date */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Instrument Realisation Date :
              </Label>
              <Input
                type="date"
                value={formData.instrumentDate ? format(formData.instrumentDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : new Date();
                  handleInputChange('instrumentDate', date);
                }}
                className="w-full"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                <span className="text-red-500">*</span> Amount :
              </Label>
              <Input
                type="text"
                value={formData.amount}
                onChange={handleAmountChange}
                onKeyPress={handleAmountKeyPress}
                onBlur={handleAmountBlur}
                placeholder="Enter amount"
                className="w-full"
                required
              />
            </div>

            {/* Attachment */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Attachment :
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload').click()}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                >
                  Choose File
                </Button>
                <span className="text-sm text-gray-500">
                  {formData.attachment ? formData.attachment.name : "No file chosen"}
                </span>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500">
                Supported formats: JPG, PNG (Max 5MB)
              </p>
            </div>

            {/* Payment Remarks */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Payment Remarks :
              </Label>
              <Textarea
                value={formData.paymentRemarks}
                onChange={(e) => handleInputChange('paymentRemarks', e.target.value)}
                placeholder="Enter payment remarks..."
                className="w-full min-h-[80px] resize-none"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                id="cancelPaymentButton"
                ref={buttonCancelRef}
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentReceiptDialog;
