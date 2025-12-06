"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, parse } from "date-fns";

const ProdMultiAttrDialog = ({
  open,
  setOpen,
  product,
  index,
  formValues,
  setFormValues,
}) => {
  const [attributes, setAttributes] = useState([]);
  const [localAttrValues, setLocalAttrValues] = useState([{}]);

  useEffect(() => {
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

      // Initialize local attribute values from formValues or from Attribute_data defaults
      const productAttrKey = `${product?.productid}_${index}`;
      const existingAttrs =
        formValues?.[index]?.attribute?.[productAttrKey] ?? [];

      // Create default values for the first row
      const defaultAttrs = {};
      attrArray.forEach((attr) => {
        let defaultValue = "";
        if (existingAttrs.length > 0 && existingAttrs[0]?.[attr?.ID] !== undefined) {
          // Use existing saved value if available
          defaultValue = existingAttrs[0][attr?.ID];
        } else if (attr?.ValueID) {
          // Use ValueID as default for non-select types
          if (attr?.Type == "6") {
            // For date type, ensure proper format (e.g., "19/03/2025")
            defaultValue = attr?.ValueID?.split(" ")[0] ?? "";
          } else if (attr?.Type == "2" || attr?.Type == "3") {
            // For select types, find the matching Master ID
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

      // Initialize with existing attributes or default values
      setLocalAttrValues(
        existingAttrs.length > 0 ? existingAttrs : [defaultAttrs]
      );
    } else {
      setAttributes([]);
      setLocalAttrValues([{}]);
    }
  }, [open, product, index, formValues]);

  const handleInputChange = (rowIndex, attrId, value) => {
    setLocalAttrValues((prev) => {
      const newValues = [...prev];
      newValues[rowIndex] = {
        ...newValues[rowIndex],
        [attrId]: value,
      };
      return newValues;
    });
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
      // toast.warning("Cannot delete the last attribute row", {
      //   duration: 1000,
      // });
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

  const handleSave = () => {
    const productAttrKey = `${product?.productid}_${index}`;
    const newFormValues = [...(formValues ?? [])];
    newFormValues[index] = {
      ...newFormValues?.[index],
      attribute: {
        ...newFormValues?.[index]?.attribute,
        [productAttrKey]: localAttrValues,
      },
    };
    setFormValues(newFormValues);
    toast.success("Product attributes saved successfully", {
      duration: 1000,
    });
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const renderAttributeInput = (attr, rowIndex) => {
    switch (String(attr?.Type)) {
      case "1": // Text
        return (
          <Input
            type="text"
            className="w-auto text-sm input-focus-style"
            value={localAttrValues?.[rowIndex]?.[attr?.ID] ?? ""}
            onChange={(e) => handleInputChange(rowIndex, attr?.ID, e.target.value)}
          />
        );
      case "2": // Select (single)
      case "3": // Select (multiple, treated as single for simplicity)
        return (
          <Select
            value={localAttrValues?.[rowIndex]?.[attr?.ID] ?? ""}
            onValueChange={(value) =>
              handleInputChange(rowIndex, attr?.ID, value === "select" ? "" : value)
            }
          >
            <SelectTrigger className="w-auto text-sm input-focus-style">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="select">Select</SelectItem>
              {(attr?.Masters ?? []).map((option) => (
                <SelectItem key={option?.ID} value={option?.ID}>
                  {option?.N ?? "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "4": // Number
        return (
          <Input
            type="text"
            className="w-auto text-sm input-focus-style"
            value={localAttrValues?.[rowIndex]?.[attr?.ID] ?? ""}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, "");
              handleInputChange(rowIndex, attr?.ID, value);
            }}
          />
        );
      case "5": // Decimal
        return (
          <Input
            type="text"
            className="w-auto text-sm input-focus-style"
            value={localAttrValues?.[rowIndex]?.[attr?.ID] ?? ""}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9.]/g, "");
              handleInputChange(rowIndex, attr?.ID, value);
            }}
          />
        );
      case "6": // Date
        return (
          <Input
            type="date"
            className="w-auto text-sm input-focus-style"
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
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[1200px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle>Product Attributes</DialogTitle>
        </DialogHeader>
        <h4 className="text-base font-medium text-gray-700">
          Product: {product?.productname ?? "N/A"} (
          {product?.productcode ?? ""})
        </h4>
        {attributes?.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-[#4a5a6b] text-white hover:bg-[#4a5a6b]">
                  <TableHead className="text-white px-2 py-2">
                    <label className="text-sm font-semibold text-white">Action</label>
                  </TableHead>
                  <TableHead className="text-white px-2 py-2">
                    <label className="text-sm font-semibold text-white">Sr No</label>
                  </TableHead>
                  {attributes.map((attr) => (
                    <TableHead
                      key={attr?.ID}
                      className="text-white px-2 py-2"
                    >
                      <label className="text-sm font-semibold text-white">
                        {attr?.Name ?? "Unknown"}
                      </label>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {localAttrValues.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="text-center">
                    <TableCell className="text-left px-2 py-2">
                      <Trash2
                        className={`h-8 w-8 p-2 rounded-full ${localAttrValues.length === 1
                            ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                            : "text-red-500 hover:bg-red-100 cursor-pointer"
                          }`}
                        onClick={() => handleDeleteRow(rowIndex)}
                        disabled={localAttrValues.length === 1}
                      />
                    </TableCell>
                    <TableCell className="text-left px-2 py-2">
                      <span className="text-sm">{rowIndex + 1}</span>
                    </TableCell>
                    {attributes.map((attr) => (
                      <TableCell key={attr?.ID} className="text-left px-2 py-2">
                        {renderAttributeInput(attr, rowIndex)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm sm:text-base px-4 py-2"
                onClick={handleAddRow}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Row
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No attribute data available
          </p>
        )}
        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline" onClick={handleCancel} className="text-sm">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm"
            disabled={attributes?.length == 0}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProdMultiAttrDialog;