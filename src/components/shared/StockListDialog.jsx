"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info, X } from "lucide-react";
import { toast } from "sonner";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { format, fromUnixTime } from "date-fns";
import { HashLoader } from "react-spinners";

const StockListDialog = ({
  isOpen,
  toggle,
  stockList = [],
  prodAttrHeadings = [],
  prodAttrValue = [],
  selectedProd,
  selectedRows = {},
  setSelectedRows,
  searchBarcode = "",
  onSearchBarcodeChange,
  onCancel,
}) => {
  const { companyDetails } = useSharedDataStore();
  const [attrModalOpen, setAttrModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset all data when dialog closes (handles ESC key, click outside, close button, etc.)
  useEffect(() => {
    if (!isOpen) {
      // Clear search barcode
      // if (onSearchBarcodeChange) {
      //   onSearchBarcodeChange("");
      // }
      // // Clear selected rows for this product
      // if (selectedProd?.product_id && setSelectedRows) {
      //   setSelectedRows((prev) => {
      //     const newPrev = { ...prev };
      //     delete newPrev[selectedProd.product_id];
      //     return newPrev;
      //   });
      // }
      // // Reset local state
      // setAttrModalOpen(false);
      // setSelectedItemId(null);
      setIsLoading(false);

    }
  }, [isOpen, selectedProd?.product_id, onSearchBarcodeChange, setSelectedRows]);

  // Show loading when stockList is empty and dialog is open
  useEffect(() => {
    if (isOpen && (!stockList || stockList.length === 0)) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [isOpen, stockList]);

  const toggleAttrModal = (id) => {
    setSelectedItemId(id);
    setAttrModalOpen(!attrModalOpen);
  };

  // Handle dialog close - useEffect will handle data clearing when isOpen changes
  const handleDialogClose = (open) => {
    // Call toggle to update parent state
    // The useEffect hook will automatically clear data when isOpen becomes false
    if (typeof toggle === 'function') {
      toggle();
    }
  };

  const main_qty =
    selectedProd?.conversion_flg == "2"
      ? parseFloat(selectedProd?.SecQtyTotal || 0) -
      parseFloat(selectedProd?.usedquantity || 0) *
      parseFloat(selectedProd?.secondary_base_qty || 0)
      : parseFloat(selectedProd?.soquantity || 0) -
      parseFloat(selectedProd?.usedquantity || 0);

  const getTotalOrderQuantity = () => {
    const productRows = selectedRows[selectedProd?.product_id] || [];
    return productRows.reduce((sum, row) => {
      return sum + (parseFloat(row.qty) || 0);
    }, 0);
  };

  const getTotalFreeQuantity = () => {
    const productRows = selectedRows[selectedProd?.product_id] || [];
    return productRows.reduce((sum, row) => {
      return sum + (parseFloat(row.free_qty) || 0);
    }, 0);
  };

  // Handle select all rows
  const handleSelectAll = () => {
    const currentProductRows = selectedRows[selectedProd?.product_id] || [];
    if (currentProductRows.length == (stockList?.length || 0)) {
      setSelectedRows((prev) => ({
        ...prev,
        [selectedProd.product_id]: [],
      }));
    } else {
      const totalFreeQty = getTotalFreeQuantity();
      let remainingQty = (main_qty || 0) - totalFreeQty;
      const newProductRows =
        stockList
          ?.map((item) => {
            const id = item?.Product_stock_detail?.product_stock_detail_id;
            const availableQty = item?.available_first_quantity_total
              ? item.available_first_quantity_total.toString().replace(/,/g, "")
              : "0";
            const availableSecQty = item?.Product_stock_detail?.available_Sec_Qty
              ? item.Product_stock_detail.available_Sec_Qty
                .toString()
                .replace(/,/g, "")
              : "0";
            const maxAllowedQty =
              selectedProd?.conversion_flg == "2"
                ? Math.min(main_qty || 0, parseFloat(availableSecQty || 0))
                : Math.min(main_qty || 0, parseFloat(availableQty || 0));
            const existingRow = currentProductRows.find(
              (row) => row.product_stock_detail_id == id
            );
            const currentFreeQty = parseFloat(existingRow?.free_qty) || 0;
            const availableQtyForOrder = maxAllowedQty - currentFreeQty;

            // Check if item is disabled
            const serverTimeFormatted = companyDetails?.server_time
              ? format(fromUnixTime(companyDetails.server_time), "dd-MM-yyyy")
              : "";
            const endDateFormatted = item?.Product_stock_detail?.exparams_enddate
              ? format(
                fromUnixTime(item.Product_stock_detail.exparams_enddate),
                "dd-MM-yyyy"
              )
              : "";
            const isDisabled = serverTimeFormatted == endDateFormatted;

            if (isDisabled) {
              return null;
            }

            let qtyToSet = Math.min(availableQtyForOrder, remainingQty);
            let qtyString = "";
            if (qtyToSet > 0) {
              qtyString = Math.floor(qtyToSet).toString();
              remainingQty -= parseFloat(qtyString) || 0;
            }

            return {
              product_stock_detail_id: id,
              qty: qtyString,
              free_qty: currentFreeQty > 0 ? currentFreeQty.toString() : "",
            };
          })
          .filter((row) => row !== null) || [];

      setSelectedRows((prev) => ({
        ...prev,
        [selectedProd.product_id]: newProductRows,
      }));
    }
  };

  // Handle row select
  const handleRowSelect = (id, availableQty, availableSecQty) => {
    const item = stockList.find(
      (item) => item?.Product_stock_detail?.product_stock_detail_id == id
    );
    const serverTimeFormatted = companyDetails?.server_time
      ? format(fromUnixTime(companyDetails.server_time), "dd-MM-yyyy")
      : "";
    const endDateFormatted = item?.Product_stock_detail?.exparams_enddate
      ? format(
        fromUnixTime(item.Product_stock_detail.exparams_enddate),
        "dd-MM-yyyy"
      )
      : "";
    const isDisabled = serverTimeFormatted == endDateFormatted;

    if (isDisabled) {
      return;
    }

    setSelectedRows((prev) => {
      const currentProductRows = prev[selectedProd?.product_id] || [];
      if (currentProductRows.some((row) => row.product_stock_detail_id == id)) {
        const newProductRows = currentProductRows.filter(
          (row) => row.product_stock_detail_id != id
        );
        return { ...prev, [selectedProd.product_id]: newProductRows };
      } else {
        const cleanAvailableQty = availableQty
          ? availableQty.toString().replace(/,/g, "")
          : "0";
        const cleanAvailableSecQty = availableSecQty
          ? availableSecQty.toString().replace(/,/g, "")
          : "0";
        const totalOrderQty = getTotalOrderQuantity();
        const totalFreeQty = getTotalFreeQuantity();
        const maxAllowedQty =
          selectedProd?.conversion_flg == "2"
            ? Math.min(main_qty || 0, parseFloat(cleanAvailableSecQty || 0))
            : Math.min(main_qty || 0, parseFloat(cleanAvailableQty || 0));
        const remainingQty = (main_qty || 0) - totalOrderQty - totalFreeQty;
        const existingRow = currentProductRows.find(
          (row) => row.product_stock_detail_id == id
        );
        const currentFreeQty = parseFloat(existingRow?.free_qty) || 0;
        const availableQtyForOrder = maxAllowedQty - currentFreeQty;
        let qtyToSet = Math.min(availableQtyForOrder, remainingQty);
        let qtyString = "";
        if (qtyToSet > 0) {
          qtyString = Math.floor(qtyToSet).toString();
        }

        const newProductRows = [
          ...currentProductRows,
          {
            product_stock_detail_id: id,
            qty: qtyString,
            free_qty: currentFreeQty > 0 ? currentFreeQty.toString() : "",
          },
        ];
        return { ...prev, [selectedProd.product_id]: newProductRows };
      }
    });
  };

  // Handle search key press
  const handleSearchKeyPress = (e) => {
    if (e.key == "Enter" && searchBarcode.trim() != "") {
      const matchingItem = stockList?.find(
        (item) => item?.Product_stock_detail?.barcode == searchBarcode.trim()
      );
      if (matchingItem) {
        const id = matchingItem?.Product_stock_detail?.product_stock_detail_id;
        const availableQty = matchingItem?.available_first_quantity_total
          ? matchingItem.available_first_quantity_total.toString().replace(/,/g, "")
          : "0";
        const availableSecQty = matchingItem?.Product_stock_detail?.available_Sec_Qty
          ? matchingItem.Product_stock_detail.available_Sec_Qty
            .toString()
            .replace(/,/g, "")
          : "0";
        const serverTimeFormatted = companyDetails?.server_time
          ? format(fromUnixTime(companyDetails.server_time), "dd-MM-yyyy")
          : "";
        const endDateFormatted = matchingItem?.Product_stock_detail?.exparams_enddate
          ? format(
            fromUnixTime(matchingItem.Product_stock_detail.exparams_enddate),
            "dd-MM-yyyy"
          )
          : "";
        const isDisabled = serverTimeFormatted == endDateFormatted;

        if (
          !isDisabled &&
          !(selectedRows[selectedProd?.product_id] || []).some(
            (row) => row.product_stock_detail_id == id
          )
        ) {
          handleRowSelect(id, availableQty, availableSecQty);
        }
      }
      onSearchBarcodeChange("");
    }
  };

  // Handle quantity change
  const handleQuantityChange = (id, value, availableQty, availableSecQty) => {
    const cleanValue = value.replace(/,/g, "");
    const item = stockList.find(
      (item) => item?.Product_stock_detail?.product_stock_detail_id == id
    );
    const serverTimeFormatted = companyDetails?.server_time
      ? format(fromUnixTime(companyDetails.server_time), "dd-MM-yyyy")
      : "";
    const endDateFormatted = item?.Product_stock_detail?.exparams_enddate
      ? format(
        fromUnixTime(item.Product_stock_detail.exparams_enddate),
        "dd-MM-yyyy"
      )
      : "";
    const isDisabled = serverTimeFormatted == endDateFormatted;

    if (isDisabled) {
      return;
    }

    const cleanAvailableQty = availableQty
      ? availableQty.toString().replace(/,/g, "")
      : "0";
    const cleanAvailableSecQty = availableSecQty
      ? availableSecQty.toString().replace(/,/g, "")
      : "0";

    if (cleanValue === "" || /^\d*$/.test(cleanValue)) {
      const maxAllowedQty =
        selectedProd?.conversion_flg == "2"
          ? Math.min(main_qty || 0, parseFloat(cleanAvailableSecQty || 0))
          : Math.min(main_qty || 0, parseFloat(cleanAvailableQty || 0));
      const parsedValue = parseFloat(cleanValue) || 0;
      const currentProductRows = selectedRows[selectedProd?.product_id] || [];
      const otherQuantitiesSum = currentProductRows
        .filter((row) => row.product_stock_detail_id != id)
        .reduce((sum, row) => sum + (parseFloat(row.qty) || 0), 0);
      const totalFreeQty = getTotalFreeQuantity();
      const currentFreeQty =
        parseFloat(
          currentProductRows.find((row) => row.product_stock_detail_id == id)
            ?.free_qty
        ) || 0;
      const primaryUnit = selectedProd?.unit_name || "";
      const secondaryUnit = selectedProd?.secondary_unit || "";
      const displayUnit =
        selectedProd?.conversion_flg == "2" ? secondaryUnit : primaryUnit;
      const limitingFactor =
        selectedProd?.conversion_flg == "2"
          ? (main_qty || 0) <= parseFloat(cleanAvailableSecQty || 0)
            ? `available order quantity (Order Qty - Used Qty = ${main_qty} ${displayUnit})`
            : `Available Secondary Quantity (${parseFloat(
              cleanAvailableSecQty || 0
            )} ${displayUnit})`
          : (main_qty || 0) <= parseFloat(cleanAvailableQty || 0)
            ? `available order quantity (Order Qty - Used Qty = ${main_qty} ${displayUnit})`
            : `Available Quantity (${parseFloat(
              cleanAvailableQty || 0
            )} ${displayUnit})`;

      if (parsedValue + currentFreeQty > maxAllowedQty && cleanValue !== "") {
        toast.error(
          `Entered Qty (${parsedValue} ${displayUnit}) plus Free Qty (${currentFreeQty} ${displayUnit}) exceeds ${limitingFactor}.`
        );
        setSelectedRows((prev) => {
          const currentProductRows = prev[selectedProd?.product_id] || [];
          const newProductRows = currentProductRows.map((row) =>
            row.product_stock_detail_id == id ? { ...row, qty: "" } : row
          );
          return { ...prev, [selectedProd.product_id]: newProductRows };
        });
        return;
      }

      if (
        otherQuantitiesSum + parsedValue + totalFreeQty > (main_qty || 0) &&
        cleanValue !== ""
      ) {
        toast.error(
          `Entered Qty (${parsedValue} ${displayUnit}) causes total (Qty + Free Qty) to exceed available order quantity (Order Qty - Used Qty = ${main_qty} ${displayUnit}).`
        );
        setSelectedRows((prev) => {
          const currentProductRows = prev[selectedProd?.product_id] || [];
          const newProductRows = currentProductRows.map((row) =>
            row.product_stock_detail_id == id ? { ...row, qty: "" } : row
          );
          return { ...prev, [selectedProd.product_id]: newProductRows };
        });
        return;
      }

      setSelectedRows((prev) => {
        const currentProductRows = prev[selectedProd?.product_id] || [];
        const newProductRows = currentProductRows.map((row) =>
          row.product_stock_detail_id == id ? { ...row, qty: value } : row
        );
        return { ...prev, [selectedProd.product_id]: newProductRows };
      });
    }
  };

  // Handle free quantity change
  const handleFreeQuantityChange = (id, value, availableQty, availableSecQty) => {
    const cleanValue = value.replace(/,/g, "");
    const cleanAvailableQty = availableQty
      ? availableQty.toString().replace(/,/g, "")
      : "0";
    const cleanAvailableSecQty = availableSecQty
      ? availableSecQty.toString().replace(/,/g, "")
      : "0";
    const item = stockList.find(
      (item) => item?.Product_stock_detail?.product_stock_detail_id == id
    );
    const serverTimeFormatted = companyDetails?.server_time
      ? format(fromUnixTime(companyDetails.server_time), "dd-MM-yyyy")
      : "";
    const endDateFormatted = item?.Product_stock_detail?.exparams_enddate
      ? format(
        fromUnixTime(item.Product_stock_detail.exparams_enddate),
        "dd-MM-yyyy"
      )
      : "";
    const isDisabled = serverTimeFormatted == endDateFormatted;

    if (isDisabled) {
      return;
    }

    if (cleanValue === "" || /^\d*$/.test(cleanValue)) {
      const maxAllowedQty =
        selectedProd?.conversion_flg == "2"
          ? Math.min(main_qty || 0, parseFloat(cleanAvailableSecQty || 0))
          : Math.min(main_qty || 0, parseFloat(cleanAvailableQty || 0));
      const parsedValue = parseFloat(cleanValue) || 0;
      const totalOrderQty = getTotalOrderQuantity();
      const currentProductRows = selectedRows[selectedProd?.product_id] || [];
      const otherFreeQuantitiesSum = currentProductRows
        .filter((row) => row.product_stock_detail_id != id)
        .reduce((sum, row) => sum + (parseFloat(row.free_qty) || 0), 0);
      const currentOrderQty =
        parseFloat(
          currentProductRows.find((row) => row.product_stock_detail_id == id)
            ?.qty
        ) || 0;
      const primaryUnit = selectedProd?.unit_name || "";
      const secondaryUnit = selectedProd?.secondary_unit || "";
      const displayUnit =
        selectedProd?.conversion_flg == "2" ? secondaryUnit : primaryUnit;
      const limitingFactor =
        selectedProd?.conversion_flg == "2"
          ? (main_qty || 0) <= parseFloat(cleanAvailableSecQty || 0)
            ? `available order quantity (Order Qty - Used Qty = ${main_qty} ${displayUnit})`
            : `Available Secondary Quantity (${parseFloat(
              cleanAvailableSecQty || 0
            )} ${displayUnit})`
          : (main_qty || 0) <= parseFloat(cleanAvailableQty || 0)
            ? `available order quantity (Order Qty - Used Qty = ${main_qty} ${displayUnit})`
            : `Available Quantity (${parseFloat(
              cleanAvailableQty || 0
            )} ${displayUnit})`;

      if (parsedValue + currentOrderQty > maxAllowedQty && cleanValue !== "") {
        toast.error(
          `Entered Free Qty (${parsedValue} ${displayUnit}) plus Qty (${currentOrderQty} ${displayUnit}) exceeds ${limitingFactor}.`
        );
        setSelectedRows((prev) => {
          const currentProductRows = prev[selectedProd?.product_id] || [];
          const newProductRows = currentProductRows.map((row) =>
            row.product_stock_detail_id == id ? { ...row, free_qty: "" } : row
          );
          return { ...prev, [selectedProd.product_id]: newProductRows };
        });
        return;
      }

      if (
        otherFreeQuantitiesSum + parsedValue + totalOrderQty >
        (main_qty || 0) &&
        cleanValue !== ""
      ) {
        toast.error(
          `Entered Free Qty (${parsedValue} ${displayUnit}) causes total (Qty + Free Qty) to exceed available order quantity (Order Qty - Used Qty = ${main_qty} ${displayUnit}).`
        );
        setSelectedRows((prev) => {
          const currentProductRows = prev[selectedProd?.product_id] || [];
          const newProductRows = currentProductRows.map((row) =>
            row.product_stock_detail_id == id ? { ...row, free_qty: "" } : row
          );
          return { ...prev, [selectedProd.product_id]: newProductRows };
        });
        return;
      }

      setSelectedRows((prev) => {
        const currentProductRows = prev[selectedProd?.product_id] || [];
        const newProductRows = currentProductRows.map((row) =>
          row.product_stock_detail_id == id ? { ...row, free_qty: value } : row
        );
        return { ...prev, [selectedProd.product_id]: newProductRows };
      });
    }
  };

  // Handle key press - only allow digits
  const handleKeyPress = (e) => {
    const char = e.key;
    if (!/[0-9]/.test(char)) {
      e.preventDefault();
    }
  };

  // Get row style for disabled items
  const getRowStyle = (item) => {
    const serverTimeFormatted = companyDetails?.server_time
      ? format(fromUnixTime(companyDetails.server_time), "dd-MM-yyyy")
      : "";
    const endDateFormatted = item?.Product_stock_detail?.exparams_enddate
      ? format(
        fromUnixTime(item.Product_stock_detail.exparams_enddate),
        "dd-MM-yyyy"
      )
      : "";
    const isDisabled = serverTimeFormatted == endDateFormatted;
    return isDisabled ? { backgroundColor: "#e9ecef" } : {};
  };

  // Get input style for disabled items
  const getInputStyle = (item) => {
    const serverTimeFormatted = companyDetails?.server_time
      ? format(fromUnixTime(companyDetails.server_time), "dd-MM-yyyy")
      : "";
    const endDateFormatted = item?.Product_stock_detail?.exparams_enddate
      ? format(
        fromUnixTime(item.Product_stock_detail.exparams_enddate),
        "dd-MM-yyyy"
      )
      : "";
    const isDisabled = serverTimeFormatted == endDateFormatted;
    return isDisabled ? { cursor: "not-allowed" } : {};
  };

  // Get unit name
  const getUnitName = () => {
    if (selectedProd?.conversion_flg == "2") {
      return selectedProd?.secondary_unit_name || "";
    } else if (selectedProd?.conversion_flg == "1") {
      return selectedProd?.primary_unit_name || "";
    } else {
      return selectedProd?.unit_name || "";
    }
  };

  // Get attributes
  const getAttributes = (id) => {
    const itemAttributes = prodAttrValue.find((item) => item[id])?.[id] || [];
    return prodAttrHeadings
      .map((heading) => {
        const attr = itemAttributes.find((attr) => attr.ID == heading.ID);
        return {
          name: heading.name,
          value: attr?.data || "-",
        };
      })
      .filter((attr) => attr.value && attr.value != "");
  };

  // Check if all items are consumable
  const safeStockList = Array.isArray(stockList) ? stockList : [];
  const allConsumable = safeStockList.every(
    (item) => item?.Product?.isconsumable === "Y"
  );
  const hasTimelineEnabled = safeStockList.every(
    (item) => item?.Product?.enable_for_timeline === "1"
  );
  const hasExtraParamsEnabled = safeStockList.every(
    (item) => item?.Product?.enable_extra_params === "1"
  );

  // Get status name
  const getStatusName = (statusId) => {
    const status = companyDetails?.STOCKDETAIL_STATUS_MASTER?.find(
      (status) => status.ID == statusId
    );
    return status?.Name || "-";
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return format(fromUnixTime(timestamp), "dd-MM-yyyy");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1400px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white rounded-lg">
          <DialogHeader className="px-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-3 sm:gap-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                Product Stock ({selectedProd?.product_name || ""})
              </DialogTitle>
              <Input
                type="text"
                value={searchBarcode}
                onChange={(e) => onSearchBarcodeChange(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="Enter Barcode"
                className="w-full sm:w-[200px] text-xs sm:text-sm h-8"
              />
            </div>
            <DialogClose className="absolute right-4 top-4" />
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh]">
              <Table className="min-w-[300px] sm:min-w-[600px]">
                <TableHeader className="sticky top-0 bg-[#4a5a6b] z-10">
                  <TableRow className="bg-[#4a5a6b] hover:bg-[#4a5a6b] text-white">
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center w-[50px]">
                      <Checkbox
                        checked={
                          (selectedRows[selectedProd?.product_id] || []).length ==
                          (stockList?.length || 0)
                        }
                        onCheckedChange={handleSelectAll}
                        className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
                      />
                    </TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Attributes</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Department</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Barcode</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Serial No</TableHead>
                    {allConsumable &&
                      hasTimelineEnabled &&
                      companyDetails?.ENABLE_STOCKDETAIL_STATUS_LABEL == "Y" && (
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                          {companyDetails?.STOCKDETAIL_STATUS_LABEL}
                        </TableHead>
                      )}
                    {allConsumable &&
                      hasTimelineEnabled &&
                      companyDetails?.ENABLE_STOCKDETAIL_MFR_DATE_LABEL == "Y" && (
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                          {companyDetails?.STOCKDETAIL_MFR_DATE_LABEL}
                        </TableHead>
                      )}
                    {allConsumable &&
                      hasTimelineEnabled &&
                      companyDetails?.ENABLE_STOCKDETAIL_EXPIRY_DATE_LABEL ==
                      "Y" && (
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                          {companyDetails?.STOCKDETAIL_EXPIRY_DATE_LABEL}
                        </TableHead>
                      )}
                    {allConsumable &&
                      hasExtraParamsEnabled &&
                      companyDetails?.ENABLE_STOCKDETAIL_CURRENT_OR_PAST_READING_LABEL ==
                      "Y" && (
                        <>
                          <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                            {companyDetails?.STOCKDETAIL_CURRENT_READING_LABEL}
                          </TableHead>
                          <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">
                            {companyDetails?.STOCKDETAIL_PAST_READING_LABEL}
                          </TableHead>
                        </>
                      )}
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Transaction No</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Transaction Date</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Stock Rate</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">MRP Rate</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Sales Rate</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Qty</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Used Qty</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Available Qty</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Qty ({getUnitName()})</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Free Qty ({getUnitName()})</TableHead>
                    {allConsumable &&
                      companyDetails?.ENABLED_TO_ALLOW_BIN_STORE_MANAGEMENT ==
                      "Y" && (
                        <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">{companyDetails?.BIN_LABEL} Name</TableHead>
                      )}
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Contact</TableHead>
                    <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2 text-center">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(stockList) && stockList.length > 0 ? (
                    stockList.map((item) => {
                      const id =
                        item?.Product_stock_detail?.product_stock_detail_id;
                      const currentProductRows =
                        selectedRows[selectedProd?.product_id] || [];
                      const rowData = currentProductRows.find(
                        (row) => row.product_stock_detail_id == id
                      ) || {
                        qty: "",
                        free_qty: "",
                      };
                      const serverTimeFormatted = companyDetails?.server_time
                        ? format(fromUnixTime(companyDetails.server_time), "dd-MM-yyyy")
                        : "";
                      const endDateFormatted = item?.Product_stock_detail
                        ?.exparams_enddate
                        ? format(
                          fromUnixTime(item.Product_stock_detail.exparams_enddate),
                          "dd-MM-yyyy"
                        )
                        : "";
                      const isDisabled = serverTimeFormatted == endDateFormatted;

                      return (
                        <TableRow key={id} className="border-b" style={getRowStyle(item)}>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            <Checkbox
                              checked={currentProductRows.some(
                                (row) => row.product_stock_detail_id == id
                              )}
                              onCheckedChange={() =>
                                handleRowSelect(
                                  id,
                                  item?.available_first_quantity_total,
                                  item?.Product_stock_detail?.available_Sec_Qty
                                )
                              }
                              disabled={isDisabled}
                              className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
                              style={getInputStyle(item)}
                            />
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            <Info
                              className="h-3.5 w-3.5 sm:h-4 sm:w-4 cursor-pointer text-blue-600 flex-shrink-0 mx-auto"
                              onClick={() => !isDisabled && toggleAttrModal(id)}
                              style={{
                                cursor: isDisabled ? "not-allowed" : "pointer",
                              }}
                            />
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                            {item?.Department?.department_name || "-"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                            {item?.Product_stock_detail?.barcode || "-"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                            {item?.Product_stock_detail?.serial_no || "-"}
                          </TableCell>
                          {allConsumable &&
                            item?.Product?.enable_for_timeline == "1" &&
                            companyDetails?.ENABLE_STOCKDETAIL_STATUS_LABEL ==
                            "Y" && (
                              <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                                {getStatusName(
                                  item?.Product_stock_detail?.exparams_status_id
                                )}
                              </TableCell>
                            )}
                          {allConsumable &&
                            item?.Product?.enable_for_timeline == "1" &&
                            companyDetails?.ENABLE_STOCKDETAIL_MFR_DATE_LABEL ==
                            "Y" && (
                              <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                                {formatDate(
                                  item?.Product_stock_detail?.exparams_startdate
                                )}
                              </TableCell>
                            )}
                          {allConsumable &&
                            item?.Product?.enable_for_timeline == "1" &&
                            companyDetails?.ENABLE_STOCKDETAIL_EXPIRY_DATE_LABEL ==
                            "Y" && (
                              <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                                {formatDate(
                                  item?.Product_stock_detail?.exparams_enddate
                                )}
                              </TableCell>
                            )}
                          {allConsumable &&
                            item?.Product?.enable_extra_params == "1" &&
                            companyDetails?.ENABLE_STOCKDETAIL_CURRENT_OR_PAST_READING_LABEL ==
                            "Y" && (
                              <>
                                <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                                  {item?.Product_stock_detail
                                    ?.exparams_currentreading || "-"}
                                </TableCell>
                                <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                                  {item?.Product_stock_detail?.exparams_pastreading ||
                                    "-"}
                                </TableCell>
                              </>
                            )}
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                            {item?.Grnregister?.grnfullno ||
                              item?.Product_stock_master?.psm_fullno ||
                              "-"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                            {item?.Grnregister?.inwarddatetime ||
                              item?.Product_stock_master?.created_dt ||
                              "-"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            {item?.Product_stock_detail?.stock_rate || "0.00"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            {item?.Product_stock_detail?.mrp_rate || "0.00"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            {item?.Product_stock_detail?.sales_rate || "0.00"}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                            {item?.main_first_quantity_total || "0"} (
                            {selectedProd?.unit_name}){" "}
                            {item?.main_sec_quantity_total || "0"} (
                            {selectedProd?.secondary_unit})
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                            {item?.used_first_quantity_total || "0"} (
                            {selectedProd?.unit_name}){" "}
                            {item?.used_sec_quantity_total || "0"} (
                            {selectedProd?.secondary_unit})
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center font-bold">
                            {item?.available_first_quantity_total || "0"} (
                            {selectedProd?.unit_name}){" "}
                            {item?.available_sec_quantity_total || "0"} (
                            {selectedProd?.secondary_unit})
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            <Input
                              type="text"
                              value={rowData.qty}
                              onChange={(e) =>
                                handleQuantityChange(
                                  id,
                                  e.target.value,
                                  item?.available_first_quantity_total,
                                  item?.Product_stock_detail?.available_Sec_Qty
                                )
                              }
                              onKeyPress={handleKeyPress}
                              disabled={
                                !currentProductRows.some(
                                  (row) => row.product_stock_detail_id == id
                                ) || isDisabled
                              }
                              className="w-20 sm:w-[100px] h-7 sm:h-8 text-xs text-center"
                              style={getInputStyle(item)}
                            />
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center">
                            <Input
                              type="text"
                              value={rowData.free_qty}
                              onChange={(e) =>
                                handleFreeQuantityChange(
                                  id,
                                  e.target.value,
                                  item?.available_first_quantity_total,
                                  item?.Product_stock_detail?.available_Sec_Qty
                                )
                              }
                              onKeyPress={handleKeyPress}
                              disabled={
                                !currentProductRows.some(
                                  (row) => row.product_stock_detail_id == id
                                ) || isDisabled
                              }
                              className="w-20 sm:w-[100px] h-7 sm:h-8 text-xs text-center"
                              style={getInputStyle(item)}
                            />
                          </TableCell>
                          {allConsumable &&
                            companyDetails?.ENABLED_TO_ALLOW_BIN_STORE_MANAGEMENT ==
                            "Y" && (
                              <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                                {item?.Bin_Store_Master?.bin_store_name || "-"}
                              </TableCell>
                            )}
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">{item?.st_contact_name || "-"}</TableCell>
                          <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">{item?.st_description || "-"}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={
                          19 +
                          (allConsumable && hasTimelineEnabled
                            ? companyDetails?.ENABLE_STOCKDETAIL_STATUS_LABEL == "Y"
                              ? 1
                              : 0
                            : 0) +
                          (allConsumable && hasTimelineEnabled
                            ? companyDetails?.ENABLE_STOCKDETAIL_MFR_DATE_LABEL == "Y"
                              ? 1
                              : 0
                            : 0) +
                          (allConsumable && hasTimelineEnabled
                            ? companyDetails?.ENABLE_STOCKDETAIL_EXPIRY_DATE_LABEL == "Y"
                              ? 1
                              : 0
                            : 0) +
                          (allConsumable && hasExtraParamsEnabled
                            ? companyDetails?.ENABLE_STOCKDETAIL_CURRENT_OR_PAST_READING_LABEL == "Y"
                              ? 2
                              : 0
                            : 0) +
                          (allConsumable &&
                            companyDetails?.ENABLED_TO_ALLOW_BIN_STORE_MANAGEMENT == "Y"
                            ? 1
                            : 0)
                        }
                        className="text-center py-4 px-2 sm:px-4 text-xs sm:text-sm"
                      >
                        No stock items available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter className="mt-4 px-0">
            <Button
              onClick={() => {
                // Clear data before closing
                handleDialogClose(false);
              }}
              className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            >
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (onCancel) {
                  onCancel();
                } else {
                  handleDialogClose(false);
                }
              }}
              className="w-full sm:w-auto px-4 sm:px-6 text-xs sm:text-sm"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attributes Modal */}
      <Dialog open={attrModalOpen} onOpenChange={toggleAttrModal}>
        <DialogContent className="w-[90vw] max-w-[425px] md:max-w-[600px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">Product Attributes</DialogTitle>
            <DialogClose className="absolute right-4 top-4" />
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto">
            {selectedItemId && getAttributes(selectedItemId).length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[300px]">
                  <TableHeader>
                    <TableRow className="bg-[#4a5a6b] hover:bg-[#4a5a6b] text-white">
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2">Attribute</TableHead>
                      <TableHead className="text-white text-xs sm:text-sm px-2 sm:px-4 py-2">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAttributes(selectedItemId).map((attr, index) => (
                      <TableRow key={index} className="border-b">
                        <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                          {attr.name}
                        </TableCell>
                        <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm">
                          {attr.value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-4 text-xs sm:text-sm text-gray-500">No attributes available for this item.</p>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={toggleAttrModal}
              className="w-full sm:w-auto px-4 sm:px-6 text-xs sm:text-sm"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StockListDialog;

