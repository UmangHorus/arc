"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Info } from "lucide-react";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { format, fromUnixTime } from "date-fns";
import { HashLoader } from "react-spinners";

const AttributeWiseStockDialog = ({
    isOpen,
    onOpenChange,
    stockList = [],
    prodAttrHeadings = [],
    prodAttrValue = [],
    selectedProd,
    branchName = "",
    isLoading = false,
}) => {
    const { companyDetails } = useSharedDataStore();
    const [attrModalOpen, setAttrModalOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState(null);
    const unitMaster = companyDetails?.unit_master || [];

    // Reset local dialog state when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setAttrModalOpen(false);
            setSelectedItemId(null);
        }
    }, [isOpen]);

    const toggleAttrModal = (id) => {
        setSelectedItemId(id);
        setAttrModalOpen(!attrModalOpen);
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

    // Get primary unit name
    const getPrimaryUnitName = () => {
        if (selectedProd?.primary_unit_id && unitMaster.length > 0) {
            const unit = unitMaster.find((u) => u.unit_id == selectedProd.primary_unit_id);
            if (unit) {
                return unit.unit_name || "";
            }
        }
        return selectedProd?.unit || "";
    };

    // Get secondary unit name
    const getSecondaryUnitName = () => {
        if (selectedProd?.secondary_unit_id && unitMaster.length > 0) {
            const unit = unitMaster.find((u) => u.unit_id == selectedProd.secondary_unit_id);
            if (unit) {
                return unit.unit_name || "";
            }
        }
        return selectedProd?.sec_unit || "";
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
            .filter((attr) => attr.value && attr.value != "" && attr.value != "-");
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
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-2xl font-bold text-center">
                            Product Stock ({selectedProd?.productname || ""})
                            {branchName && ` - ${branchName}`}
                        </DialogTitle>
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
                                                        {getPrimaryUnitName()}){" "}
                                                        {item?.main_sec_quantity_total || "0"} (
                                                        {getSecondaryUnitName()})
                                                    </TableCell>
                                                    <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center break-words">
                                                        {item?.used_first_quantity_total || "0"} (
                                                        {getPrimaryUnitName()}){" "}
                                                        {item?.used_sec_quantity_total || "0"} (
                                                        {getSecondaryUnitName()})
                                                    </TableCell>
                                                    <TableCell className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-center font-bold ">
                                                        {item?.available_first_quantity_total || "0"} (
                                                        {getPrimaryUnitName()}){" "}
                                                        {item?.available_sec_quantity_total || "0"} (
                                                        {getSecondaryUnitName()})
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
                                                    15 +
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
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="w-full sm:w-auto px-4 sm:px-6 text-xs sm:text-sm"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Attributes Modal */}
            <Dialog open={attrModalOpen} onOpenChange={toggleAttrModal}>
                <DialogContent className="w-[90vw] max-w-[425px] md:max-w-[600px] lg:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
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
                                                <TableCell className="py-2 text-xs sm:text-sm font-medium">
                                                    {attr.name}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs sm:text-sm">
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

export default AttributeWiseStockDialog;

