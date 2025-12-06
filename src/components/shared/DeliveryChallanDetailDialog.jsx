"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { File } from "lucide-react";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { HashLoader } from "react-spinners";

const DeliveryChallanDetailDialog = ({ open, onOpenChange, challan, dcDetails, selectedSummaryItem, isLoading }) => {
  const { companyDetails } = useSharedDataStore();
  
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-2xl font-bold text-center">
              Delivery Challan Detail
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (!challan && !dcDetails) return null;

  // API response structure: dcDetails = { dc_array: {...}, dc_products: [...] }
  // Use dc_array from dcDetails if available, otherwise fallback to challan
  const dcArray = dcDetails?.dc_array || dcDetails || challan;
  
  // Products to display - matching old DeliveryChallanModal logic
  // If so_listing_transaction_config == "0" and selectedSummaryItem has products, use those
  // Otherwise use dc_products from API response
  const productsToDisplay =
    companyDetails?.so_listing_transaction_config == "0" && selectedSummaryItem?.products
      ? selectedSummaryItem.products
      : dcDetails?.dc_products || dcDetails?.products || [];

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      // Handle DD/MM/YYYY format
      if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        if (day && month && year) {
          return dateStr; // Return as-is if already in DD/MM/YYYY format
        }
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr; // Return as-is if not a valid date
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr || "N/A";
    }
  };

  // Clean shipping address
  const cleanShippingAddress = (address) => {
    if (!address) return "N/A";
    return address
      .replace(/<br\/>/g, ", ")
      .replace(/^,+|,+$/g, "")
      .replace(/,\s*,+/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl font-bold text-center">
            Delivery Challan Detail ({dcArray.dc_fullno || dcArray.dcNo || dcArray.dc_fullno_text || "N/A"})
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4" />
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6 details-page">
          {/* Key Details Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#4CAF93] bg-opacity-20 p-3 sm:p-4 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold mb-2">Delivery Challan Details</h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">DC Date:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {formatDate(dcArray.created_dt || dcArray.dc_date || dcArray.dcdate)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">SO No:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {dcArray.so_no || dcArray.so_fullno || dcArray.salesorder_fullno || "N/A"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">SO Date:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {formatDate(dcArray.so_dt || dcArray.so_date || dcArray.salesorder_date)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Invoice No:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {dcArray.invoice_no || dcArray.invoiceNo || "N/A"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Invoice Date:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {formatDate(dcArray.invoice_dt || dcArray.invoice_date)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Shipping Branch:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {dcArray.shipping_branch || dcArray.shipping_branch_name || dcArray.branch_name || dcArray.branch || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#4CAF93] bg-opacity-20 p-3 sm:p-4 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold mb-2">Shipping Address</h3>
              <div className="space-y-2 text-sm sm:text-base">
                <p className="break-words overflow-hidden max-w-full">
                  {cleanShippingAddress(dcArray.shipping_address || dcArray.full_shipping_address || dcArray.address)}
                </p>
              </div>
            </div>
          </div>

          {/* Product Details */}
          {productsToDisplay && productsToDisplay.length > 0 && (
            <div>
              <div className="flex items-center justify-center mb-3 sm:mb-4">
                <File className="h-5 w-5 sm:h-6 sm:w-6 text-[#287F71] mr-2" />
                <h3 className="text-base sm:text-lg font-semibold">Product Details</h3>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[300px] sm:min-w-[600px]">
                  <TableHeader>
                    <TableRow className="bg-[#4a5a6b] hover:bg-[#4a5a6b] text-white">
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        Sr No
                      </TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        Name (Code)
                      </TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        Quantity
                      </TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        Unit
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsToDisplay.map((product, index) => (
                      <TableRow key={index} className="border-b">
                        <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                          {product.name || product.product_name} ({product.code || product.product_code})
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                          {product.formatted_quantity || product.quantity || "0"}
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                          {product.unit || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryChallanDetailDialog;

