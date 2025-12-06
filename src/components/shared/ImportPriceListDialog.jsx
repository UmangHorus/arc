"use client";
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import ProductService from "@/lib/ProductService";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const ImportPriceListDialog = ({ open, onOpenChange, onSuccess }) => {
    const { user, token } = useLoginStore();
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [priceLists, setPriceLists] = useState([]);
    const [jsonData, setJsonData] = useState([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorsAttr, setErrorsAttr] = useState([]);

    const {
        register,
        control,
        handleSubmit,
        setError,
        clearErrors,
        setValue,
        reset,
        formState: { errors },
    } = useForm();

    // Fetch Categories
    const getCategoryWithSubCategory = async () => {
        try {
            const response = await ProductService.getCategoryWithSubCategory(token);
            const data = Array.isArray(response) ? response[0] : response;
            if (data?.STATUS === "SUCCESS") {
                setCategories(data.DATA || []);
            } else {
                setCategories([]);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
            setCategories([]);
        }
    };

    // Fetch Price Lists
    const getPriceList = async () => {
        try {
            const response = await ProductService.getProductPriceList(token);
            const data = Array.isArray(response) ? response[0] : response;
            if (data?.STATUS === "SUCCESS") {
                setPriceLists(data.DATA || []);
            } else {
                setPriceLists([]);
            }
        } catch (error) {
            console.error("Error fetching price lists:", error);
            setPriceLists([]);
        }
    };

    useEffect(() => {
        if (open) {
            getCategoryWithSubCategory();
            getPriceList();
        } else {
            reset();
            setSelectedCategories([]);
            setExpandedCategories([]);
            setSelectAll(false);
            setJsonData([]);
            setErrorsAttr([]);
        }
    }, [open, token, reset]);

    const handleFileChange = (event) => {
        const file = event.target.files[0];

        if (!file) {
            event.target.value = "";
            return;
        }

        const allowedTypes = [
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
            "application/vnd.ms-excel.sheet.macroEnabled.12",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError("photo", {
                type: "manual",
                message: "Invalid file type. Only .xls, .csv, .xlsx are allowed.",
            });
            event.target.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError("photo", {
                type: "manual",
                message: "File size must be less than 2MB.",
            });
            event.target.value = "";
            return;
        }

        clearErrors("photo");
        parseExcel(file);
    };

    const parseExcel = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array", cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const parsedData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            // Attribute validation logic
            const attributeSheets = workbook.SheetNames.filter((name) =>
                name.match(/^\(\d+\)\s*.+$/)
            );
            const validAttributeIds = {};

            attributeSheets.forEach((attrSheetName) => {
                const attrSheet = workbook.Sheets[attrSheetName];
                const attrData = XLSX.utils.sheet_to_json(attrSheet, { defval: "" });
                const validIds = attrData
                    .map((row) => row.ID)
                    .filter((id) => id !== "" && id !== undefined && id !== null);
                validAttributeIds[attrSheetName] = new Set(validIds);
            });

            const errors = [];
            const transformedData = parsedData.map((row, index) => {
                const attributes = {};
                const nonAttributeFields = {};

                Object.entries(row).forEach(([key, value]) => {
                    let formattedValue = value;
                    if (formattedValue instanceof Date) {
                        formattedValue = format(formattedValue, "dd-MM-yyyy");
                    }

                    const match = key.match(/^\((\d+)\)\s*(.+)$/);
                    if (match && formattedValue !== "") {
                        const attrId = match[1];
                        const attrName = match[2].trim();
                        const attrSheetName = `(${attrId}) ${attrName}`;

                        if (
                            validAttributeIds[attrSheetName] &&
                            !validAttributeIds[attrSheetName].has(formattedValue)
                        ) {
                            errors.push({
                                row: index + 2,
                                productCode: row["Product Code"] || "N/A",
                                attribute: attrName,
                                value: formattedValue,
                            });
                        }
                        attributes[attrId] = formattedValue;
                    } else if (!match) {
                        nonAttributeFields[key] = formattedValue;
                    }
                });

                return {
                    ...nonAttributeFields,
                    ...(Object.keys(attributes).length > 0 ? { attr: attributes } : {}),
                };
            });

            if (errors.length > 0) {
                setErrorsAttr(errors);
                toast.error(`Found ${errors.length} validation errors in the file.`);
            } else {
                setErrorsAttr([]);
                setJsonData(transformedData);
                toast.success("File parsed successfully!");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Category Selection Logic
    const toggleCategoryExpand = (id) => {
        setExpandedCategories((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const getDescendantIds = (item) => {
        let ids = [];
        if (item.subCategory_data?.length > 0) {
            item.subCategory_data.forEach((sub) => {
                ids.push(sub.subCategory_id);
                ids = ids.concat(getDescendantIds(sub));
            });
        }
        if (item.nestedSubCategories?.length > 0) {
            item.nestedSubCategories.forEach((nested) => {
                ids.push(nested.subCategory_id);
                ids = ids.concat(getDescendantIds(nested));
            });
        }
        return ids;
    };

    const handleCategorySelection = (id, isMain = false, item = null) => {
        const isSelected = selectedCategories.includes(id);
        let idsToToggle = [id];

        if (item) {
            const descendants = getDescendantIds(item);
            idsToToggle = [...idsToToggle, ...descendants];
        }

        if (isSelected) {
            setSelectedCategories((prev) => prev.filter((catId) => !idsToToggle.includes(catId)));
            setExpandedCategories((prev) => prev.filter((catId) => !idsToToggle.includes(catId)));
        } else {
            setSelectedCategories((prev) => [...prev, ...idsToToggle]);
        }
    };

    const handleSelectAllChange = () => {
        if (selectAll) {
            setSelectedCategories([]);
            setExpandedCategories([]);
            setSelectAll(false);
        } else {
            const allIds = [];
            const collectIds = (items) => {
                items.forEach(item => {
                    allIds.push(item.category_id || item.subCategory_id);
                    if (item.subCategory_data) collectIds(item.subCategory_data);
                    if (item.nestedSubCategories) collectIds(item.nestedSubCategories);
                });
            };
            collectIds(categories);
            setSelectedCategories(allIds);
            setSelectAll(true);
        }
    };

    const renderSubCategories = (subCategories) => {
        return (
            <div className="ml-4 border-l pl-2">
                {subCategories.map((sub) => (
                    <div key={sub.subCategory_id} className="py-1">
                        <div className="flex items-center gap-2">
                            {(sub.nestedSubCategories && sub.nestedSubCategories.length > 0) ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleCategoryExpand(sub.subCategory_id);
                                    }}
                                    className="p-0.5 hover:bg-gray-100 rounded"
                                >
                                    {expandedCategories.includes(sub.subCategory_id) ? (
                                        <ChevronDown className="h-3 w-3" />
                                    ) : (
                                        <ChevronRight className="h-3 w-3" />
                                    )}
                                </button>
                            ) : <div className="w-4" />}

                            <Checkbox
                                id={`sub-${sub.subCategory_id}`}
                                checked={selectedCategories.includes(sub.subCategory_id)}
                                onCheckedChange={() => handleCategorySelection(sub.subCategory_id, false, sub)}
                            />
                            <Label htmlFor={`sub-${sub.subCategory_id}`} className="cursor-pointer text-sm">
                                {sub.subCategory_name}
                            </Label>
                        </div>
                        {expandedCategories.includes(sub.subCategory_id) &&
                            sub.nestedSubCategories &&
                            renderSubCategories(sub.nestedSubCategories)}
                    </div>
                ))}
            </div>
        );
    };

    const downloadProductExcel = async () => {
        setIsDownloading(true);
        try {
            const formData = new FormData();
            const categoryString = selectedCategories.join(",");
            formData.append("category", selectAll ? "Y" : categoryString);

            const response = await ProductService.downloadProductExcel(token, formData);
            const data = Array.isArray(response) ? response[0] : response;

            if (data?.STATUS === "SUCCESS" && data?.DATA?.download_url) {
                const link = document.createElement("a");
                link.href = data.DATA.download_url;
                link.setAttribute("download", "");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                setSelectedCategories([]);
                setExpandedCategories([]);
                setSelectAll(false);
                toast.success("File downloaded successfully");
            } else {
                toast.error(data?.MESSAGE || "Failed to download file");
            }
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Error downloading file");
        } finally {
            setIsDownloading(false);
        }
    };

    const onSubmit = async (data) => {
        setIsSaving(true);
        const formData = new FormData();

        if (user?.employeeid) formData.append("created_by", user.employeeid);
        if (user?.company_id) formData.append("company_id", user.company_id);

        if (data?.priceList) {
            formData.append("pricelist_id", data.priceList);
        }
        if (data?.startDate) {
            formData.append("effective_from_dt", format(new Date(data.startDate), "dd/MM/yyyy"));
        }
        if (data?.endDate) {
            formData.append("effective_to_dt", format(new Date(data.endDate), "dd/MM/yyyy"));
        }
        if (Array.isArray(jsonData) && jsonData.length > 0) {
            formData.append("importData", JSON.stringify(jsonData));
        }

        try {
            const response = await ProductService.saveImportProductsPriceList(token, formData);
            const responseData = Array.isArray(response) ? response[0] : response;

            if (responseData?.STATUS === "SUCCESS") {
                toast.success("Products price list saved successfully!");
                setValue("startDate", "");
                setValue("endDate", "");
                setJsonData([]);
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error(responseData?.MSG || "Failed to save price list.");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("An unexpected error occurred while saving the price list.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import Price List</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Category Selection */}
                    <div className="space-y-2">
                        <Label>Select Categories List</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    {selectedCategories.length > 0
                                        ? `${selectedCategories.length} selected`
                                        : "Select Category"}
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-2" align="start">
                                <div className="max-h-[300px] overflow-y-auto space-y-2">
                                    <div className="flex items-center gap-2 pb-2 border-b">
                                        <Checkbox
                                            id="select-all"
                                            checked={selectAll}
                                            onCheckedChange={handleSelectAllChange}
                                        />
                                        <Label htmlFor="select-all" className="cursor-pointer font-bold">Select All</Label>
                                    </div>
                                    {categories.map((cat) => (
                                        <div key={cat.category_id} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                {(cat.subCategory_data && cat.subCategory_data.length > 0) ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            toggleCategoryExpand(cat.category_id);
                                                        }}
                                                        className="p-0.5 hover:bg-gray-100 rounded"
                                                    >
                                                        {expandedCategories.includes(cat.category_id) ? (
                                                            <ChevronDown className="h-3 w-3" />
                                                        ) : (
                                                            <ChevronRight className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                ) : <div className="w-4" />}

                                                <Checkbox
                                                    id={`cat-${cat.category_id}`}
                                                    checked={selectedCategories.includes(cat.category_id)}
                                                    onCheckedChange={() => handleCategorySelection(cat.category_id, true, cat)}
                                                />
                                                <Label htmlFor={`cat-${cat.category_id}`} className="cursor-pointer font-medium">
                                                    {cat.category_name}
                                                </Label>
                                            </div>
                                            {expandedCategories.includes(cat.category_id) &&
                                                cat.subCategory_data &&
                                                renderSubCategories(cat.subCategory_data)}
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Download Button */}
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            onClick={downloadProductExcel}
                            disabled={selectedCategories.length === 0 || isDownloading}
                            className="bg-[#562A75] hover:bg-[#452060] text-white"
                        >
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isDownloading ? "Downloading..." : "Download Sample Import File"}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Effective From Date */}
                        <div className="space-y-2">
                            <Label>Effective From Date <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                {...register("startDate", { required: "Start Date is required" })}
                                className={errors.startDate ? "border-red-500" : ""}
                            />
                            {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
                        </div>

                        {/* Effective End Date */}
                        <div className="space-y-2">
                            <Label>Effective End Date <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                {...register("endDate", { required: "End Date is required" })}
                                className={errors.endDate ? "border-red-500" : ""}
                            />
                            {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
                        </div>
                    </div>

                    {/* Price List Selection */}
                    <div className="space-y-2">
                        <Label>Select Price List <span className="text-red-500">*</span></Label>
                        <Controller
                            name="priceList"
                            control={control}
                            rules={{ required: "Price List is required" }}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className={errors.priceList ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Select Price List" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priceLists.map((list) => (
                                            <SelectItem key={list.pricelist_id} value={list.pricelist_id.toString()}>
                                                {list.pricelist_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.priceList && <p className="text-xs text-red-500">{errors.priceList.message}</p>}
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                        <Label>Select Template File <span className="text-red-500">*</span></Label>
                        <Input
                            type="file"
                            accept=".xls,.csv,.xlsx"
                            {...register("photo", { required: "Template File is required" })}
                            onChange={handleFileChange}
                            className={errors.photo ? "border-red-500" : ""}
                        />
                        {errors.photo && <p className="text-xs text-red-500">{errors.photo.message}</p>}
                    </div>

                    {/* Validation Errors Display */}
                    {errorsAttr.length > 0 && (
                        <div className="bg-red-50 p-3 rounded border border-red-200 max-h-40 overflow-y-auto">
                            <h4 className="text-sm font-bold text-red-700 mb-2">Validation Errors:</h4>
                            <ul className="list-disc pl-5 text-xs text-red-600 space-y-1">
                                {errorsAttr.map((err, idx) => (
                                    <li key={idx}>
                                        Row {err.row}: Product Code <strong>{err.productCode}</strong> -
                                        Attribute <strong>{err.attribute}</strong> has invalid value <strong>{err.value}</strong>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                            className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving || errorsAttr.length > 0}
                            className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ImportPriceListDialog;
