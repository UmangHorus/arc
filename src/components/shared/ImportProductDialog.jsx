"use client";
import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, FileIcon, Download } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import ProductService from "@/lib/ProductService";
import * as XLSX from "xlsx";
import api from "@/lib/api/axios";

const ImportProductDialog = ({ open, onOpenChange, onSuccess }) => {
    const { token } = useLoginStore();
    const [isSaving, setIsSaving] = useState(false);
    const [jsonData, setJsonData] = useState([]);
    const [fileName, setFileName] = useState("");

    const allowedFileTypes = [
        "application/vnd.ms-excel",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    const handleDrop = (event) => {
        event.preventDefault();
        const droppedFiles = Array.from(event.dataTransfer.files);
        if (droppedFiles.length > 0) {
            handleFileProcessing(droppedFiles[0]);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        handleFileProcessing(file);
    };

    const handleFileProcessing = (file) => {
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("File size must be less than 2MB");
            return;
        }

        if (!allowedFileTypes.includes(file.type)) {
            toast.error("Invalid file type. Only XLS/CSV/XLSX allowed");
            return;
        }

        setFileName(file.name);
        parseExcel(file);
    };

    const parseExcel = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const parsedData = XLSX.utils.sheet_to_json(sheet);
                setJsonData(parsedData);
                toast.success(`Parsed ${parsedData.length} records successfully`);
            } catch (error) {
                console.error("Error parsing excel:", error);
                toast.error("Failed to parse Excel file");
                setJsonData([]);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleUpload = async () => {
        if (jsonData.length === 0) {
            toast.error("No data to upload. Please select a valid file.");
            return;
        }

        setIsSaving(true);
        const formData = new FormData();
        formData.append("importData", JSON.stringify(jsonData));

        try {
            const response = await ProductService.saveImportProducts(token, formData);
            const responseData = Array.isArray(response) ? response[0] : response;

            if (responseData?.STATUS === "SUCCESS") {
                toast.success(responseData.MSG || "Products imported successfully");
                onOpenChange(false);
                if (onSuccess) onSuccess();
                setJsonData([]);
                setFileName("");
            } else {
                toast.error(responseData?.MSG || "Failed to import products");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Error uploading products");
        } finally {
            setIsSaving(false);
        }
    };

    const downloadSampleUrl = `${api.defaults.baseURL}/public/images/product-import-sheet.xls`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Import New Product</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="flex justify-end">
                        <a
                            href={downloadSampleUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#562A75] hover:underline text-sm flex items-center gap-1"
                        >
                            <Download className="h-4 w-4" /> Sample File Download
                        </a>
                    </div>

                    <div className="space-y-2">
                        <Label>Upload File</Label>
                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-[#562A75]/10 flex items-center justify-center">
                                    <Upload className="h-6 w-6 text-[#562A75]" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        <label htmlFor="file-upload" className="cursor-pointer text-[#562A75] hover:underline">
                                            Click Here
                                        </label>{" "}
                                        To Upload Your File Or Drag.
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Allow only XLS/CSV files. Max file size is 2MB.
                                    </p>
                                </div>
                                <Input
                                    id="file-upload"
                                    type="file"
                                    accept=".xls,.csv,.xlsx"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                        {fileName && (
                            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                                <FileIcon className="h-4 w-4" />
                                <span>{fileName}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                        Note: H-office CRM import wizard accepts data in particular format only. If you don't know particular format then please download file H-Office Products Import Sample File, and use it for your import wizard.
                    </div>

                    {jsonData.length > 0 && (
                        <div className="space-y-2">
                            <Label>Preview (First 5 rows)</Label>
                            <div className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
                                <pre>{JSON.stringify(jsonData.slice(0, 5), null, 2)}</pre>
                            </div>
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
                            type="button"
                            onClick={handleUpload}
                            disabled={isSaving || jsonData.length === 0}
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
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ImportProductDialog;
