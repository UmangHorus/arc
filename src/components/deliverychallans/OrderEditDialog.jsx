"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLoginStore } from "@/stores/auth.store";
import OrderProcessingService from "@/lib/OrderProcessingService";
import HashLoader from "react-spinners/HashLoader";
import { format } from "date-fns";

const OrderEditDialog = ({ salesorderId, open, onOpenChange }) => {
  const { token, user } = useLoginStore();
  const queryClient = useQueryClient();
  const [salesOrderDetails, setSalesOrderDetails] = useState(null);
  const [products, setProducts] = useState([]);
  const [saleProductCharges, setSaleProductCharges] = useState([]);
  const [isEdited, setIsEdited] = useState(false);

  // Fetch sales order details using getSingleSo API
  const {
    data: orderData,
    error: orderError,
    isLoading: orderLoading,
    refetch: refetchOrder,
  } = useQuery({
    queryKey: ["singleSalesOrder", salesorderId],
    queryFn: () =>
      OrderProcessingService.getSingleSalesOrder({
        token,
        salesOrderId: salesorderId,
      }),
    enabled: open && !!salesorderId && !!token,
    refetchOnMount: "always",
    staleTime: 0,
  });

  // Add this useEffect to clear cache when dialog closes
  useEffect(() => {
    if (!open) {
      // Clear sales order details query
      queryClient.removeQueries({
        queryKey: ["singleSalesOrder", salesorderId],
        exact: true
      });

      // Reset local state
      setSalesOrderDetails(null);
      setProducts([]);
      setSaleProductCharges([]);
      setIsEdited(false);
    }
  }, [open, salesorderId, queryClient]);

  // Handle sales order data
  useEffect(() => {
    if (orderData) {
      const responseData = Array.isArray(orderData) ? orderData[0] : orderData;

      if (responseData?.STATUS === "SUCCESS") {
        const data = responseData.DATA;

        // Clean addresses by removing <br/> tags
        const cleanAddress = (address) => {
          return address ? address.replace(/<br\s*\/?>/gi, " ") : "";
        };

        const extractedData = {
          salesorder_id: data.salesorder_id,
          contact_id: data.object_id,
          object_type: data.object_type,
          billing_address_id: data.address_id,
          shipping_address_id: data.shipping_address_id,
          company_id: data.company_id,
          branch_id: data.branch_id,
          division_id: data.cd_id,
          remarks: data.remarks,
          payments_terms: data.payments_terms,
          payment_status: data.payment_status,
          delivery_type: data.order_delivery_type_1,
          create_from: data.create_from,
          credit_days: data.credit_days,
          created_by: data.so_preparedBy_id,
          patient_name: data.patient_name,
          fullsalesorderno: data.fullsalesorderno,
          salesorder_dt: data.salesorder_dt,
          contact_name: data.contact_name,
          billto_address: cleanAddress(data.billto_address),
          shippto_address: cleanAddress(data.shippto_address),
          gmapAddress: data.gmapAddress,
          gmapurl: data.gmapurl,
          // use product_quotedprice instead of sec_unit_rate for editing purpose
          products: data.product.map(product => ({
            ...product,
            sec_unit_rate: product?.product_quotedprice
          })),
          sale_product_charge: data.sale_product_charge || [],
          roundoff: data.roundoff || "0",
        };

        setSalesOrderDetails(extractedData);
        // use product_quotedprice instead of sec_unit_rate for editing purpose
        setProducts(JSON.parse(JSON.stringify(data.product.map(product => ({
          ...product,
          sec_unit_rate: product?.product_quotedprice
        })))));
        setSaleProductCharges(data.sale_product_charge || []);
        setIsEdited(false);
      } else {
        toast.error(responseData?.MSG || "Failed to fetch order details", {
          duration: 2000,
        });
        onOpenChange(false);
      }
    }
    if (orderError) {
      toast.error("An error occurred while fetching order details", {
        duration: 2000,
      });
      onOpenChange(false);
    }
  }, [orderData, orderError, onOpenChange]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await OrderProcessingService.updateSalesOrder({
        token,
        employeeId: user?.id,
        formData,
      });
      return response;
    },
    onSuccess: (response) => {
      const result = Array.isArray(response) ? response[0] : response;
      if (result?.STATUS === "SUCCESS") {
        toast.success("Sales order updated successfully!", {
          duration: 2000,
        });
        setIsEdited(false);

        // Clear cache and refetch
        queryClient.removeQueries({
          queryKey: ["singleSalesOrder", salesorderId],
          exact: true
        });

        onOpenChange(false);
      } else {
        toast.error(result?.MSG || "Failed to update sales order", {
          duration: 2000,
        });
      }
    },
    onError: (error) => {
      toast.error("Error updating sales order: " + error.message, {
        duration: 2000,
      });
    },
  });

  // Calculate line item amount
  const calculateLineItemAmount = (product) => {
    let baseAmount = 0;

    if (product?.conversion_flg) {
      if (product.unit_con_mode == "1" && product.conversion_flg == "1") {
        baseAmount = parseFloat(product.quantity || "0") * parseFloat(product.product_quotedprice || "0");
      } else if (product.unit_con_mode == "1" && product.conversion_flg == "2") {
        baseAmount =
          (parseFloat(product.SecQtyTotal || "0") * parseFloat(product.product_quotedprice || "0")) /
          parseFloat(product.secondary_base_qty || "1");
      } else if (product.unit_con_mode == "3" && product.conversion_flg == "2") {
        baseAmount =
          parseFloat(product.SecQtyTotal || "0") * parseFloat(product.sec_unit_rate || "0");
      } else {
        baseAmount = parseFloat(product.quantity || "0") * parseFloat(product.product_quotedprice || "0");
      }
    } else {
      baseAmount = parseFloat(product.quantity || "0") * parseFloat(product.product_quotedprice || "0");
    }

    return baseAmount;
  };

  // Calculate discount amount
  const calculateSalesOrderDiscountAmount = (product) => {
    const baseAmount = calculateLineItemAmount(product);
    return baseAmount * (parseFloat(product.total_discount || "0") / 100);
  };

  // Handle product changes
  const handleProductChange = (index, field, value) => {
    setProducts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Conversion logic
      const convFact = parseFloat(updated[index]["secondary_base_qty"]) || 0;
      const conversionFlg = updated[index]["conversion_flg"];
      let secondaryQty = parseFloat(updated[index]["SecQtyTotal"]) || 0;
      let primaryQty = parseFloat(updated[index]["quantity"]) || 0;

      if (
        field == "quantity" ||
        field == "secondary_base_qty" ||
        field == "conversion_flg" ||
        field == "SecQtyTotal" ||
        field == "product_quotedprice" ||
        field == "sec_unit_rate" ||
        field == "total_discount"
      ) {
        if (conversionFlg == "1") {
          secondaryQty = convFact > 0 && primaryQty > 0 ? primaryQty * convFact : "";
          // Apply .toFixed(2) only if secondaryQty is a decimal
          updated[index]["SecQtyTotal"] =
            secondaryQty !== "" && Number.isFinite(secondaryQty) && !Number.isInteger(secondaryQty)
              ? secondaryQty.toFixed(2)
              : secondaryQty.toString();
        } else if (conversionFlg == "2") {
          primaryQty = convFact > 0 && secondaryQty > 0 ? secondaryQty / convFact : "";
          // Apply .toFixed(2) only if primaryQty is a decimal
          updated[index]["quantity"] =
            primaryQty !== "" && Number.isFinite(primaryQty) && !Number.isInteger(primaryQty)
              ? primaryQty.toFixed(2)
              : primaryQty.toString();
        }
      }

      return updated;
    });
    setIsEdited(true);
  };

  // Calculate totals
  const subtotal = products.reduce((sum, product) => {
    return sum + calculateLineItemAmount(product);
  }, 0);

  const totalDiscount = products.reduce((sum, product) => {
    return sum + calculateSalesOrderDiscountAmount(product);
  }, 0);

  const chargesTotal = saleProductCharges.reduce((sum, charge) => {
    return sum + parseFloat(charge.so_chrg_tax_amount || 0);
  }, 0);

  const netAmount = (subtotal - totalDiscount).toFixed(2);
  // const roundoffValue = parseFloat(salesOrderDetails?.roundoff || 0);
  // const grossTotal = (parseFloat(netAmount) + chargesTotal + roundoffValue).toFixed(2);
  const grossTotal = (parseFloat(netAmount) + chargesTotal).toFixed(2);

  const handleSave = async () => {
    if (!salesOrderDetails) return;

    try {
      const formData = new FormData();
      formData.append("salesorder_id", salesOrderDetails?.salesorder_id || "");
      formData.append("remarks", salesOrderDetails?.remarks || "");
      formData.append("credit_days", salesOrderDetails?.credit_days || "");
      formData.append("create_from", salesOrderDetails?.create_from || "");
      formData.append("payments_terms", salesOrderDetails?.payments_terms || "");
      formData.append("contact_id", salesOrderDetails?.contact_id || "");
      formData.append("object_type", salesOrderDetails?.object_type || "1");
      formData.append("billing_address_id", salesOrderDetails?.billing_address_id || "");
      formData.append("shipping_address_id", salesOrderDetails?.shipping_address_id || "");
      formData.append("created_assigned_by", salesOrderDetails?.created_by || user?.id);
      formData.append("remarks", salesOrderDetails?.remarks || "");
      // formData.append("AUTHORIZEKEY", process.env.NEXT_PUBLIC_AUTHORIZE_KEY || "");
      formData.append("patient_name", salesOrderDetails?.contact_name || "");
      formData.append("billing_address_id", salesOrderDetails?.billing_address_id || "");
      formData.append("shipping_address_id", salesOrderDetails?.shipping_address_id || "");
      formData.append("delivery_type", salesOrderDetails?.delivery_type || "2");
      formData.append("division_id", salesOrderDetails?.division_id || "");
      formData.append("company_id", salesOrderDetails?.company_id || "0");
      formData.append("branch_id", salesOrderDetails?.branch_id || "0");
      formData.append("created_by", salesOrderDetails?.created_by || user?.id);
      // formData.append("create_from", "salesorder_app");
      formData.append("gmapAddress", salesOrderDetails?.gmapAddress || "");
      formData.append("gmapurl", salesOrderDetails?.gmapurl || "");

      const formattedProducts = products.map((product) => ({
        productid: product.product_id || "",
        productname: product.product_name || "",
        categoryname: product.category_name || "",
        categoryid: product.category_id || "",
        productqty: product.quantity || "0",
        unit: product.unit_name || product.primary_unit_name || "",
        stock: product.stock || "0",
        rate: product.product_quotedprice || "0.00",
        product_image: product.product_image || "",
        secondary_base_qty: product.secondary_base_qty || "0",
        sec_unit: product.secondary_unit_name || "",
        productcode: product.product_code || "",
        totalrate: calculateLineItemAmount(product).toFixed(2) || "0.00",
        SecQtyReverseCalculate: product.SecQtyReverseCalculate || "0",
        unitvalue: product.unitvalue || "0",
        proddivision: product.proddivision || "Default Division",
        stock_data: product.stock_data || [
          {
            branch_name: "Main Branch",
            currenct_stock: "0",
            stockonsalesorder: "0",
            remaining: "0",
          },
        ],
        scheduleDate: product.scheduleDate
          ? format(new Date(product.scheduleDate), 'dd-MM-yyyy')
          : format(new Date(), 'dd-MM-yyyy'), discount: product.total_discount || "0",
        discount_amount: calculateSalesOrderDiscountAmount(product).toFixed(2) || "0.00",
        mrp_price: product.mrp_price || "0.00",
        unit_con_mode: product.unit_con_mode || "1",
        sec_unit_rate: product.sec_unit_rate || "0",
        conversion_flg: product.conversion_flg || "1",
        primary_unit_id: product.primary_unit_id || "",
        secondary_unit_id: product.secondary_unit_id || "",
        SecQtyTotal: product.SecQtyTotal || "0.00",
        attribute: product.attribute || null,
        sop_id: product.sop_id || 0,
      }));

      formData.append("products", JSON.stringify(formattedProducts));

      updateMutation.mutate(formData);
    } catch (error) {
      toast.error("Failed to prepare update data: " + error.message, {
        duration: 2000,
      });
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (orderLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-2xl font-bold text-center">
              Edit Sales Order
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!salesOrderDetails) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl font-bold text-center">
            Edit Sales Order ({salesOrderDetails?.fullsalesorderno})
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4" />
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 details-page">
          {/* Order Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Order Details */}
            <div className="bg-[#4CAF93] bg-opacity-20 p-3 sm:p-4 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold text-[#287F71] mb-2">
                Order Details
              </h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Order No:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {salesOrderDetails?.fullsalesorderno || "-"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Order Date:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {salesOrderDetails?.salesorder_dt || "N/A"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Party Name:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {salesOrderDetails?.contact_name || "N/A"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <p className="w-full sm:w-1/3 font-medium text-[#287F71]">Payment Status:</p>
                  <p className="w-full sm:w-2/3 break-words overflow-hidden max-w-full">
                    {salesOrderDetails?.payment_status || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Address Details */}
            <div className="bg-[#4CAF93] bg-opacity-20 p-3 sm:p-4 rounded-lg">
              <h3 className="text-base sm:text-lg font-semibold text-[#287F71] mb-2">
                Address Details
              </h3>
              <div className="space-y-2 text-sm sm:text-base">
                <div className="flex flex-col">
                  <p className="font-medium text-[#287F71] mb-1">Bill to Address:</p>
                  <p className="break-words overflow-hidden max-w-full bg-gray-50 p-2 rounded text-sm">
                    {salesOrderDetails?.billto_address || "N/A"}
                  </p>
                </div>
                <div className="flex flex-col">
                  <p className="font-medium text-[#287F71] mb-1">Ship to Address:</p>
                  <p className="break-words overflow-hidden max-w-full bg-gray-50 p-2 rounded text-sm">
                    {salesOrderDetails?.shippto_address || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Details Table */}
          <div className="overflow-x-auto">
            <Table className="min-w-[300px] sm:min-w-[600px] border">
              <TableHeader>
                <TableRow className="bg-[#4a5a6b] hover:bg-[#4a5a6b] text-white">
                  <TableHead className="text-white text-xs sm:text-sm px-2 py-2 text-left">
                    Product Name
                  </TableHead>
                  <TableHead className="text-white text-xs sm:text-sm px-2 py-2 text-left">
                    {products.some((product) => product?.conversion_flg)
                      ? "Primary Qty"
                      : "Qty"}
                  </TableHead>
                  {products.some((product) => product?.conversion_flg) && (
                    <>
                      <TableHead className="text-white text-xs sm:text-sm px-2 py-2 text-left">
                        Conversion Factor
                      </TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 py-2 text-left">
                        Total Secondary Qty
                      </TableHead>
                    </>
                  )}
                  <TableHead className="text-white text-xs sm:text-sm px-2 py-2 text-left">
                    Price
                  </TableHead>
                  <TableHead className="text-white text-xs sm:text-sm px-2 py-2 text-left">
                    Disc (%)
                  </TableHead>
                  <TableHead className="text-white text-xs sm:text-sm px-2 py-2 text-left">
                    Discount
                  </TableHead>
                  <TableHead className="text-white text-xs sm:text-sm px-2 py-2 text-left">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length > 0 ? (
                  <>
                    {products.map((product, index) => {
                      const lineItemAmount = calculateLineItemAmount(product);
                      const discountAmount = calculateSalesOrderDiscountAmount(product);

                      return (
                        <TableRow key={index} className="border-b hover:bg-gray-50">
                          <TableCell className="px-2 py-2 text-xs sm:text-sm text-left font-medium">
                            {product.product_name}
                          </TableCell>
                          <TableCell className="px-2 py-2 text-xs sm:text-sm text-left">
                            {product?.conversion_flg == "1" || !product?.conversion_flg ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={product?.quantity || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "" || /^(\d*\.?\d{0,2})$/.test(value)) {
                                      handleProductChange(index, "quantity", value);
                                    }
                                  }}
                                  className="w-16 sm:w-20 h-7 sm:h-8 text-xs sm:text-sm"
                                />
                                <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                                  {product?.unit_name || product?.primary_unit_name}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm">
                                  {product?.quantity || ""}
                                </span>
                                <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                                  {product?.unit_name || product?.primary_unit_name}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          {product?.conversion_flg && (
                            <>
                              <TableCell className="px-2 py-2 text-xs sm:text-sm text-left">
                                <span className="text-xs sm:text-sm">
                                  {product.secondary_base_qty || "N/A"}
                                </span>
                              </TableCell>
                              <TableCell className="px-2 py-2 text-xs sm:text-sm text-left">
                                {product?.conversion_flg == "2" ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="text"
                                      value={product?.SecQtyTotal || ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === "" || /^(\d*\.?\d{0,2})$/.test(value)) {
                                          handleProductChange(index, "SecQtyTotal", value);
                                        }
                                      }}
                                      className="w-16 sm:w-20 h-7 sm:h-8 text-xs sm:text-sm"
                                    />
                                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                                      {product.secondary_unit_name}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm">
                                      {product.SecQtyTotal || ""}
                                    </span>
                                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                                      {product?.secondary_unit || product?.secondary_unit_name}
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="px-2 py-2 text-xs sm:text-sm text-left">
                            <Input
                              type="text"
                              value={
                                product?.conversion_flg &&
                                  product.unit_con_mode == "3" &&
                                  product.conversion_flg == "2"
                                  ? product.sec_unit_rate ?? ""
                                  : product.product_quotedprice ?? ""
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || /^(\d*\.?\d{0,2})$/.test(value)) {
                                  handleProductChange(
                                    index,
                                    product?.conversion_flg &&
                                      product.unit_con_mode == "3" &&
                                      product.conversion_flg == "2"
                                      ? "sec_unit_rate"
                                      : "product_quotedprice",
                                    value
                                  );
                                }
                              }}
                              className="w-16 sm:w-20 h-7 sm:h-8 text-xs sm:text-sm"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-2 text-xs sm:text-sm text-left">
                            <Input
                              type="text"
                              value={product.total_discount ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (
                                  value === "" ||
                                  (/^(\d*\.?\d{0,2})$/.test(value) &&
                                    Number(value) >= 0 &&
                                    Number(value) <= 100)
                                ) {
                                  handleProductChange(index, "total_discount", value);
                                }
                              }}
                              className="w-12 sm:w-16 h-7 sm:h-8 text-xs sm:text-sm"
                            />
                          </TableCell>
                          <TableCell className="px-2 py-2 text-xs sm:text-sm text-left font-medium">
                            {discountAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="px-2 py-2 text-xs sm:text-sm text-left font-medium">
                            {lineItemAmount ? lineItemAmount.toFixed(2) : "0.00"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="border-t font-bold bg-gray-50">
                      <TableCell
                        colSpan={products.some((product) => product?.conversion_flg) ? 7 : 5}
                        className="px-2 py-2 text-xs sm:text-sm text-right"
                      >
                        Subtotal
                      </TableCell>
                      <TableCell className="px-2 py-2 text-xs sm:text-sm text-right font-bold text-[#287F71]">
                        ₹{subtotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t font-bold bg-gray-50">
                      <TableCell
                        colSpan={products.some((product) => product?.conversion_flg) ? 7 : 5}
                        className="px-2 py-2 text-xs sm:text-sm text-right"
                      >
                        Discount Total
                      </TableCell>
                      <TableCell className="px-2 py-2 text-xs sm:text-sm text-right font-bold text-[#287F71]">
                        ₹{totalDiscount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {saleProductCharges.map((charge, index) => (
                      <TableRow key={`charge-${index}`} className="border-t font-bold bg-gray-50">
                        <TableCell
                          colSpan={products.some((product) => product?.conversion_flg) ? 7 : 5}
                          className="px-2 py-2 text-xs sm:text-sm text-right"
                        >
                          {charge.so_chrg_tax_name}
                        </TableCell>
                        <TableCell className="px-2 py-2 text-xs sm:text-sm text-right font-bold text-[#287F71]">
                          ₹{parseFloat(charge.so_chrg_tax_amount || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Roundoff Row */}
                    {/* {roundoffValue !== 0 && (
                      <TableRow className="border-t font-bold bg-gray-50">
                        <TableCell
                          colSpan={products.some((product) => product?.conversion_flg) ? 7 : 5}
                          className="px-2 py-2 text-xs sm:text-sm text-right"
                        >
                          Adjustment
                        </TableCell>
                        <TableCell className="px-2 py-2 text-xs sm:text-sm text-right font-bold text-[#287F71]">
                          ₹{roundoffValue.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )} */}

                    <TableRow className="border-t-2 border-gray-300 font-bold bg-gray-100">
                      <TableCell
                        colSpan={products.some((product) => product?.conversion_flg) ? 7 : 5}
                        className="px-2 py-2 text-xs sm:text-sm text-right"
                      >
                        Gross Total
                      </TableCell>
                      <TableCell className="px-2 py-2  sm:text-sm text-right font-bold text-[#287F71] text-base">
                        ₹{grossTotal}
                      </TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={products.some((product) => product?.conversion_flg) ? 8 : 6}
                      className="text-center py-4 text-gray-500 text-sm sm:text-base"
                    >
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              className="px-4 sm:px-6 py-2 text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm sm:text-base px-4 sm:px-6 py-2"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderEditDialog;