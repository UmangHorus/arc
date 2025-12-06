"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import OrderProcessingService from "@/lib/OrderProcessingService";
import { useLoginStore } from "@/stores/auth.store";

const DeliveryStatusDialog = ({
  isOpen,
  onClose,
  selectedDc,
  dcpId,
  status,
  onSuccess,
  onOpenReceipt,
}) => {
  const { token, user } = useLoginStore();
  const [deliveryRemarks, setDeliveryRemarks] = useState("");
  const [file, setFile] = useState(null);
  const [productStatuses, setProductStatuses] = useState([]);
  const [isAllChecked, setIsAllChecked] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpData, setOtpData] = useState("");
  const [otpContactMobile, setOtpContactMobile] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(
    user?.enableOtp || user?.enable_otp === "Y" ? false : true
  );

  // Initialize product statuses
  useEffect(() => {
    if (selectedDc && isOpen) {
      if (selectedDc.products && Array.isArray(selectedDc.products)) {
        // Summary view - multiple products
        setProductStatuses(
          selectedDc.products.map((product) => ({
            productName: product.name,
            code: product.code,
            quantity: product.quantity,
            status: "2", // Delivered
            dcp_id: product.dcp_id,
            isSelected: true,
          }))
        );
        setIsAllChecked(true);
      } else {
        // Detailed view - single product
        setProductStatuses([
          {
            productName: selectedDc.prodname?.split("(")[0]?.trim() || selectedDc.name || "",
            code: selectedDc.code || "",
            quantity: selectedDc.qty || selectedDc.quantity || "",
            status: "2", // Delivered
            dcp_id: dcpId || selectedDc.dcp_id,
            isSelected: true,
          },
        ]);
        setIsAllChecked(true);
      }
      setOtpContactMobile(selectedDc.mobile_no || "");
      setIsButtonEnabled(user?.enableOtp || user?.enable_otp === "Y" ? false : true);
    }
  }, [selectedDc, isOpen, dcpId, user]);

  const handleCheckboxChange = (index) => {
    const updatedStatuses = [...productStatuses];
    updatedStatuses[index].isSelected = !updatedStatuses[index].isSelected;
    updatedStatuses[index].status = updatedStatuses[index].isSelected ? "2" : "3";
    setProductStatuses(updatedStatuses);
    setIsAllChecked(updatedStatuses.every((product) => product.isSelected));
  };

  const handleCheckAll = () => {
    const newIsAllChecked = !isAllChecked;
    const updatedStatuses = productStatuses.map((product) => ({
      ...product,
      isSelected: newIsAllChecked,
      status: newIsAllChecked ? "2" : "3",
    }));
    setProductStatuses(updatedStatuses);
    setIsAllChecked(newIsAllChecked);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      if (fileType !== "image/jpeg" && fileType !== "image/png") {
        toast.error("Invalid file type. Please upload a JPG or PNG file.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const sendOTP = async () => {
    if (!otpContactMobile) {
      toast.error("Mobile number is required");
      return;
    }

    try {
      const response = await OrderProcessingService.generateOTP({
        token,
        contactMobile: otpContactMobile,
      });

      const responseData = Array.isArray(response) ? response[0] : response;
      if (responseData?.STATUS === "SUCCESS") {
        setOtpData(responseData.DATA);
        toast.success("OTP sent successfully");
      } else {
        setOtpData(responseData.DATA);
        toast.error(responseData.MSG || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Failed to send OTP");
    }
  };

  const handlePinInputVal = async (pinValue) => {
    try {
      const response = await OrderProcessingService.verifyOTP({
        token,
        contact: otpContactMobile,
        key: otpData,
        verifyOTP: pinValue,
      });

      const responseData = Array.isArray(response) ? response[0] : response;
      if (responseData?.STATUS === "SUCCESS") {
        setIsButtonEnabled(true);
        setOtpError("");
        toast.success("OTP verified successfully");
      } else {
        setIsButtonEnabled(user?.enableOtp || user?.enable_otp === "Y" ? false : true);
        setOtpError("Oops! The entered OTP is incorrect. Please double-check the code and try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setIsButtonEnabled(user?.enableOtp || user?.enable_otp === "Y" ? false : true);
      setOtpError("Failed to verify OTP");
    }
  };

  const handleSubmit = async (e, openReceipt = false) => {
    e.preventDefault();

    if (deliveryRemarks.trim() === "") {
      toast.error("Delivery remark is mandatory.");
      return;
    }

    if (file) {
      const fileType = file.type;
      if (fileType !== "image/jpeg" && fileType !== "image/png") {
        toast.error("Invalid file type. Please upload a JPG or PNG file.");
        return;
      }
    }

    const employeeId = user?.id;
    const updatedArray = productStatuses.map((product) => ({
      ...product,
      remarks: deliveryRemarks,
      employee_id: employeeId,
    }));

    setIsSubmitting(true);

    try {
      const response = await OrderProcessingService.updateDCDispatchStatus({
        token,
        dcData: updatedArray,
        attachment: file,
      });

      const responseData = Array.isArray(response) ? response[0] : response;
      if (responseData?.STATUS === "SUCCESS") {
        toast.success(responseData.MSG || "Delivery status updated successfully");
        setDeliveryRemarks("");
        setFile(null);
        setProductStatuses([]);
        
        if (onSuccess) {
          onSuccess();
        }

        if (
          openReceipt &&
          selectedDc?.so_id > 0 &&
          (selectedDc?.payment_status === "Un Paid" || selectedDc?.payment_status === "Partially Paid")
        ) {
          // Close the delivery status modal first
          onClose();
          // Then open receipt modal - handled by parent
          if (onOpenReceipt) {
            // Small delay to ensure modal closes before opening receipt
            setTimeout(() => {
              onOpenReceipt(selectedDc?.so_id, selectedDc?.pending_amount || selectedDc?.so_pending_amount || 0, selectedDc);
            }, 100);
          }
        } else {
          onClose();
        }
      } else {
        toast.error(responseData.MSG || "Something went wrong. Changes are not saved");
      }
    } catch (error) {
      console.error("Error updating delivery status:", error);
      toast.error("Something went wrong. Changes are not saved");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
      <DialogHeader>
          <DialogTitle>
            Delivery Status ({selectedDc?.dc_fullno_text || selectedDc?.dcno || selectedDc?.dc_fullno || "N/A"})
            {selectedDc?.credit_limit_days && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (Credit Limit days: {selectedDc.credit_limit_days})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          {/* Products Table */}
          {productStatuses.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllChecked}
                        onCheckedChange={handleCheckAll}
                        className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
                      />
                    </TableHead>
                    <TableHead>Sr No</TableHead>
                    <TableHead>Product Name (Code)</TableHead>
                    <TableHead>Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productStatuses.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Checkbox
                          checked={product.isSelected}
                          onCheckedChange={() => handleCheckboxChange(index)}
                          className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
                        />
                      </TableCell>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {product.productName} ({product.code})
                      </TableCell>
                      <TableCell>
                        {product.quantity}{" "}
                        {selectedDc?.products?.[index]?.unit || selectedDc?.unit || ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Attachment */}
          <div>
            <Label htmlFor="attachment">Attachment :</Label>
            <Input
              id="attachment"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>

          {/* Remarks */}
          <div>
            <Label htmlFor="remarks">
              <span className="text-red-500">*</span> Remarks :
            </Label>
            <Textarea
              id="remarks"
              className="mt-1"
              rows={3}
              value={deliveryRemarks}
              onChange={(e) => setDeliveryRemarks(e.target.value || "")}
              placeholder="Enter delivery remarks"
            />
          </div>

          {/* OTP Section */}
          {(user?.enableOtp || user?.enable_otp === "Y") && (
            <div className="space-y-2">
              <Label>
                <span className="text-red-500">*</span> Enter OTP :
              </Label>
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendOTP}
                >
                  Send OTP
                </Button>
                <div className="flex gap-1">
                  {[...Array(6)].map((_, index) => (
                    <Input
                      key={index}
                      type="text"
                      maxLength={1}
                      className="w-10 h-10 text-center text-lg font-semibold"
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        e.target.value = value;
                        if (value && index < 5) {
                          const nextInput = e.target.parentElement?.children[index + 1];
                          if (nextInput) nextInput.focus();
                        }
                        // Collect all OTP values
                        const inputs = Array.from(e.target.parentElement?.children || []);
                        const otpValue = inputs.map(input => input.value || '').join('');
                        if (otpValue.length === 6) {
                          handlePinInputVal(otpValue);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
                          const prevInput = e.currentTarget.parentElement?.children[index - 1];
                          if (prevInput) prevInput.focus();
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
              {otpError && (
                <p className="text-sm text-red-500">{otpError}</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              Close
            </Button>
            {selectedDc?.so_id > 0 &&
              (selectedDc?.payment_status === "Un Paid" ||
                selectedDc?.payment_status === "Partially Paid") && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isButtonEnabled || isSubmitting}
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                >
                  Save and Create Receipt
                </Button>
              )}
            <Button
              type="submit"
              disabled={!isButtonEnabled || isSubmitting}
              className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryStatusDialog;

