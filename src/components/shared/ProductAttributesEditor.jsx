"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info, RefreshCw, Calculator } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const ProductAttributesEditor = ({
    product,
    index,
    formValues,
    setFormValues,
    onClose,
}) => {
    const [attributes, setAttributes] = useState([]);
    const [localAttrValues, setLocalAttrValues] = useState([{}]);
    const [loading, setLoading] = useState(true);
    const [formulaAttribute, setFormulaAttribute] = useState(null);
    const [autoFilledDefaults, setAutoFilledDefaults] = useState({});
    const [tooltipOpenIndex, setTooltipOpenIndex] = useState(null);

    // Helper function to safely parse a number
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

    // Enhanced function to intelligently determine default value based on operator context
    const getDefaultValueForOperator = (formula, attrId) => {
        // Find all occurrences of the attribute in the formula
        const attrPattern = new RegExp(`Attr_${attrId}\\b`, 'g');
        const matches = [];
        let match;

        while ((match = attrPattern.exec(formula)) !== null) {
            matches.push(match.index);
        }

        // For each occurrence, determine the context
        for (const index of matches) {
            const before = formula.substring(0, index);
            const after = formula.substring(index + `Attr_${attrId}`.length);

            // Find the immediate context (within parentheses or at formula level)
            const contextStart = Math.max(
                before.lastIndexOf('('),
                before.lastIndexOf('*'),
                before.lastIndexOf('/'),
                before.lastIndexOf('%'),
                0
            );

            const contextEnd = Math.min(
                after.indexOf(')') !== -1 ? after.indexOf(')') + index + `Attr_${attrId}`.length : formula.length,
                after.indexOf('*') !== -1 ? after.indexOf('*') + index + `Attr_${attrId}`.length : formula.length,
                after.indexOf('/') !== -1 ? after.indexOf('/') + index + `Attr_${attrId}`.length : formula.length,
                after.indexOf('%') !== -1 ? after.indexOf('%') + index + `Attr_${attrId}`.length : formula.length,
                formula.length
            );

            const context = formula.substring(contextStart, contextEnd);

            // Check what operation is happening inside the immediate context
            const beforeInContext = context.substring(0, index - contextStart).trim();
            const afterInContext = context.substring(index - contextStart + `Attr_${attrId}`.length).trim();

            // Get the immediate operator before the attribute
            const operatorBefore = beforeInContext.match(/([+\-*/%])(?!.*[+\-*/%])/)?.[1];
            // Get the immediate operator after the attribute
            const operatorAfter = afterInContext.match(/^([+\-*/%])/)?.[1];

            // Check if we're inside parentheses
            const insideParentheses = before.split('(').length > before.split(')').length;

            if (insideParentheses) {
                // Find the opening parenthesis for this context
                const openParenIndex = before.lastIndexOf('(');
                const insideParenFormula = formula.substring(openParenIndex);
                const closeParenIndex = insideParenFormula.indexOf(')');
                const parenContent = insideParenFormula.substring(1, closeParenIndex);

                // Check operators inside the parentheses around this attribute
                const attrPosInParen = parenContent.indexOf(`Attr_${attrId}`);
                if (attrPosInParen !== -1) {
                    const beforeInParen = parenContent.substring(0, attrPosInParen).trim();
                    const afterInParen = parenContent.substring(attrPosInParen + `Attr_${attrId}`.length).trim();

                    const lastOpBefore = beforeInParen.match(/([+\-*/%])(?!.*[+\-*/%])/)?.[1];
                    const firstOpAfter = afterInParen.match(/^([+\-*/%])/)?.[1];

                    // If operations inside parentheses are multiplication/division, use 1
                    if (lastOpBefore === '*' || lastOpBefore === '/' || lastOpBefore === '%' ||
                        firstOpAfter === '*' || firstOpAfter === '/' || firstOpAfter === '%') {
                        return 1;
                    }

                    // If operations inside parentheses are addition/subtraction, use 0
                    if (lastOpBefore === '+' || lastOpBefore === '-' ||
                        firstOpAfter === '+' || firstOpAfter === '-') {
                        return 0;
                    }

                    // If at the start of parentheses, check what comes after
                    if (beforeInParen === '' || beforeInParen === '(') {
                        if (firstOpAfter === '+' || firstOpAfter === '-') {
                            return 0;
                        }
                        if (firstOpAfter === '*' || firstOpAfter === '/' || firstOpAfter === '%') {
                            return 1;
                        }
                    }
                }
            }

            // Check operators in the broader context
            if (operatorBefore === '*' || operatorBefore === '/' || operatorBefore === '%' ||
                operatorAfter === '*' || operatorAfter === '/' || operatorAfter === '%') {
                return 1;
            }

            if (operatorBefore === '+' || operatorBefore === '-' ||
                operatorAfter === '+' || operatorAfter === '-') {
                return 0;
            }
        }

        // Default to 0 for addition/subtraction or unknown contexts
        return 0;
    };

    // Enhanced mathematical expression evaluator with better error handling
    const safeEvaluate = (expression) => {
        try {
            // Validate the expression contains only allowed characters
            const validPattern = /^[0-9+\-*/.() ]+$/;
            if (!validPattern.test(expression)) {
                console.error("Invalid characters in expression:", expression);
                return 0;
            }

            // Check for balanced parentheses
            let parenCount = 0;
            for (const char of expression) {
                if (char === '(') parenCount++;
                if (char === ')') parenCount--;
                if (parenCount < 0) {
                    console.error("Unbalanced parentheses:", expression);
                    return 0;
                }
            }
            if (parenCount !== 0) {
                console.error("Unbalanced parentheses:", expression);
                return 0;
            }

            // Evaluate using Function constructor (safer than eval)
            const result = new Function(`'use strict'; return (${expression})`)();

            // Handle special numeric cases
            if (result === Infinity || result === -Infinity) {
                console.error("Division by zero or infinity result:", expression);
                return 0;
            }

            if (isNaN(result)) {
                console.error("Result is NaN:", expression);
                return 0;
            }

            return parseFloat(result);
        } catch (error) {
            console.error("Error evaluating expression:", error, "Expression:", expression);
            return 0;
        }
    };

    // Function to get the attribute name by ID
    const getAttributeNameById = (attrId) => {
        const attr = attributes.find(a => String(a.ID) === String(attrId));
        return attr ? attr.Name : `Attr_${attrId}`;
    };

    // Function to calculate formula for a single row with comprehensive handling
    const calculateFormulaForRow = (rowData, selectedFormulaId) => {
        if (!formulaAttribute || !selectedFormulaId) {
            return { result: 0, expression: "", usedDefaults: {} };
        }

        // Find the selected formula from Masters
        const selectedFormula = formulaAttribute.Masters.find(
            (m) => String(m.ID) === String(selectedFormulaId)
        );

        if (!selectedFormula || !selectedFormula.Calculation_Formula) {
            return { result: 0, expression: "", usedDefaults: {} };
        }

        let formula = selectedFormula.Calculation_Formula;

        // Extract all attribute IDs from the formula
        const attrIds = extractAttributeIds(formula);

        // Build the expression by replacing attributes with their values
        let expression = formula;
        const usedDefaults = {};

        attrIds.forEach((attrId) => {
            const rawValue = rowData[attrId];
            const parsedValue = safeParseNumber(rawValue);

            let replacementValue;
            let isDefault = false;

            if (parsedValue === null || parsedValue === undefined) {
                // Use smart default based on operator context
                replacementValue = getDefaultValueForOperator(formula, attrId);
                isDefault = true;
                usedDefaults[attrId] = {
                    value: replacementValue,
                    name: getAttributeNameById(attrId)
                };
            } else {
                replacementValue = parsedValue;
            }

            // Replace all occurrences of this attribute with wrapped value
            const attrPattern = new RegExp(`Attr_${attrId}\\b`, 'g');
            expression = expression.replace(attrPattern, `(${replacementValue})`);
        });

        const result = safeEvaluate(expression);

        return {
            result,
            expression,
            usedDefaults
        };
    };

    // Calculate results for all rows and subtotal
    const calculationResults = useMemo(() => {
        if (!formulaAttribute) {
            return { rowResults: [], subTotal: 0, rowDetails: [] };
        }

        const rowDetails = localAttrValues.map((rowData) => {
            const selectedFormulaId = rowData[formulaAttribute.ID];
            return calculateFormulaForRow(rowData, selectedFormulaId);
        });

        const rowResults = rowDetails.map(detail => detail.result);
        const subTotal = rowResults.reduce((sum, val) => sum + (val || 0), 0);

        return {
            rowResults,
            subTotal: parseFloat(subTotal.toFixed(2)),
            rowDetails
        };
    }, [localAttrValues, formulaAttribute, attributes]);

    // Auto-fill smart defaults when formula changes
    useEffect(() => {
        if (!formulaAttribute) return;

        const newAutoFilledDefaults = {};

        localAttrValues.forEach((rowData, rowIndex) => {
            const selectedFormulaId = rowData[formulaAttribute.ID];
            if (!selectedFormulaId) return;

            const selectedFormula = formulaAttribute.Masters.find(
                (m) => String(m.ID) === String(selectedFormulaId)
            );
            if (!selectedFormula || !selectedFormula.Calculation_Formula) return;

            const attrIds = extractAttributeIds(selectedFormula.Calculation_Formula);

            attrIds.forEach((attrId) => {
                const currentValue = rowData[attrId];
                const parsedValue = safeParseNumber(currentValue);

                // If the field is empty or null, auto-fill with smart default
                if (parsedValue === null || parsedValue === undefined) {
                    const smartDefault = getDefaultValueForOperator(
                        selectedFormula.Calculation_Formula,
                        attrId
                    );

                    if (smartDefault !== null) {
                        const key = `${rowIndex}-${attrId}`;
                        newAutoFilledDefaults[key] = true;

                        // Auto-fill the value
                        setLocalAttrValues((prev) => {
                            const newValues = [...prev];
                            if (!newValues[rowIndex][attrId] || newValues[rowIndex][attrId] === "") {
                                newValues[rowIndex] = {
                                    ...newValues[rowIndex],
                                    [attrId]: String(smartDefault),
                                };
                            }
                            return newValues;
                        });
                    }
                }
            });
        });

        setAutoFilledDefaults(newAutoFilledDefaults);
    }, [formulaAttribute, localAttrValues.length]);

    useEffect(() => {
        setLoading(true);
        if (product?.Attribute_data) {
            const attrArray = Object.values(product?.Attribute_data ?? {}).map(
                (attr) => ({
                    ...attr,
                    Masters: Array.isArray(attr?.Masters)
                        ? attr?.Masters
                        : Object.values(attr?.Masters ?? {}).filter(
                            (master) => master?.N && master?.ID
                        ),
                })
            );
            setAttributes(attrArray);

            // Find formula attribute
            const formulaAttr = attrArray.find(attr => attr.Is_Formula === true);
            if (formulaAttr) {
                setFormulaAttribute(formulaAttr);
            }

            const productAttrKey = `${product?.productid}_${index}`;
            const existingAttrs = formValues?.[index]?.attribute?.[productAttrKey] ?? [];

            const defaultAttrs = {};
            attrArray.forEach((attr) => {
                let defaultValue = "";
                if (existingAttrs.length > 0 && existingAttrs[0]?.[attr?.ID] !== undefined) {
                    defaultValue = existingAttrs[0][attr?.ID];
                } else if (attr?.ValueID) {
                    if (attr?.Type == "6") {
                        defaultValue = attr?.ValueID?.split(" ")[0] ?? "";
                    } else if (attr?.Type == "2" || attr?.Type == "3") {
                        const matchedMaster = attr?.Masters?.find(
                            (master) => master?.N == attr?.ValueID
                        );
                        defaultValue = matchedMaster ? matchedMaster?.ID : "";
                    } else {
                        defaultValue = attr?.ValueID;
                    }
                }
                defaultAttrs[attr?.ID] = defaultValue;
            });

            setLocalAttrValues(
                existingAttrs.length > 0 ? existingAttrs : [defaultAttrs]
            );
        } else {
            setAttributes([]);
            setLocalAttrValues([{}]);
            setFormulaAttribute(null);
        }
        setLoading(false);
    }, [product, index, formValues]);

    const handleInputChange = (rowIndex, attrId, value) => {
        setLocalAttrValues((prev) => {
            const newValues = [...prev];
            newValues[rowIndex] = {
                ...newValues[rowIndex],
                [attrId]: value,
            };
            return newValues;
        });

        // Remove auto-filled marker when user manually changes the value
        const key = `${rowIndex}-${attrId}`;
        if (autoFilledDefaults[key]) {
            setAutoFilledDefaults((prev) => {
                const newDefaults = { ...prev };
                delete newDefaults[key];
                return newDefaults;
            });
        }
    };

    const handleAddRow = () => {
        const defaultAttrs = {};
        attributes.forEach((attr) => {
            let defaultValue = "";
            if (attr?.ValueID) {
                if (attr?.Type == "6") {
                    defaultValue = attr?.ValueID?.split(" ")[0] ?? "";
                } else if (attr?.Type == "2" || attr?.Type == "3") {
                    const matchedMaster = attr?.Masters?.find(
                        (master) => master?.N == attr?.ValueID
                    );
                    defaultValue = matchedMaster ? matchedMaster?.ID : "";
                } else {
                    defaultValue = attr?.ValueID;
                }
            }
            defaultAttrs[attr?.ID] = defaultValue;
        });
        setLocalAttrValues((prev) => [...prev, defaultAttrs]);
    };

    const handleDeleteRow = (rowIndex) => {
        if (localAttrValues.length === 1) {
            return;
        }
        setLocalAttrValues((prev) => {
            const newValues = [...prev];
            newValues.splice(rowIndex, 1);
            return newValues;
        });
        toast.success("Attribute row deleted successfully", {
            duration: 1000,
        });
    };

    // In ProductAttributesEditor.jsx → handleSave function
    const handleSave = () => {
        const productAttrKey = `${product?.productid}_${index}`;
        const newFormValues = [...(formValues ?? [])];

        // CALCULATE SUBTOTAL FROM ALL ROWS
        const subTotal = calculationResults.subTotal || 0;

        newFormValues[index] = {
            ...newFormValues?.[index],
            attribute: {
                ...newFormValues?.[index]?.attribute,
                [productAttrKey]: localAttrValues,
            },
            subTotal: subTotal, // Save calculated subTotal
        };
        setFormValues(newFormValues);
        toast.success("Product attributes saved successfully", { duration: 1000 });
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    // Check if an attribute was auto-filled
    const isAutoFilled = (rowIndex, attrId) => {
        const key = `${rowIndex}-${attrId}`;
        return autoFilledDefaults[key] === true;
    };

    const renderAttributeInput = (attr, rowIndex) => {
        const isAutoFilledValue = isAutoFilled(rowIndex, attr.ID);

        switch (String(attr?.Type)) {
            case "1":
                return (
                    <div className="relative">
                        <Input
                            type="text"
                            className={`w-full text-sm input-focus-style h-auto py-1 ${isAutoFilledValue ? 'border-orange-400 bg-orange-50' : ''
                                }`}
                            value={localAttrValues?.[rowIndex]?.[attr?.ID] ?? ""}
                            onChange={(e) => handleInputChange(rowIndex, attr?.ID, e.target.value)}
                        />
                        {/* {isAutoFilledValue && (
                            <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                                <RefreshCw className="h-2.5 w-2.5" />
                                Auto
                            </div>
                        )} */}
                    </div>
                );
            case "2":
            case "3":
                return (
                    <div className="relative">
                        <Select
                            value={String(localAttrValues?.[rowIndex]?.[attr?.ID] ?? "")}
                            onValueChange={(value) =>
                                handleInputChange(rowIndex, attr?.ID, value === "select" ? "" : value)
                            }
                        >
                            <SelectTrigger className={`w-full text-sm input-focus-style h-auto py-1 ${isAutoFilledValue ? 'border-orange-400 bg-orange-50' : ''
                                }`}>
                                <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="select">Select</SelectItem>
                                {(attr?.Masters ?? []).map((option) => (
                                    <SelectItem key={option?.ID} value={String(option?.ID)}>
                                        {option?.N ?? "Unknown"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* {isAutoFilledValue && (
                            <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                                <RefreshCw className="h-2.5 w-2.5" />
                                Auto
                            </div>
                        )} */}
                    </div>
                );
            case "4":
                return (
                    <div className="relative">
                        <Input
                            type="text"
                            className={`w-full text-sm input-focus-style h-auto py-1 ${isAutoFilledValue ? 'border-orange-400 bg-orange-50' : ''
                                }`}
                            value={localAttrValues?.[rowIndex]?.[attr?.ID] ?? ""}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, "");
                                handleInputChange(rowIndex, attr?.ID, value);
                            }}
                        />
                        {/* {isAutoFilledValue && (
                            <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                                <RefreshCw className="h-2.5 w-2.5" />
                                Auto
                            </div>
                        )} */}
                    </div>
                );
            case "5":
                return (
                    <div className="relative">
                        <Input
                            type="text"
                            className={`w-full text-sm input-focus-style h-auto py-1 ${isAutoFilledValue ? 'border-orange-400 bg-orange-50' : ''
                                }`}
                            value={localAttrValues?.[rowIndex]?.[attr?.ID] ?? ""}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, "");
                                handleInputChange(rowIndex, attr?.ID, value);
                            }}
                        />
                        {/* {isAutoFilledValue && (
                            <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                                <RefreshCw className="h-2.5 w-2.5" />
                                Auto
                            </div>
                        )} */}
                    </div>
                );
            case "6":
                return (
                    <div className="relative">
                        <Input
                            type="date"
                            className={`w-full text-sm input-focus-style h-auto py-1 ${isAutoFilledValue ? 'border-orange-400 bg-orange-50' : ''
                                }`}
                            value={
                                localAttrValues?.[rowIndex]?.[attr?.ID]
                                    ? format(
                                        parse(
                                            localAttrValues?.[rowIndex]?.[attr?.ID]?.split(" ")[0] ?? "",
                                            "dd/MM/yyyy",
                                            new Date()
                                        ),
                                        "yyyy-MM-dd"
                                    )
                                    : ""
                            }
                            onChange={(e) => {
                                const formattedDate = e.target.value
                                    ? format(
                                        parse(e.target.value, "yyyy-MM-dd", new Date()),
                                        "dd/MM/yyyy"
                                    )
                                    : "";
                                handleInputChange(rowIndex, attr?.ID, formattedDate);
                            }}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    // Add this function to convert formula with attribute IDs to names
    const getFormulaWithNames = (formula) => {
        if (!formula || !attributes.length) return formula;

        let formattedFormula = formula;

        // Replace all Attr_ID with Attribute Names
        attributes.forEach(attr => {
            const attrPattern = new RegExp(`Attr_${attr.ID}\\b`, 'g');
            formattedFormula = formattedFormula.replace(attrPattern, attr.Name);
        });

        return formattedFormula;
    };

    // Get the formula expression for display with names
    const getFormulaExpression = (rowIndex) => {
        if (!formulaAttribute) return "";
        const selectedId = localAttrValues?.[rowIndex]?.[formulaAttribute.ID];
        if (!selectedId) return "";
        const selectedMaster = formulaAttribute.Masters.find(
            (m) => String(m.ID) === String(selectedId)
        );
        return selectedMaster ? getFormulaWithNames(selectedMaster.Calculation_Formula) : "";
    };


    // NEW: Separate formula attribute from other attributes and reorder
    // Formula attribute should come first (right after Sr No), then other attributes
    const orderedAttributes = useMemo(() => {
        if (!formulaAttribute) {
            // If no formula attribute exists, return all attributes as-is
            return attributes;
        }

        // Filter out the formula attribute from the list
        const nonFormulaAttributes = attributes.filter(
            attr => attr.ID !== formulaAttribute.ID
        );

        // Return formula attribute first, followed by other attributes
        return [formulaAttribute, ...nonFormulaAttributes];
    }, [attributes, formulaAttribute]);

    return (
        <div className="w-full">
            {/* Desktop View */}
            <div className="hidden md:block">
                {loading ? (
                    <div className="flex justify-center items-center py-1">Loading...</div>
                ) : (
                    <>
                        <h4 className="text-base font-medium text-gray-700 mb-2">
                            Product: {product?.productname ?? "N/A"} {product.productcode && ` (${product.productcode})`}
                        </h4>

                        {/* {formulaAttribute && (
                            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-blue-800">
                                    <strong>Smart Auto-Fill:</strong> Empty fields in formulas are automatically filled with intelligent defaults -
                                    <span className="font-semibold"> 0 for +/−</span> operations,
                                    <span className="font-semibold"> 1 for ×/÷/%</span> operations.
                                    Orange highlighted fields with "Auto" badge show auto-filled values. You can edit them anytime.
                                </div>
                            </div>
                        )} */}

                        {attributes?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table className="min-w-[600px]">
                                    <TableHeader>
                                        <TableRow className="bg-[#4a5a6b] text-white hover:bg-[#4a5a6b]">
                                            {/* Action - Narrow */}
                                            <TableHead className="text-white px-2 py-1 w-[50px] min-w-[50px] text-center">
                                                <label className="text-sm font-semibold text-white">Act</label>
                                            </TableHead>
                                            {/* Sr No - Narrow */}
                                            <TableHead className="text-white px-2 py-1 w-[50px] min-w-[50px] text-center">
                                                <label className="text-sm font-semibold text-white">Sr</label>
                                            </TableHead>
                                            {/* Attributes - Flexible */}
                                            {orderedAttributes.map((attr) => (
                                                <TableHead
                                                    key={attr?.ID}
                                                    className="text-white px-2 py-1 min-w-[120px] max-w-[200px] text-left"
                                                >
                                                    <label className="text-sm font-semibold text-white truncate">
                                                        {attr?.Name ?? "Unknown"}
                                                    </label>
                                                </TableHead>
                                            ))}
                                            {/* Calculation - Narrow */}
                                            {formulaAttribute && (
                                                <TableHead className="text-white px-2 py-1 w-[100px] min-w-[100px] text-center">
                                                    <label className="text-sm font-semibold text-white">Calc</label>
                                                </TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {localAttrValues.map((row, rowIndex) => (
                                            <TableRow key={rowIndex} className="text-center hover:bg-gray-50">
                                                {/* Action */}
                                                <TableCell className="px-2 py-1 w-[50px]">
                                                    <Trash2
                                                        className={`h-7 w-7 p-1.5 rounded-full mx-auto ${localAttrValues.length === 1
                                                            ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                                                            : "text-red-500 hover:bg-red-100 cursor-pointer"
                                                            }`}
                                                        onClick={() => handleDeleteRow(rowIndex)}
                                                    />
                                                </TableCell>
                                                {/* Sr No */}
                                                <TableCell className="px-2 py-1 w-[50px] text-sm font-medium">
                                                    {rowIndex + 1}
                                                </TableCell>
                                                {/* Attributes */}
                                                {orderedAttributes.map((attr) => (
                                                    <TableCell key={attr?.ID} className="px-2 py-1 min-w-[120px] max-w-[200px]">
                                                        {renderAttributeInput(attr, rowIndex)}
                                                    </TableCell>
                                                ))}
                                                {/* Calculation Result */}
                                                {formulaAttribute && (
                                                    <TableCell className="px-2 py-1 w-[100px] text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="font-semibold text-sm text-blue-700">
                                                                {calculationResults.rowResults[rowIndex]?.toFixed(2) ?? "0.00"}
                                                            </span>
                                                            {getFormulaExpression(rowIndex) && (
                                                                <TooltipProvider>
                                                                    <Tooltip delayDuration={0}>
                                                                        <TooltipTrigger asChild>
                                                                            <Calculator className="text-purple-500 cursor-pointer h-4 w-4 flex-shrink-0" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p className="max-w-xs text-sm">{getFormulaExpression(rowIndex)}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                        {/* Sub Total Row */}
                                        {formulaAttribute && (
                                            <TableRow className="bg-gray-200 font-bold">
                                                <TableCell colSpan={orderedAttributes.length + 2} className="text-right px-2 py-1">
                                                    <span className="text-sm font-semibold">Sub Total:</span>
                                                </TableCell>
                                                <TableCell className="text-center px-2 py-1 w-[100px]">
                                                    <span className="text-base font-bold text-green-700">
                                                        {calculationResults.subTotal.toFixed(2)}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                                No attribute data available
                            </p>
                        )}

                        <div className="flex justify-between items-center py-3 gap-2">
                            {attributes?.length > 0 && (
                                <Button
                                    type="button"
                                    onClick={handleAddRow}
                                    className="bg-[#287f71] hover:bg-[#20665a] text-white text-xs px-3 py-0.5 h-7 flex items-center gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Row
                                </Button>
                            )}

                            <div className="flex gap-2 ml-auto">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    className="text-xs px-3 py-0.5 h-7"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="bg-[#287f71] hover:bg-[#20665a] text-white text-xs px-3 py-0.5 h-7"
                                    disabled={attributes?.length === 0}
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-4 text-sm text-gray-500">Loading...</div>
                ) : (
                    <>
                        <h4 className="text-sm font-medium text-gray-700">
                            Product: {product?.productname ?? "N/A"} {product.productcode && ` (${product.productcode})`}
                        </h4>

                        {attributes?.length > 0 ? (
                            localAttrValues.map((row, rowIndex) => (
                                <div
                                    key={rowIndex}
                                    className="border rounded-lg p-3 bg-white shadow-sm"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-semibold">Row {rowIndex + 1}</span>
                                        <Trash2
                                            className={`h-7 w-7 p-1.5 rounded-full ${localAttrValues.length === 1
                                                ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                                                : "text-red-500 hover:bg-red-100 cursor-pointer"
                                                }`}
                                            onClick={() => handleDeleteRow(rowIndex)}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        {orderedAttributes.map((attr) => (
                                            <div key={attr.ID} className="flex flex-col gap-1">
                                                <label className="text-xs font-medium text-gray-600">
                                                    {attr.Name}
                                                </label>
                                                {renderAttributeInput(attr, rowIndex)}
                                            </div>
                                        ))}

                                        {/* In the mobile view - Add Info icon */}
                                        {formulaAttribute && (
                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <span className="text-xs font-medium text-gray-700">Result:</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold text-blue-700">
                                                        {calculationResults.rowResults[rowIndex]?.toFixed(2) ?? "0.00"}
                                                    </span>
                                                    {getFormulaExpression(rowIndex) && (
                                                        <TooltipProvider>
                                                            <Tooltip
                                                                open={tooltipOpenIndex === rowIndex}
                                                                onOpenChange={(open) => setTooltipOpenIndex(open ? rowIndex : null)}
                                                                delayDuration={0}
                                                            >
                                                                <TooltipTrigger asChild>
                                                                    <Calculator
                                                                        className="text-purple-500 cursor-pointer h-3.5 w-3.5 flex-shrink-0"
                                                                        onClick={() => setTooltipOpenIndex(tooltipOpenIndex === rowIndex ? null : rowIndex)}
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs text-sm">{getFormulaExpression(rowIndex)}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                                No attribute data available
                            </p>
                        )}

                        {/* Mobile Buttons */}
                        <div className="flex justify-between items-center pt-3 gap-2">
                            {attributes?.length > 0 && (
                                <Button
                                    type="button"
                                    onClick={handleAddRow}
                                    className="bg-[#287f71] hover:bg-[#20665a] text-white text-xs px-3 py-0.5 h-7 flex items-center gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add Row
                                </Button>
                            )}

                            <div className="flex gap-2 ml-auto">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                    className="text-xs px-3 py-0.5 h-7"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    className="bg-[#287f71] hover:bg-[#20665a] text-white text-xs px-3 py-0.5 h-7"
                                    disabled={attributes?.length === 0}
                                >
                                    Save
                                </Button>
                            </div>
                        </div>

                        {formulaAttribute && (
                            <div className="bg-gray-100 p-3 rounded-lg text-right">
                                <span className="text-sm font-semibold">Sub Total:</span>
                                <span className="ml-2 text-base font-bold text-green-700">
                                    {calculationResults.subTotal.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductAttributesEditor;