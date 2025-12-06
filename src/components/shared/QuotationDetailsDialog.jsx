"use client";

import { useState, useEffect } from "react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, FileText, File, MessageSquare, Mic, Info } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import { QuotationService } from "@/lib/QuotationService";
import api from "@/lib/api/axios";
import { HashLoader } from "react-spinners";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const QuotationDetailsDialog = ({ quotationId, open, onOpenChange }) => {
  const { navConfig } = useLoginStore();
  const baseurl = api.defaults.baseURL;
  const imageurl = api.defaults.baseURL?.replace(
    /^https?:\/\//,
    ""
  ); const quotationsLabel = navConfig?.labels?.quotations || "Quotation";
  const queryClient = useQueryClient();
  const [quotationDetails, setQuotationDetails] = useState(null);
  const [quotationDivisionConfig, setQuotationDivisionConfig] = useState("");
  const [tooltipOpenIndex, setTooltipOpenIndex] = useState(null);

  // Fetch quotation details
  const {
    data: quotationData,
    error: quotationError,
    isLoading: quotationLoading,
  } = useQuery({
    queryKey: ["quotationDetails", quotationId],
    queryFn: () => QuotationService.QuotationDetail(quotationId),
    enabled: open && !!quotationId,
    refetchOnMount: "always",
    staleTime: 0,
    cacheTime: 0,
  });

  // Add this useEffect to clear cache when dialog closes
  useEffect(() => {
    if (!open) {
      // Clear quotation details query
      queryClient.removeQueries({
        queryKey: ["quotationDetails", quotationId],
        exact: true
      });

      // Reset local state
      setQuotationDetails(null);
      setQuotationDivisionConfig("");
    }
  }, [open, quotationId, queryClient]);

  // Handle quotation data
  useEffect(() => {
    if (quotationData && quotationData?.STATUS == "SUCCESS") {
      setQuotationDetails(quotationData?.DATA?.QuotationDetail?.Quotation);
      setQuotationDivisionConfig(quotationData?.DATA?.config_division);
    } else if (quotationData && quotationData[0]?.STATUS == "ERROR") {
      toast.error(quotationData[0]?.MSG || "Failed to fetch quotation details");
      onOpenChange(false);
    }
    if (quotationError) {
      toast.error("An error occurred while fetching quotation details");
      onOpenChange(false);
    }
  }, [quotationData, quotationError, onOpenChange]);

  const calculateQuotationDiscountAmount = (item) => {
    let baseAmount = 0;
    if (item?.conversion_flg != "") {
      if (item.unit_con_mode == "1" && item.conversion_flg == "1") {
        baseAmount = parseFloat(item.productqty || "0") * parseFloat(item.rate || "0");
      } else if (item.unit_con_mode == "1" && item.conversion_flg == "2") {
        baseAmount =
          (parseFloat(item.SecQtyTotal || "0") * parseFloat(item.rate || "0")) /
          parseFloat(item.secondary_base_qty || "1");
      } else if (item.unit_con_mode == "3" && item.conversion_flg == "2") {
        baseAmount =
          parseFloat(item.SecQtyTotal || "0") * parseFloat(item.rate || "0");
      } else {
        baseAmount = parseFloat(item.productqty || "0") * parseFloat(item.rate || "0");
      }
    } else {
      baseAmount = parseFloat(item.productqty || "0") * parseFloat(item.rate || "0");
    }
    return baseAmount * (parseFloat(item.total_discount || "0") / 100);
  };

  const calculateQuotationBaseAmount = (item) => {
    let baseAmount = 0;
    if (item?.conversion_flg != "") {
      if (item.unit_con_mode == "1" && item.conversion_flg == "1") {
        baseAmount = parseFloat(item.productqty || "0") * parseFloat(item.rate || "0");
      } else if (item.unit_con_mode == "1" && item.conversion_flg == "2") {
        baseAmount =
          (parseFloat(item.SecQtyTotal || "0") * parseFloat(item.rate || "0")) /
          parseFloat(item.secondary_base_qty || "1");
      } else if (item.unit_con_mode == "3" && item.conversion_flg == "2") {
        baseAmount =
          parseFloat(item.SecQtyTotal || "0") * parseFloat(item.rate || "0");
      } else {
        baseAmount = parseFloat(item.productqty || "0") * parseFloat(item.rate || "0");
      }
    } else {
      baseAmount = parseFloat(item.productqty || "0") * parseFloat(item.rate || "0");
    }
    return baseAmount;
  };

  const products = quotationDetails?.Products || [];
  const quotationProductCharges = quotationDetails?.sale_product_charge || [];

  const totalQuotationProductQty = Array.isArray(products)
    ? products.reduce((sum, item) => sum + parseFloat(item.productqty || "0"), 0)
    : 0;

  const subtotal = Array.isArray(products)
    ? products.reduce((sum, item) => sum + calculateQuotationBaseAmount(item), 0)
    : 0;

  const totalDiscount = Array.isArray(products)
    ? products.reduce((sum, item) => sum + calculateQuotationDiscountAmount(item), 0)
    : 0;

  const totalCharges = Array.isArray(quotationProductCharges)
    ? quotationProductCharges.reduce(
      (sum, charge) => sum + parseFloat(charge.Quotation_chrg_tax_amount || "0"),
      0
    )
    : 0;

  // const netAmount = (subtotal - totalDiscount).toFixed(2);
  // const grossTotal = (parseFloat(netAmount) + totalCharges).toFixed(2);

  // Update calculations for netAmount and grossTotal
  const netAmount = (subtotal - totalDiscount).toFixed(2);
  const adjustment = parseFloat(quotationDetails?.roundoff || "0");
  const grossTotal = (parseFloat(netAmount) + totalCharges + adjustment).toFixed(2);

  const getPaymentTermsMessage = (value) => {
    switch (value) {
      case "A":
        return "100% Advance";
      case "F":
        return "Full(Credit days)";
      case "P":
        return "Part / Advance";
      case "E":
        return "EMI";
      default:
        return "";
    }
  };

  if (quotationLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-2xl font-bold text-center">
              {quotationsLabel} Details
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl font-bold text-center">
            {quotationsLabel} Details
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4" />
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6 details-page">
          {/* Customer and Quotation Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Details */}
            <div className="bg-[#4CAF93] bg-opacity-20 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <User className="h-5 w-5 sm:h-6 sm:w-6 text-[#287F71] mr-2" />
                <h3 className="text-base sm:text-lg font-semibold">Customer Details</h3>
              </div>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Contact:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.ContactName || "-"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Mobile:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.Contactmobile_no || "-"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Email:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.email || "-"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Customer Name:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.patient_name || "-"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Billing Address:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.billing_address || "-"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Shipping Address:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.shipping_address || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quotation Details */}
            <div className="bg-[#4CAF93] bg-opacity-20 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-[#287F71] mr-2" />
                <h3 className="text-base sm:text-lg font-semibold">{quotationsLabel} Details</h3>
              </div>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">{quotationsLabel} No:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.fullsalesorderno || "-"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">{quotationsLabel} Date & Time:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.Date || "-"}
                  </p>
                </div>
                {/* <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">{quotationsLabel} Status:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.QuotationStatuslabel || "-"}
                  </p>
                </div> */}
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Branch:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.branch_name || "-"}
                  </p>
                </div>
                {quotationDivisionConfig > 0 && (
                  <div className="flex flex-col sm:flex-row">
                    <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Division:</p>
                    <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                      {quotationDetails?.division_name || "-"}
                    </p>
                  </div>
                )}
                {/* <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Delivery Mode:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.delivery_mode || "-"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Dispatch Status:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {quotationDetails?.dispatch_status || "-"}
                  </p>
                </div> */}
                {quotationDetails?.credit_days && (
                  <div className="flex flex-col sm:flex-row">
                    <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Credit Days:</p>
                    <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                      {quotationDetails?.credit_days || "0"}
                    </p>
                  </div>
                )}
                {quotationDetails?.payments_terms && (
                  <div className="flex flex-col sm:flex-row">
                    <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Payment Terms:</p>
                    <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                      {getPaymentTermsMessage(quotationDetails.payments_terms) || "-"}
                    </p>
                  </div>
                )}
                {quotationDetails?.gst_no && (
                  <div className="flex flex-col sm:flex-row">
                    <p className="w-full sm:w-1/3 font-medium text-[#287F71]">GST Number:</p>
                    <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                      {quotationDetails?.gst_no || "-"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Process Flow */}
          {/* <div className="flex justify-between items-center mt-4 mx-0 sm:mx-16">
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg p-2 ${Number(quotationDetails?.QuotationStatus) == 1
                  ? "bg-yellow-100 border-b-4 border-blue-500"
                  : Number(quotationDetails?.QuotationStatus) < 1
                    ? "border-gray-300"
                    : "bg-blue-100"
                  }`}
              >
                <img
                  src={`${baseurl}/public/images/orderbot/order_received.png`}
                  alt="Quotation Received"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div
              className={`flex-1 h-1 sm:mx-2 ${Number(quotationDetails?.QuotationStatus) <= 1
                ? "border-dashed border-gray-300"
                : "bg-blue-200"
                }`}
            ></div>
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg p-2 ${Number(quotationDetails?.QuotationStatus) == 2
                  ? "bg-yellow-100 border-b-4 border-blue-500"
                  : Number(quotationDetails?.QuotationStatus) < 2
                    ? "border-gray-300"
                    : "bg-blue-100"
                  }`}
              >
                <img
                  src={`${baseurl}/public/images/orderbot/order_accepted.png`}
                  alt="Quotation Accepted"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div
              className={`flex-1 h-1 sm:mx-2 ${Number(quotationDetails?.QuotationStatus) <= 2
                ? "border-dashed border-gray-300"
                : "bg-blue-200"
                }`}
            ></div>
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg p-2 ${Number(quotationDetails?.QuotationStatus) == 3
                  ? "bg-yellow-100 border-b-4 border-blue-500"
                  : Number(quotationDetails?.QuotationStatus) < 3
                    ? "border-gray-300"
                    : "bg-blue-100"
                  }`}
              >
                <img
                  src={`${baseurl}/public/images/orderbot/order_assigned.png`}
                  alt="Quotation Assigned"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div
              className={`flex-1 h-1 sm:mx-2 ${Number(quotationDetails?.QuotationStatus) <= 3
                ? "border-dashed border-gray-300"
                : "bg-blue-200"
                }`}
            ></div>
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg p-2 ${Number(quotationDetails?.QuotationStatus) == 4
                  ? "bg-yellow-100 border-b-4 border-blue-500"
                  : Number(quotationDetails?.QuotationStatus) < 4
                    ? "border-gray-300"
                    : "bg-blue-100"
                  }`}
              >
                <img
                  src={`${baseurl}/public/images/orderbot/order_out_for_delivery.png`}
                  alt="Quotation Shipping"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div
              className={`flex-1 h-1 sm:mx-2 ${Number(quotationDetails?.QuotationStatus) <= 4
                ? "border-dashed border-gray-300"
                : "bg-blue-200"
                }`}
            ></div>
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg p-2 ${Number(quotationDetails?.QuotationStatus) == 5
                  ? "bg-yellow-100 border-b-4 border-blue-500"
                  : Number(quotationDetails?.QuotationStatus) < 5
                    ? "border-gray-300"
                    : "bg-blue-100"
                  }`}
              >
                <img
                  src={`${baseurl}/public/images/orderbot/order_delivered.png`}
                  alt="Quotation Delivered"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div> */}

          {/* <div className="flex justify-between text-xs sm:text-sm text-center">
            <p className="w-1/5">
              {quotationDetails?.QuotationStatus == "1"
                ? quotationDetails?.QuotationStatuslabel
                : "Quotation Received"}
            </p>
            <p className="w-1/5">
              {quotationDetails?.QuotationStatus == "2"
                ? quotationDetails?.QuotationStatuslabel
                : "Quotation Accepted"}
            </p>
            <p className="w-1/5">
              {quotationDetails?.QuotationStatus == "3"
                ? quotationDetails?.QuotationStatuslabel
                : "Quotation Assigned"}
            </p>
            <p className="w-1/5">
              {quotationDetails?.QuotationStatus == "4"
                ? quotationDetails?.QuotationStatuslabel
                : "Quotation Shipping"}
            </p>
            <p className="w-1/5">
              {quotationDetails?.QuotationStatus == "5"
                ? quotationDetails?.QuotationStatuslabel
                : "Quotation Delivered"}
            </p>
          </div> */}

          {/* Billing Information */}
          {/* <div className="bg-[#287F71] text-white p-4 rounded-lg flex flex-col justify-around gap-4 sm:flex-row sm:gap-8">
            {quotationDetails?.grand_total && (
              <div className="text-center">
                <p className="text-xs sm:text-sm font-semibold">BILLING AMOUNT</p>
                <p className="text-sm sm:text-base font-bold">₹ {quotationDetails?.grand_total}</p>
              </div>
            )}
            {quotationDetails?.payment_status && (
              <div className="text-center">
                <p className="text-xs sm:text-sm font-semibold">PAYMENT STATUS</p>
                <p className="text-sm sm:text-base font-bold">{quotationDetails?.payment_status}</p>
              </div>
            )}
            {quotationDetails?.delivery_status && (
              <div className="text-center">
                <p className="text-xs sm:text-sm font-semibold">DELIVERY STATUS</p>
                <p className="text-sm sm:text-base font-bold">{quotationDetails?.delivery_status}</p>
              </div>
            )}
          </div> */}

          {/* Product Details */}
          {products.length > 0 && (
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
                        Image
                      </TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        Product Name
                      </TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        {products.some((product) => product?.conversion_flg != "")
                          ? "Primary Qty"
                          : "Qty"}
                      </TableHead>
                      {products.some((product) => product?.conversion_flg != "") && (
                        <>
                          <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                            Conversion Factor
                          </TableHead>
                          <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                            Total Secondary Qty
                          </TableHead>
                        </>
                      )}
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        Rate
                      </TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        Disc (%)
                      </TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        Disc
                      </TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((element, index) => {
                      const discountAmount = calculateQuotationDiscountAmount(element);
                      const baseAmount = calculateQuotationBaseAmount(element);

                      return (
                        <TableRow key={index} className="border-b">
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            <img
                              src={`${baseurl}/viewimage/getproduct/${element.product_image}/normal`}
                              alt="Product Image"
                              className="border-2 border-gray-400 shadow-md mx-auto w-[40px] h-[40px] object-contain rounded-md"
                            />
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            <div className="flex items-center justify-center gap-1">
                              {element?.productname || "-"} ({element?.productcode || "-"})
                              {element.short_description && (
                                <>
                                  {/* Desktop - Hover */}
                                  <div className="hidden sm:block">
                                    <TooltipProvider>
                                      <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild>
                                          <Info className="text-blue-500 cursor-pointer h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-xs text-sm">{element.short_description}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>

                                  {/* Mobile - Click */}
                                  <div className="sm:hidden">
                                    <TooltipProvider>
                                      <Tooltip
                                        open={tooltipOpenIndex === index}
                                        onOpenChange={(open) => setTooltipOpenIndex(open ? index : null)}
                                        delayDuration={0}
                                      >
                                        <TooltipTrigger asChild>
                                          <Info
                                            className="text-blue-500 cursor-pointer h-3.5 w-3.5 flex-shrink-0"
                                            onClick={() => setTooltipOpenIndex(tooltipOpenIndex === index ? null : index)}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-xs text-sm">{element.short_description}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className={`px-2 sm:px-4 py-2 text-xs sm:text-sm text-center ${element?.conversion_flg != "2" ? "font-bold" : ""
                            }`}>
                            {element?.productqty || "-"}
                            {element?.unit
                              ? ` (${element.unit})`
                              : element?.primary_unit_name
                                ? ` (${element.primary_unit_name})`
                                : ""}
                          </TableCell>
                          {element?.conversion_flg != "" && (
                            <>
                              <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                                {element?.secondary_base_qty || "-"}
                              </TableCell>
                              <TableCell className={`px-2 sm:px-4 py-2 text-xs sm:text-sm text-center ${element?.conversion_flg == "2" ? "font-bold" : ""
                                }`}>
                                {element?.SecQtyTotal || "-"}
                                {element?.sec_unit
                                  ? ` (${element.sec_unit})`
                                  : element?.secondary_unit_name
                                    ? ` (${element.secondary_unit_name})`
                                    : ""}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            {element?.rate || "-"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            {element?.total_discount || "0"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            {discountAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            {baseAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t font-bold">
                      <TableCell
                        colSpan={products.some((product) => product?.conversion_flg) ? 8 : 6}
                        className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right"
                      >
                        Subtotal
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">
                        {subtotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t font-bold">
                      <TableCell
                        colSpan={products.some((product) => product?.conversion_flg) ? 8 : 6}
                        className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right"
                      >
                        Discount Total
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">
                        {totalDiscount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {quotationProductCharges.map((charge, index) => (
                      <TableRow key={`charge-${index}`} className="border-t font-bold">
                        <TableCell
                          colSpan={products.some((product) => product?.conversion_flg) ? 8 : 6}
                          className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right"
                        >
                          {charge.Quotation_chrg_tax_name}
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">
                          {parseFloat(charge.Quotation_chrg_tax_amount || "0").toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {quotationDetails?.roundoff && (
                      <TableRow className="border-t font-bold">
                        <TableCell
                          colSpan={products.some((product) => product?.conversion_flg) ? 8 : 6}
                          className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right"
                        >
                          Adjustment
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">
                          {(adjustment >= 0 ? "+" : "") + adjustment.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-t font-bold">
                      <TableCell
                        colSpan={products.some((product) => product?.conversion_flg) ? 8 : 6}
                        className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right"
                      >
                        Gross Total
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-right">
                        {grossTotal}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Remarks */}
            {quotationDetails?.remarks && (
              <div>
                <div className="flex items-center mb-2">
                  <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-[#287F71] mr-2" />
                  <h3 className="text-base sm:text-lg font-semibold">Remarks</h3>
                </div>
                <div className="bg-gray-100 p-3 sm:p-4 rounded-lg">
                  <p className="text-sm sm:text-base">{quotationDetails?.remarks}</p>
                </div>
              </div>
            )}

            {/* voice remark  */}
            {quotationDetails?.remark_file?.endsWith(".mp3") && (
              <div>
                <div className="flex items-center mb-2">
                  <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-[#287F71] mr-2" />
                  <h3 className="text-base sm:text-lg font-semibold">Voice Remarks</h3>
                </div>
                <audio
                  controls
                  src={`${baseurl}/public/dmsfile/${imageurl}/officeexpress/quotation/${quotationDetails.remark_file}`}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationDetailsDialog;
