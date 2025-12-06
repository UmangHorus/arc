// components/shared/MeasurementDetailsDialog.jsx
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
import { Calculator, Info, Ruler } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import { leadService } from "@/lib/leadService";
import { HashLoader } from "react-spinners";
import { format, parse } from "date-fns";
import api from "@/lib/api/axios";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { convertSegmentPathToStaticExportFilename } from "next/dist/shared/lib/segment-cache/segment-value-encoding";

const MeasurementDetailsDialog = ({ measurementId, open, onOpenChange }) => {
    const baseurl = api.defaults.baseURL;
    const { user = {}, token, appConfig } = useLoginStore();
    const queryClient = useQueryClient();
    const [measurementData, setMeasurementData] = useState(null);
    const [formValues, setFormValues] = useState([]);
    const [tooltipOpenIndex, setTooltipOpenIndex] = useState(null);

    // Fetch measurement details
    const {
        data: measurementResponse,
        error: measurementError,
        isLoading: measurementLoading,
    } = useQuery({
        queryKey: ["measurementDetail", measurementId],
        queryFn: () =>
            leadService.getMeasurementDetail(
                token,
                user?.id,
                appConfig?.company_id,
                appConfig?.branch_id,
                measurementId
            ),
        enabled: open && !!measurementId && !!token && !!user?.id && !!appConfig?.company_id && !!appConfig?.branch_id,
        refetchOnMount: "always",
        staleTime: 0,
        cacheTime: 0,
    });

    // Add this useEffect to clear cache when dialog closes
    useEffect(() => {
        if (!open) {
            // Clear sales order details query
            queryClient.removeQueries({
                queryKey: ["measurementDetail", measurementId],
                exact: true
            });

            // Reset local state
            setMeasurementData(null);
            setFormValues([]);
        }
    }, [open, measurementId, queryClient]);

    // Handle measurement data
    useEffect(() => {
        if (measurementResponse && measurementResponse?.STATUS === "SUCCESS") {
            const data = measurementResponse.DATA[0];
            setMeasurementData(data);

            // Transform data for display
            if (Array.isArray(data.measurement_product) && data.measurement_product.length > 0) {
                const transformedData = data.measurement_product.map((prod, idx) => {
                    const productKey = `${prod.product_id}_${idx}`;
                    const attrObj = {};
                    const attrValues = [];

                    if (prod.Attributes && typeof prod.Attributes === "object") {
                        const attrKeys = Object.keys(prod.Attributes);
                        attrKeys.forEach((attrId) => {
                            const values = prod.Attributes[attrId];
                            values.forEach((val, i) => {
                                if (!attrValues[i]) attrValues[i] = {};
                                attrValues[i][attrId] = val;
                            });
                        });
                    }

                    attrObj[productKey] = attrValues;

                    return {
                        unique_id: Date.now().toString() + idx,
                        productid: prod.product_id || "",
                        productname: prod.name || "",
                        short_description: prod.short_description || "",
                        productcode: prod.code || "",
                        product_image: prod.photo_path || "",
                        Attribute_data: prod.Attribute_data || {},
                        attribute: attrObj,
                    };
                });

                setFormValues(transformedData);
            }
        } else if (measurementResponse && measurementResponse?.STATUS === "ERROR") {
            toast.error(measurementResponse?.MSG || "Failed to load measurement details");
            onOpenChange(false);
        }
        if (measurementError) {
            toast.error("An error occurred while fetching measurement details");
            onOpenChange(false);
        }
    }, [measurementResponse, measurementError, onOpenChange]);

    // Helper function to safely parse numbers
    const safeParseNumber = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    };

    // Function to extract attribute IDs from formula
    const extractAttributeIds = (formula) => {
        const attrIds = [];
        const regex = /Attr_(\d+)/g;
        let match;
        while ((match = regex.exec(formula)) !== null) {
            if (!attrIds.includes(match[1])) {
                attrIds.push(match[1]);
            }
        }
        return attrIds;
    };

    // Safe mathematical expression evaluator
    const safeEvaluate = (expression) => {
        try {
            const validPattern = /^[0-9+\-*/.() ]+$/;
            if (!validPattern.test(expression)) {
                return 0;
            }

            let parenCount = 0;
            for (const char of expression) {
                if (char === '(') parenCount++;
                if (char === ')') parenCount--;
                if (parenCount < 0) {
                    return 0;
                }
            }
            if (parenCount !== 0) {
                return 0;
            }

            const result = new Function(`'use strict'; return (${expression})`)();

            if (result === Infinity || result === -Infinity || isNaN(result)) {
                return 0;
            }

            return parseFloat(result);
        } catch (error) {
            return 0;
        }
    };

    // Calculate formula for a row
    const calculateFormulaForRow = (rowData, formulaAttribute, selectedFormulaId) => {
        if (!formulaAttribute || !selectedFormulaId) {
            return { result: 0, expression: "" };
        }
        const selectedFormula = formulaAttribute.Masters.find(
            (m) => String(m.ID) === String(selectedFormulaId)
        );

        if (!selectedFormula || !selectedFormula.Calculation_Formula) {
            return { result: 0, expression: "" };
        }
        let formula = selectedFormula.Calculation_Formula;
        const attrIds = extractAttributeIds(formula);
        let expression = formula;

        attrIds.forEach((attrId) => {
            const rawValue = rowData[attrId];
            const parsedValue = safeParseNumber(rawValue);
            const replacementValue = parsedValue !== null && parsedValue !== undefined ? parsedValue : 0;

            const attrPattern = new RegExp(`Attr_${attrId}\\b`, 'g');
            expression = expression.replace(attrPattern, `(${replacementValue})`);
        });

        const result = safeEvaluate(expression);
        return {
            result,
            expression
        };
    };

    // Render attribute value for display
    const renderAttributeValue = (attr, value) => {
        if (value === null || value === undefined || value === "") {
            return "-";
        }

        switch (String(attr?.Type)) {
            case "2":
            case "3":
                const matchedMaster = attr?.Masters?.find(
                    (master) => String(master.ID) === String(value)
                );
                return matchedMaster ? matchedMaster.N : value;
            case "6":
                try {
                    const parsedDate = parse(value.split(" ")[0] || value, "dd/MM/yyyy", new Date());
                    return format(parsedDate, "MMM dd, yyyy");
                } catch {
                    return value;
                }
            default:
                return value;
        }
    };

    // Get formula attribute from product attributes
    const getFormulaAttribute = (attributeData) => {
        if (!attributeData) return null;
        const attrArray = Object.values(attributeData).map((attr) => ({
            ...attr,
            Masters: Array.isArray(attr?.Masters)
                ? attr?.Masters
                : Object.values(attr?.Masters ?? {}).filter(
                    (master) => master?.N && master?.ID
                ),
        }));
        return attrArray.find(attr => attr.Is_Formula === true);
    };

    // Get reference by text based on reference_type
    const getReferenceByText = () => {
        if (!measurementData) return "-";

        const referenceType = measurementData.reference_type;
        const referenceName = measurementData.reference_name || "";
        const referenceId = measurementData.reference_id || "";

        switch (referenceType) {
            case "1":
                return `${referenceName} (C)`;
            case "6":
                return `${referenceName} (RC)`;
            case "7":
                return `Lead No: ${referenceId}`;
            default:
                return referenceName || referenceId || "-";
        }
    };

    if (measurementLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-2xl font-bold text-center">
                            Measurement Details
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
                        Measurement Details
                    </DialogTitle>
                    <DialogClose className="absolute right-4 top-4" />
                </DialogHeader>
                <div className="space-y-4 sm:space-y-6 details-page">
                    {/* Measurement Details - Horizontal Layout */}
                    <div className="bg-[#4CAF93] bg-opacity-20 p-3 sm:p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                            <Ruler className="h-5 w-5 sm:h-6 sm:w-6 text-[#287F71] mr-2" />
                            <h3 className="text-base sm:text-lg font-semibold">Measurement Details</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm sm:text-base">
                            <div className="flex flex-col">
                                <p className="font-medium text-[#287F71]">Measurement No:</p>
                                <p className="break-words overflow-hidden max-w-full">
                                    {measurementData?.fullmeasurementno || "-"}
                                </p>
                            </div>
                            <div className="flex flex-col">
                                <p className="font-medium text-[#287F71]">Measurement Date:</p>
                                <p className="break-words overflow-hidden max-w-full">
                                    {measurementData?.measurement_dt || "-"}
                                </p>
                            </div>
                            <div className="flex flex-col">
                                <p className="font-medium text-[#287F71]">Created By:</p>
                                <p className="break-words overflow-hidden max-w-full">
                                    {measurementData?.created_by || "-"}
                                </p>
                            </div>
                            <div className="flex flex-col">
                                <p className="font-medium text-[#287F71]">Updated By:</p>
                                <p className="break-words overflow-hidden max-w-full">
                                    {measurementData?.updated_by || "-"}
                                </p>
                            </div>
                            <div className="flex flex-col">
                                <p className="font-medium text-[#287F71]">Updated Date:</p>
                                <p className="break-words overflow-hidden max-w-full">
                                    {measurementData?.updated_dt || "-"}
                                </p>
                            </div>
                            <div className="flex flex-col">
                                <p className="font-medium text-[#287F71]">Reference By:</p>
                                <p className="break-words overflow-hidden max-w-full">
                                    {getReferenceByText()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Products and Attributes */}
                    {formValues.map((product, productIndex) => {
                        const attributes = product.Attribute_data ?
                            Object.values(product.Attribute_data).map((attr) => ({
                                ...attr,
                                Masters: Array.isArray(attr?.Masters)
                                    ? attr?.Masters
                                    : Object.values(attr?.Masters ?? {}).filter(
                                        (master) => master?.N && master?.ID
                                    ),
                            })) : [];

                        const formulaAttribute = getFormulaAttribute(product.Attribute_data);

                        // Separate formula and non-formula attributes
                        const formulaAttributes = attributes.filter(attr => attr.Is_Formula === true);
                        const nonFormulaAttributes = attributes.filter(attr => attr.Is_Formula !== true);

                        // Combine: formula attributes first, then non-formula attributes
                        const sortedAttributes = [...formulaAttributes, ...nonFormulaAttributes];

                        const productAttrKey = `${product.productid}_${productIndex}`;
                        const attributeRows = product.attribute?.[productAttrKey] || [{}];

                        return (
                            <div key={product.unique_id} className="border rounded-lg overflow-hidden">
                                {/* Product Header */}
                                <div className="bg-[#4a5a6b] text-white p-[4px]">
                                    <div className="flex items-center gap-3">
                                        <img
                                            alt="product-image"
                                            src={
                                                product.product_image
                                                    ? product.product_image
                                                    : `${baseurl}/viewimage/getproduct/normal`
                                            }
                                            className="w-10 h-10 sm:w-12 sm:h-12 rounded"
                                        />
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-sm sm:text-base">
                                                {product.productname || "Unknown Product"}
                                                {product.productcode && (
                                                    <span className="text-gray-300 ml-1">
                                                        ({product.productcode})
                                                    </span>
                                                )}
                                            </h3>
                                            {product.short_description && (
                                                <>
                                                    {/* Desktop - Hover */}
                                                    <div className="hidden sm:block">
                                                        <TooltipProvider>
                                                            <Tooltip delayDuration={0}>
                                                                <TooltipTrigger asChild>
                                                                    <Info className="text-green-300 cursor-pointer h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs text-sm">{product.short_description}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>

                                                    {/* Mobile - Click */}
                                                    <div className="sm:hidden">
                                                        <TooltipProvider>
                                                            <Tooltip
                                                                open={tooltipOpenIndex === productIndex}
                                                                onOpenChange={(open) => setTooltipOpenIndex(open ? productIndex : null)}
                                                                delayDuration={0}
                                                            >
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        className="text-green-300 cursor-pointer h-3.5 w-3.5 flex-shrink-0"
                                                                        onClick={() => setTooltipOpenIndex(tooltipOpenIndex === productIndex ? null : productIndex)}
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs text-sm">{product.short_description}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Attributes Table */}
                                {sortedAttributes.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <Table className="min-w-[300px] sm:min-w-[600px]">
                                            <TableHeader>
                                                <TableRow className="bg-gray-100">
                                                    <TableHead className="custom-table-head  text-gray-700 px-2 sm:px-3 py-1 font-medium text-xs sm:text-sm text-center">
                                                        Sr No
                                                    </TableHead>
                                                    {sortedAttributes.map((attr) => (
                                                        <TableHead
                                                            key={attr?.ID}
                                                            className="custom-table-head text-gray-700 px-2 sm:px-3 py-1 font-medium text-xs sm:text-sm text-center"
                                                        >
                                                            {attr?.Name ?? "Unknown"}
                                                            {/* {attr.Is_Formula && (
                                                                <span className="text-xs text-blue-600 ml-1">(Formula)</span>
                                                            )} */}
                                                        </TableHead>
                                                    ))}
                                                    {formulaAttribute && (
                                                        <TableHead className="custom-table-head  text-gray-700 px-2 sm:px-3 py-1 font-medium text-xs sm:text-sm text-center">
                                                            Calculation
                                                        </TableHead>
                                                    )}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {attributeRows.map((row, rowIndex) => {
                                                    const calculationResult = formulaAttribute ?
                                                        calculateFormulaForRow(row, formulaAttribute, row[formulaAttribute.ID]) :
                                                        { result: 0, expression: "" };

                                                    // Add this function to convert formula with attribute IDs to names
                                                    const getFormulaWithNames = (formula, attributes) => {
                                                        if (!formula || !attributes) return formula;

                                                        let formattedFormula = formula;

                                                        // Replace all Attr_ID with Attribute Names
                                                        attributes.forEach(attr => {
                                                            const attrPattern = new RegExp(`Attr_${attr.ID}\\b`, 'g');
                                                            formattedFormula = formattedFormula.replace(attrPattern, attr.Name);
                                                        });

                                                        return formattedFormula;
                                                    };

                                                    // Get the selected formula with attribute names for display
                                                    const getSelectedFormulaWithNames = () => {
                                                        if (!formulaAttribute || !row[formulaAttribute.ID]) return "";

                                                        const selectedFormula = formulaAttribute.Masters.find(
                                                            (m) => String(m.ID) === String(row[formulaAttribute.ID])
                                                        );

                                                        if (!selectedFormula || !selectedFormula.Calculation_Formula) return "";

                                                        return getFormulaWithNames(selectedFormula.Calculation_Formula, attributes);
                                                    };

                                                    return (
                                                        <TableRow key={rowIndex} className="border-b">
                                                            <TableCell className="px-2 sm:px-3 py-1 p-1 text-xs sm:text-sm text-center">
                                                                {rowIndex + 1}
                                                            </TableCell>
                                                            {sortedAttributes.map((attr) => (
                                                                <TableCell key={attr?.ID} className="px-2 sm:px-3 py-1 p-1 text-xs sm:text-sm text-center">
                                                                    <div className="flex items-center justify-center">
                                                                        {renderAttributeValue(attr, row[attr?.ID])}
                                                                    </div>
                                                                </TableCell>
                                                            ))}
                                                            {formulaAttribute && (
                                                                <TableCell className="px-2 sm:px-3 py-1 p-1 text-center">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <span className="font-semibold text-xs sm:text-sm text-blue-700">
                                                                            {calculationResult.result.toFixed(2)}
                                                                        </span>
                                                                        {getSelectedFormulaWithNames() && (
                                                                            <TooltipProvider>
                                                                                <Tooltip
                                                                                    open={tooltipOpenIndex === `${productIndex}-${rowIndex}`}
                                                                                    onOpenChange={(open) => setTooltipOpenIndex(open ? `${productIndex}-${rowIndex}` : null)}
                                                                                    delayDuration={0}
                                                                                >
                                                                                    <TooltipTrigger asChild>
                                                                                        <Calculator
                                                                                            className="text-purple-500 cursor-pointer h-3.5 w-3.5 flex-shrink-0"
                                                                                            onClick={() => setTooltipOpenIndex(tooltipOpenIndex === `${productIndex}-${rowIndex}` ? null : `${productIndex}-${rowIndex}`)}
                                                                                        />
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>
                                                                                        <p className="max-w-xs text-sm">{getSelectedFormulaWithNames()}</p>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            )}
                                                        </TableRow>
                                                    );
                                                })}

                                                {/* Subtotal for formula calculations */}
                                                {formulaAttribute && attributeRows.length > 1 && (
                                                    <TableRow className="bg-gray-50 font-bold">
                                                        <TableCell
                                                            colSpan={sortedAttributes.length + 1}
                                                            className="text-right px-2 sm:px-3 py-1 p-1 text-xs sm:text-sm"
                                                        >
                                                            Sub Total:
                                                        </TableCell>
                                                        <TableCell className="px-2 sm:px-3 py-1 p-1 text-center">
                                                            <span className="text-sm sm:text-base font-bold text-green-700">
                                                                {attributeRows.reduce((total, row) => {
                                                                    const calc = calculateFormulaForRow(row, formulaAttribute, row[formulaAttribute.ID]);
                                                                    return total + calc.result;
                                                                }, 0).toFixed(2)}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        No attribute data available for this product
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {formValues.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No product data available for this measurement
                        </div>
                    )}

                    {/* Measurement Summary */}
                    {/* <div className="bg-[#287F71] text-white p-4 rounded-lg flex flex-col justify-around gap-4 sm:flex-row sm:gap-8">
                        <div className="text-center">
                            <p className="text-xs sm:text-sm font-semibold">TOTAL PRODUCTS</p>
                            <p className="text-sm sm:text-base font-bold">{formValues.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs sm:text-sm font-semibold">MEASUREMENT DATE</p>
                            <p className="text-sm sm:text-base font-bold">{measurementData?.measurement_dt || "-"}</p>
                        </div>
                        <div className="text-center">
                            <Ruler className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1" />
                            <p className="text-xs sm:text-sm font-semibold">MEASUREMENT</p>
                        </div>
                    </div> */}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MeasurementDetailsDialog;