"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { useLoginStore } from "@/stores/auth.store";
import OrderProcessingService from "@/lib/OrderProcessingService";
import BranchStockDialog from "@/components/shared/BranchStockDialog";
import StockListDialog from "@/components/shared/StockListDialog";
import { useCompanyDetails } from "@/hooks/useCompanyDetails";
import { HashLoader } from "react-spinners";

const CreateDCDialog = ({
  open,
  onOpenChange,
  orderData = null,
}) => {
  const router = useRouter();
  const { companyBranchDivisionData } = useSharedDataStore();
  const { companyDetails } = useCompanyDetails();
  const { user, token } = useLoginStore();
  const buttonCancelRef = useRef(null);

  const [formData, setFormData] = useState({
    creditDays: "",
    assignEmp: "",
    deliveryType: "P",
    remarks: "",
    shipThrough: "",
    transporterId: "",
    vehicleNo: "",
    lrNo: "",
    lrDate: "",
  });

  const [formValues, setFormValues] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [salesOrderDetails, setSalesOrderDetails] = useState(null);
  const [isBranchStockDialogOpen, setIsBranchStockDialogOpen] = useState(false);
  const [isStockListModalOpen, setIsStockListModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState(null);
  const [selectAll, setSelectAll] = useState(true);
  const [selectedDefaultEmpId, setSelectedDefaultEmpId] = useState("");
  const [selectedRows, setSelectedRows] = useState({});
  const [searchBarcode, setSearchBarcode] = useState("");
  const [stockList, setStockList] = useState([]);
  const [prodAttrHeadings, setProdAttrHeadings] = useState([]);
  const [prodAttrValue, setProdAttrValue] = useState([]);
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [selectedProductForAttr, setSelectedProductForAttr] = useState(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState(null);
  const [employees, setEmployees] = useState([]);

  // Fetch employee list from medical API
  const {
    data: employeeListData,
    error: employeeListError,
    isLoading: employeeListLoading,
  } = useQuery({
    queryKey: ["medicalEmployeeList", token],
    queryFn: () => OrderProcessingService.getMedicalEmployeeList({ token }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Handle employee list data updates
  useEffect(() => {
    if (employeeListData) {
      const responseData = Array.isArray(employeeListData)
        ? employeeListData[0]
        : employeeListData;
      if (responseData?.STATUS === "SUCCESS") {
        // Transform the response structure
        // From: [{ Employee: { employee_id: "22", name: "Pankaj" } }]
        // To: [{ employee_id: "22", name: "Pankaj" }]
        const transformedEmployees =
          responseData.DATA?.map((item) => ({
            employee_id: item?.Employee?.employee_id || item?.employee_id,
            name: item?.Employee?.name || item?.name,
            employee_name: item?.Employee?.name || item?.name,
          })) || [];
        setEmployees(transformedEmployees);
      } else {
        toast.error(
          responseData?.MSG || "Invalid employee list response data"
        );
        setEmployees([]);
      }
    }
    if (employeeListError) {
      toast.error("Failed to fetch employee list");
      setEmployees([]);
    }
  }, [employeeListData, employeeListError]);

  // Memoize setSelectedRows
  const memoizedSetSelectedRows = useCallback((rows) => {
    setSelectedRows(rows);
  }, []);

  // Memoize setSearchBarcode
  const onSearchBarcodeChange = useCallback((value) => {
    setSearchBarcode(value);
  }, []);

  // Fetch single sales order details
  const fetchSalesOrderDetails = async (salesOrderId) => {
    if (!salesOrderId || !token) return;

    setIsLoading(true);
    try {
      const response = await OrderProcessingService.getSingleSalesOrder({
        token,
        salesOrderId,
      });

      const result = Array.isArray(response) ? response[0] : response;

      if (result?.STATUS === "SUCCESS") {
        const orderData = result.DATA;
        setSalesOrderDetails(orderData);

        // Set form data from API response
        setFormData((prev) => ({
          ...prev,
          creditDays: orderData.credit_days || "",
          remarks: orderData.remarks || "",
          deliveryType: orderData.order_delivery_type || "P",
        }));

        // Transform products similar to old code
        const newArr = orderData.product?.map((item) => {
          var un_val = 0;
          if (item.unit_name != "") {
            un_val = 0;
          } else if (item.secondary_unit != "") {
            un_val = 1;
          }

          // Check barcode condition
          const useBarcode =
            companyDetails?.PRODUCT_BARCODE_GENERATOR == "Y" &&
            item?.enable_for_barcode == "Y";

          // Initialize values based on condition
          let quantity = useBarcode ? "" : 0;
          let branchWiseStock = item.branch_wise_stock;
          let filteredBranchWiseStock = [];

          if (!useBarcode) {
            // Original logic when not using barcode
            filteredBranchWiseStock =
              branchWiseStock?.filter(
                (branch) => branch.branch_id == orderData.branch_id
              ) || [];

            const branchesWithStock =
              filteredBranchWiseStock?.filter(
                (branch) =>
                  parseFloat(
                    item.conversion_flg == "2"
                      ? branch.actual_sec_currenct_stock
                      : branch.current_stock
                  ) > 0
              ) || [];

            if (branchesWithStock.length == 1) {
              const branchStock = branchesWithStock[0];
              const usedQuantity = parseFloat(item.used_qty) || 0;
              let main_qty;
              if (item.conversion_flg == "2") {
                const secQtyTotal = parseFloat(item.SecQtyTotal) || 0;
                const secondaryBaseQty =
                  parseFloat(item.secondary_base_qty) || 1;
                main_qty = secQtyTotal - usedQuantity * secondaryBaseQty;
              } else {
                const soQuantity = parseFloat(item.soquantity) || 0;
                main_qty = soQuantity - usedQuantity;
              }

              const branchAvailableStock = parseFloat(
                item.conversion_flg == "2"
                  ? branchStock.actual_sec_currenct_stock
                  : branchStock.current_stock
              );

              const branchIndex = filteredBranchWiseStock.findIndex(
                (b) => b.branch_id == branchStock.branch_id
              );

              let quantityToSet;
              if (main_qty > 0) {
                quantityToSet = Math.min(main_qty, branchAvailableStock);
              } else {
                quantityToSet = 0;
              }

              if (quantityToSet > 0) {
                quantity = Math.floor(quantityToSet);
              }

              if (branchIndex != -1) {
                filteredBranchWiseStock[branchIndex].qty = quantity;
              }
            }
          } else {
            // When using barcode, keep the original branchwise_stock data
            filteredBranchWiseStock =
              branchWiseStock?.filter(
                (branch) => branch.branch_id == orderData.branch_id
              ) || [];
          }

          return {
            sop_id: item.sop_id,
            product_id: item.product_id,
            soquantity: item.soquantity,
            quantity: quantity,
            usedquantity: item.used_qty,
            product_name: item.product_name,
            product_price: item.product_price,
            product_quotedprice: item.product_quotedprice,
            unit_name: item.unit_name,
            secondary_unit: item.secondary_unit,
            current_stock: item.current_stock,
            emp_id: "",
            attributes: item.attributes,
            branchwise_stock: filteredBranchWiseStock,
            SecQtyReverseCalculate: item.SecQtyReverseCalculate,
            conv_fact: item.prod_conversion > 0 ? item.prod_conversion : 0,
            unitvalue: un_val,
            shipp_from: orderData.branch_id,
            allow_product_decimals_point: item.allow_product_decimals_point,
            primary_unit_id: item.primary_unit_id,
            primary_unit_name: item.primary_unit_name,
            secondary_unit_id: item.secondary_unit_id,
            secondary_unit_name: item.secondary_unit_name,
            conversion_flg: item.conversion_flg,
            SecQtyTotal: item.SecQtyTotal,
            secondary_base_qty: item.secondary_base_qty,
            enable_for_barcode: item.enable_for_barcode,
            isChecked: true,
          };
        });

        setFormValues(newArr || []);
      } else {
        toast.error(result?.MSG || "Failed to fetch order details");
      }
    } catch (error) {
      console.error("Error fetching sales order:", error);
      toast.error("Error fetching order details: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch order details when dialog opens
  useEffect(() => {
    if (open && orderData?.salesorder_id) {
      fetchSalesOrderDetails(orderData.salesorder_id);
    }
  }, [open, orderData?.salesorder_id, token]);

  // Reset all data when dialog closes (handles ESC key, click outside, close button, etc.)
  useEffect(() => {
    if (!open) {
      // Reset local state
      setSalesOrderDetails(null);
      setFormValues([]);
      setFormData({
        creditDays: "",
        assignEmp: "",
        deliveryType: "P",
        remarks: "",
        shipThrough: "",
        transporterId: "",
        vehicleNo: "",
        lrNo: "",
        lrDate: "",
      });
      setSelectedRows({});
      setSearchBarcode("");
      setStockList([]);
      setProdAttrHeadings([]);
      setProdAttrValue([]);
      setSelectedDefaultEmpId("");
      setSelectAll(true);
      setSelectedProductForStock(null);
      setIsBranchStockDialogOpen(false);
      setIsStockListModalOpen(false);
      setIsAttrModalOpen(false);
      setSelectedProductForAttr(null);
      setSelectedProductIndex(null);
      setIsLoading(false);
      setIsSubmitting(false);
    }
  }, [open]);

  // Set all formValues isChecked to true when component mounts
  useEffect(() => {
    if (formValues.length > 0) {
      const updatedFormValues = formValues.map((prod) => ({
        ...prod,
        isChecked: selectAll,
      }));
      setFormValues(updatedFormValues);
    }
  }, []);

  // Calculate sum of qty and free_qty for a product
  const getTotalQuantityForProduct = (prod) => {
    const productRows = selectedRows[prod.product_id] || [];
    const total = productRows.reduce((sum, row) => {
      const qty = parseFloat(row?.qty) || 0;
      const freeQty = parseFloat(row?.free_qty) || 0;
      return sum + qty + freeQty;
    }, 0);
    if (total <= 0) return "";
    return Math.floor(total).toString();
  };

  // Handle default emp change
  const handleDefaultEmpChange = (e) => {
    e.preventDefault();
    setSelectedDefaultEmpId(e.target.value);
    const updatedFormValues = formValues.map((record) => {
      if (record.isChecked) {
        return {
          ...record,
          emp_id: e.target.value,
        };
      }
      return record;
    });
    setFormValues(updatedFormValues);
  };

  // Handle parent checkbox change
  const handleParentCheckboxChange = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    const updatedFormValues = formValues.map((prod) => ({
      ...prod,
      isChecked: newSelectAll,
    }));
    setFormValues(updatedFormValues);
  };

  // Handle child checkbox change
  const handleChildCheckboxChange = (index) => {
    const updatedFormValues = [...formValues];
    updatedFormValues[index].isChecked = !updatedFormValues[index].isChecked;
    setFormValues(updatedFormValues);
    const allChecked = updatedFormValues.every((prod) => prod.isChecked);
    setSelectAll(allChecked);
  };

  // Handle product change
  const handleProductChange = (e, i) => {
    const re = /^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$/;
    if (e.target.value === "" || re.test(e.target.value)) {
      let newFormValues = [...formValues];
      newFormValues[i][e.target.name] = e.target.value;
      setFormValues(newFormValues);
    }
  };

  // Remove salesorder product
  const removeSalesorderProduct = (i) => {
    let newFormValues = [...formValues];
    newFormValues.splice(i, 1);
    if (newFormValues.length > 0) {
      setFormValues(newFormValues);
    } else {
      setFormValues([
        {
          sop_id: "",
          product_id: "",
          quantity: "",
          usedquantity: "",
          product_name: "",
          product_price: "",
          product_quotedprice: "",
          emp_id: "",
          isChecked: false,
          shipp_from: "",
        },
      ]);
    }
  };

  // Handle get stock list
  const handleGetStockList = async (prod, salesorder) => {
    try {
      const response = await OrderProcessingService.getStockList({
        token,
        companyId: salesorder?.company_id,
        branchId: salesorder?.branch_id,
        productId: prod?.product_id,
      });

      if (response?.STATUS == "SUCCESS") {
        setStockList(response.DATA || []);
        if (response.heading) {
          setProdAttrHeadings(response.heading);
        } else {
          setProdAttrHeadings([]);
        }
        if (response.att_data) {
          setProdAttrValue(response.att_data);
        } else {
          setProdAttrValue([]);
        }
      }
    } catch (error) {
      console.error("Error fetching stock list:", error);
      toast.error("Failed to fetch stock list. Please try again.");
    }
  };

  const toggleModal = () => {
    setIsStockListModalOpen(!isStockListModalOpen);
    setStockList([]);
    setProdAttrHeadings([]);
    setProdAttrValue([]);
    // setSelectedProd(null);
    setSearchBarcode("");
  };

  // Handle add circle click
  const handleAddCircleClick = (prod, salesorder) => {

    setSelectedProductForStock(prod);
    if (
      companyDetails?.PRODUCT_BARCODE_GENERATOR == "Y" &&
      prod?.enable_for_barcode == "Y"
    ) {
      toggleModal();
      // setIsStockListModalOpen(true);
      handleGetStockList(prod, salesorder);
    } else {
      setIsBranchStockDialogOpen(true);
      const foundFormValue = formValues.find(
        (formValue) => formValue.sop_id == prod.sop_id
      );
      setSelectedProductForStock({
        ...prod,
        branchwise_stock: foundFormValue ? foundFormValue.branchwise_stock : [],
      });
    }
  };

  // Handle stock list modal cancel
  const handleStockListCancel = () => {
    setIsStockListModalOpen(false);
    setStockList([]);
    setProdAttrHeadings([]);
    setProdAttrValue([]);
    setSelectedRows((prev) => {
      const newPrev = { ...prev };
      if (selectedProductForStock?.product_id)
        delete newPrev[selectedProductForStock.product_id];
      return newPrev;
    });
    setSearchBarcode("");
    setSelectedProductForStock(null);
  };

  // Handle save delivery challan
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate at least one item is selected
      const hasSelectedItems = formValues.some(
        (item) => item.isChecked == true
      );

      if (!hasSelectedItems) {
        toast.error(
          "Error: Please select at least one product to create delivery challan."
        );
        setIsSubmitting(false);
        return false;
      }

      const selectedItems = formValues.filter((item) => item.isChecked == true);

      // Validate branch availability
      const itemsWithMissingBranch = selectedItems.filter(
        (item) => item.shipp_from == 0 || item.shipp_from == ""
      );

      if (itemsWithMissingBranch.length > 0) {
        const productNames = itemsWithMissingBranch.map(
          (item) => item.product_name
        );
        toast.error(
          `Error: Branch is not available for: ${productNames.join(", ")}`
        );
        setIsSubmitting(false);
        return false;
      }

      // Validate quantity
      const itemsWithInvalidQuantity = selectedItems.filter((item) => {
        const quantityToCheck =
          companyDetails?.PRODUCT_BARCODE_GENERATOR == "Y" &&
            item?.enable_for_barcode == "Y"
            ? getTotalQuantityForProduct(item)
            : item.quantity;
        return (
          quantityToCheck == 0 ||
          quantityToCheck == "" ||
          quantityToCheck == null
        );
      });

      if (itemsWithInvalidQuantity.length > 0) {
        const productNames = itemsWithInvalidQuantity.map(
          (item) => item.product_name
        );
        toast.error(
          `Error: Quantity cannot be zero for: ${productNames.join(", ")}`
        );
        setIsSubmitting(false);
        return false;
      }

      // Validate quantity doesn't exceed available
      const elementsWithGreaterQuantity = selectedItems
        .map((it) => {
          const quantity =
            companyDetails?.PRODUCT_BARCODE_GENERATOR == "Y" &&
              it?.enable_for_barcode == "Y"
              ? parseFloat(getTotalQuantityForProduct(it)) || 0
              : parseFloat(it.quantity) || 0;
          const usedQuantity = parseFloat(it.usedquantity) || 0;
          let main_qty;
          if (it.conversion_flg == "2") {
            const secQtyTotal = parseFloat(it.SecQtyTotal) || 0;
            const secondaryBaseQty = parseFloat(it.secondary_base_qty) || 1;
            main_qty = secQtyTotal - usedQuantity * secondaryBaseQty;
          } else {
            const soQuantity = parseFloat(it.soquantity) || 0;
            main_qty = soQuantity - usedQuantity;
          }

          return {
            ...it,
            isInvalid: quantity > main_qty,
            formattedMainQty: main_qty,
          };
        })
        .filter((item) => item.isInvalid);

      if (elementsWithGreaterQuantity.length > 0) {
        const { formattedMainQty, product_name } =
          elementsWithGreaterQuantity[0];
        toast.error(
          `Error: Quantity for ${product_name} cannot exceed available quantity (${formattedMainQty})`
        );
        setIsSubmitting(false);
        return false;
      }

      // Validate emp_id for delivery type "D"
      if (formData.deliveryType == "D") {
        const itemsWithMissingEmpId = selectedItems.filter(
          (item) => !item.emp_id || item.emp_id == ""
        );

        if (itemsWithMissingEmpId.length > 0) {
          const productNames = itemsWithMissingEmpId.map(
            (item) => item.product_name
          );
          toast.error(
            `Assign Emp is not Selected for: ${productNames.join(", ")}`
          );
          setIsSubmitting(false);
          return false;
        }
      }

      // Prepare products data
      const productsData = selectedItems.map((item) => {
        const quantity =
          companyDetails?.PRODUCT_BARCODE_GENERATOR == "Y" &&
            item?.enable_for_barcode == "Y"
            ? getTotalQuantityForProduct(item)
            : item.quantity;

        // Transform branchwise_stock based on conditions
        let branchwiseStock = item.branchwise_stock;
        if (
          companyDetails?.PRODUCT_BARCODE_GENERATOR == "Y" &&
          item?.enable_for_barcode == "Y"
        ) {
          const matchingBranch = item.branchwise_stock.find(
            (branch) => branch.branch_id == item.shipp_from
          );
          const productRows = selectedRows[item.product_id] || [];
          if (matchingBranch) {
            branchwiseStock = productRows.map((row) => ({
              ...matchingBranch,
              product_stock_detail_id: row.product_stock_detail_id,
              qty: row.qty,
              free_qty: row.free_qty || "",
            }));
          }
        }

        return {
          ...item,
          quantity: quantity,
          branchwise_stock: branchwiseStock,
          branch_id: item.shipp_from,
        };
      });

      // Make API call
      const response = await OrderProcessingService.saveDeliveryChallanBySalesorder(
        {
          token,
          employeeId: user?.id,
          salesOrderId: orderData?.salesorder_id,
          deliveryType: formData.deliveryType,
          creditDays: formData.creditDays,
          shipThrough: formData.shipThrough,
          transporterId: formData.transporterId,
          vehicleNo: formData.vehicleNo,
          lrNo: formData.lrNo,
          lrDate: formData.lrDate,
          products: productsData,
          remarks: formData.remarks,
        }
      );

      const result = Array.isArray(response) ? response[0] : response;

      if (result?.STATUS == "SUCCESS") {
        const dc_fullno = result?.DATA?.dc_fullno?.replace(/,$/, "") || "";
        toast.success(`Delivery challan ${dc_fullno} saved successfully`, {
          duration: 5000,
        });
        if (buttonCancelRef.current) buttonCancelRef.current.click();

        onOpenChange(false);
        
        // Redirect to delivery challans planning page
        router.push("/deliverychallans/planning");
      } else {
        toast.error(result?.MSG || "Failed to save delivery challan");
      }
    } catch (error) {
      console.error("Error saving delivery challan:", error);
      toast.error("Error: Something went wrong while saving");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle branch stock save
  const handleBranchStockSave = (updatedProduct) => {
    if (selectedProductForStock) {
      setFormValues((prev) =>
        prev.map((prod) =>
          prod.sop_id == selectedProductForStock.sop_id
            ? {
              ...prod,
              quantity: updatedProduct.quantity,
              branchwise_stock: updatedProduct.branchwise_stock,
            }
            : prod
        )
      );
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1400px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
        <DialogHeader className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-3 sm:py-4 border-b text-left">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-800">
            Process Salesorder
            {salesOrderDetails?.fullsalesorderno &&
              ` (${salesOrderDetails.fullsalesorderno})`}
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4" />
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
            </div>
          ) : (
            <>
              {/* Customer Card and Header Card Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
                {/* Customer Card - Left Side (like old CustomerCard) */}
                <div className="md:col-span-4 lg:col-span-3">
                  <div className="bg-white border rounded-lg p-3 sm:p-4 h-full">
                    <h6 className="text-sm sm:text-base font-semibold text-gray-800 mb-2">
                      {salesOrderDetails?.contact_name || orderData?.contact_name || "N/A"}
                    </h6>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">
                      {salesOrderDetails?.contact_email || orderData?.contact_email || ""}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3">
                      {salesOrderDetails?.contact_mobile || salesOrderDetails?.contact_phone || orderData?.contact_mobile || orderData?.contact_phone || ""}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          <strong>Bill To Address</strong>
                        </p>
                        <div
                          className="text-xs text-gray-600 break-words"
                          dangerouslySetInnerHTML={{
                            __html: salesOrderDetails?.billto_address || orderData?.billto_address || ""
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          <strong>Ship To Address</strong>
                        </p>
                        <div
                          className="text-xs text-gray-600 break-words"
                          dangerouslySetInnerHTML={{
                            __html: salesOrderDetails?.shippto_address || salesOrderDetails?.billto_address || orderData?.shippto_address || orderData?.billto_address || ""
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Header Card - Right Side (like old HeaderCard) */}
                <div className="md:col-span-8 lg:col-span-9">
                  <div className="bg-gray-50 border rounded-lg p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          <strong>Order No:</strong>
                        </p>
                        <p className="text-xs text-gray-600 break-words">
                          {salesOrderDetails?.fullsalesorderno || orderData?.fullsalesorderno || "N/A"}
                          {salesOrderDetails?.salesorder_dt && ` (${salesOrderDetails.salesorder_dt})`}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          <strong>Company:</strong>
                        </p>
                        <p className="text-xs text-gray-600 break-words">
                          {salesOrderDetails?.company_name || orderData?.company_name || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
                          <strong>Branch:</strong>
                        </p>
                        <p className="text-xs text-gray-600 break-words">
                          {salesOrderDetails?.branch_name || orderData?.branch_name || "N/A"}
                        </p>
                      </div>

                      {companyDetails?.is_company_division_enabled == 1 && (
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            <strong>Division:</strong>
                          </p>
                          <p className="text-xs text-gray-600 break-words">
                            {salesOrderDetails?.division_name || orderData?.division_name || "N/A"}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          <strong>Delivery Type:</strong>
                        </p>
                        <RadioGroup
                          value={formData.deliveryType}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, deliveryType: value }))
                          }
                          className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4"
                        >
                          {formData.deliveryType === "P" && (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="P" id="pickup" className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71] disabled:opacity-50 disabled:cursor-not-allowed" />
                              <Label htmlFor="pickup" className="text-xs sm:text-sm cursor-pointer">Pickup at store</Label>
                            </div>
                          )}
                          {formData.deliveryType === "D" && (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="D" id="delivery" className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71] disabled:opacity-50 disabled:cursor-not-allowed" />
                              <Label htmlFor="delivery" className="text-xs sm:text-sm cursor-pointer">Delivery</Label>
                            </div>
                          )}
                        </RadioGroup>
                      </div>

                      <div>
                        <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                          <strong>Credit Days:</strong>
                        </Label>
                        <Input
                          type="text"
                          value={formData.creditDays}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, creditDays: e.target.value }))
                          }
                          placeholder="Days"
                          className="w-full h-8 text-xs sm:text-sm"
                        />
                      </div>

                      {formData.deliveryType == "D" && (
                        <div>
                          <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                            <strong>Assign Emp:</strong>
                          </Label>
                          <Select
                            value={selectedDefaultEmpId}
                            onValueChange={(value) => {
                              setSelectedDefaultEmpId(value);
                              const updatedFormValues = formValues.map((record) => {
                                if (record.isChecked) {
                                  return {
                                    ...record,
                                    emp_id: value,
                                  };
                                }
                                return record;
                              });
                              setFormValues(updatedFormValues);
                            }}
                          >
                            <SelectTrigger className="w-full h-8 text-xs sm:text-sm">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.employee_id} value={emp.employee_id}>
                                  {emp.employee_name || emp.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b">
                  <h3 className="text-sm sm:text-base font-medium text-gray-800">Products</h3>
                </div>

                <div className="overflow-x-auto">
                  <Table className="min-w-[300px] sm:min-w-[600px]">
                    <TableHeader>
                      <TableRow className="bg-[#4a5a6b] hover:bg-[#4a5a6b] text-white">
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center w-[50px]">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={handleParentCheckboxChange}
                            className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
                          />
                        </TableHead>
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                          Product Name
                        </TableHead>
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                          Order Qty / Used Qty
                        </TableHead>
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                          <span className="text-red-400">*</span>Qty
                        </TableHead>
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                          Rate
                        </TableHead>
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                          Total
                        </TableHead>
                        {formData.deliveryType == "D" && (
                          <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                            Assign Emp
                          </TableHead>
                        )}
                        {formValues.length > 1 && (
                          <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                            Action
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formValues.map((prod, i) => {
                        const displayQty =
                          companyDetails?.PRODUCT_BARCODE_GENERATOR == "Y" &&
                            prod?.enable_for_barcode == "Y"
                            ? getTotalQuantityForProduct(prod)
                            : prod.quantity;

                        const orderQtyDisplay =
                          prod.conversion_flg == "2"
                            ? `${Number.isInteger(parseFloat(prod.SecQtyTotal))
                              ? parseFloat(prod.SecQtyTotal)
                              : parseFloat(prod.SecQtyTotal).toFixed(2)
                            } (${prod.secondary_unit_name}) / ${Number.isInteger(
                              parseFloat(prod.usedquantity) *
                              parseFloat(prod.secondary_base_qty)
                            )
                              ? parseFloat(prod.usedquantity) *
                              parseFloat(prod.secondary_base_qty)
                              : (
                                parseFloat(prod.usedquantity) *
                                parseFloat(prod.secondary_base_qty)
                              ).toFixed(2)
                            } (${prod.secondary_unit_name})`
                            : `${Number.isInteger(parseFloat(prod.soquantity))
                              ? parseFloat(prod.soquantity)
                              : parseFloat(prod.soquantity).toFixed(2)
                            } (${prod.primary_unit_name || prod.unit_name}) / ${Number.isInteger(
                              parseFloat(prod.usedquantity)
                            )
                              ? parseFloat(prod.usedquantity)
                              : parseFloat(prod.usedquantity).toFixed(2)
                            } (${prod.primary_unit_name || prod.unit_name})`;

                        const totalAmount =
                          prod.conversion_flg == 2
                            ? (
                              ((companyDetails?.PRODUCT_BARCODE_GENERATOR == "Y" &&
                                prod?.enable_for_barcode == "Y"
                                ? getTotalQuantityForProduct(prod)
                                : prod.quantity) /
                                prod.secondary_base_qty) *
                              prod.product_quotedprice
                            ).toFixed(2)
                            : (
                              (companyDetails?.PRODUCT_BARCODE_GENERATOR == "Y" &&
                                prod?.enable_for_barcode == "Y"
                                ? getTotalQuantityForProduct(prod)
                                : prod.quantity) *
                              prod.product_quotedprice
                            ).toFixed(2);

                        return (
                          <TableRow key={i} className="border-b">
                            <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                              <Checkbox
                                checked={prod.isChecked}
                                onCheckedChange={() => handleChildCheckboxChange(i)}
                                className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
                              />
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                              <div className="flex items-center justify-center gap-1">
                                {prod.attributes && (
                                  <Info
                                    className="h-3.5 w-3.5 sm:h-4 sm:w-4 cursor-pointer text-blue-500 flex-shrink-0"
                                    onClick={() => {
                                      setSelectedProductForAttr(prod);
                                      setSelectedProductIndex(i);
                                      setIsAttrModalOpen(true);
                                    }}
                                  />
                                )}
                                <span className="break-words">{prod.product_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                              {orderQtyDisplay}
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <Input
                                  type="text"
                                  value={displayQty}
                                  onChange={(e) => handleProductChange(e, i)}
                                  className="w-12 sm:w-16 h-7 sm:h-8 text-center text-xs"
                                  readOnly
                                  disabled={true}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleAddCircleClick(prod, salesOrderDetails)
                                  }
                                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 bg-green-50 hover:bg-green-100 border-green-300"
                                  title="Add branch wise stock"
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                              {prod.product_quotedprice}
                            </TableCell>
                            <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                              {totalAmount}
                            </TableCell>
                            {formData.deliveryType == "D" && (
                              <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                                <Select
                                  value={prod.emp_id || ""}
                                  onValueChange={(value) => {
                                    const updatedFormValues = [...formValues];
                                    updatedFormValues[i].emp_id = value;
                                    setFormValues(updatedFormValues);
                                  }}
                                >
                                  <SelectTrigger className="w-24 sm:w-32 h-7 sm:h-8 text-xs">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {employees.map((emp) => (
                                      <SelectItem
                                        key={emp.employee_id}
                                        value={emp.employee_id}
                                      >
                                        {emp.employee_name || emp.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            )}
                            {formValues.length > 1 && (
                              <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeSalesorderProduct(i)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <Label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">Remarks</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                  }
                  placeholder="Enter remarks..."
                  className="w-full min-h-[60px] sm:min-h-[80px] resize-none text-xs sm:text-sm"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
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
                  {isSubmitting ? "Creating..." : "Create DC"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>

      {/* Branch Stock Dialog */}
      <BranchStockDialog
        open={isBranchStockDialogOpen}
        onOpenChange={setIsBranchStockDialogOpen}
        product={selectedProductForStock}
        salesOrder={salesOrderDetails}
        onSave={handleBranchStockSave}
      />

      {/* Stock List Dialog for Barcode Products */}
      <StockListDialog
        isOpen={isStockListModalOpen}
        toggle={toggleModal}
        stockList={stockList}
        prodAttrHeadings={prodAttrHeadings}
        prodAttrValue={prodAttrValue}
        selectedProd={selectedProductForStock}
        selectedRows={selectedRows}
        setSelectedRows={memoizedSetSelectedRows}
        searchBarcode={searchBarcode}
        onSearchBarcodeChange={onSearchBarcodeChange}
        onCancel={handleStockListCancel}
      />

      {/* Attributes Modal */}
      {isAttrModalOpen && selectedProductForAttr && (
        <Dialog open={isAttrModalOpen} onOpenChange={setIsAttrModalOpen}>
          <DialogContent className="w-[90vw] max-w-[425px] md:max-w-[600px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold">Attribute Details</DialogTitle>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto">
              {selectedProductForAttr?.attributes && selectedProductForAttr.attributes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[300px]">
                    <TableHeader>
                      <TableRow className="bg-[#4a5a6b] hover:bg-[#4a5a6b] text-white">
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2">Attribute</TableHead>
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProductForAttr.attributes.map((attr, index) => (
                        <TableRow key={index} className="border-b">
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                            {attr.name || attr.Name || `Attribute ${index + 1}`}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm">
                            {attr.value || attr.Value || attr.data || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-4 text-xs sm:text-sm text-gray-500">No attributes available for this product.</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setIsAttrModalOpen(false)}
                className="w-full sm:w-auto px-4 sm:px-6 text-xs sm:text-sm"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default CreateDCDialog;
