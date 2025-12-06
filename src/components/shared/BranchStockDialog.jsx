"use client";
import React, { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useLoginStore } from "@/stores/auth.store";
import OrderProcessingService from "@/lib/OrderProcessingService";

const BranchStockDialog = ({
  open,
  onOpenChange,
  product = null,
  salesOrder = null,
  onSave = () => { },
}) => {
  const { token } = useLoginStore();
  const [branchwiseStocks, setBranchwiseStocks] = useState([]);
  const [selectedProdConversionFlg, setSelectedProdConversionFlg] = useState("");
  const [selectedProdStockUnits, setSelectedProdStockUnits] = useState({
    primaryUnit: "",
    secondaryUnit: "",
  });

  // Initialize stock data when dialog opens
  useEffect(() => {
    if (open && product) {
      setBranchwiseStocks(product.branchwise_stock || []);
      setSelectedProdConversionFlg(product.conversion_flg || "");
      setSelectedProdStockUnits({
        primaryUnit:
          product.conversion_flg == "1" || product.conversion_flg == "2"
            ? product.primary_unit_name || product.unit_name
            : product.unit_name,
        secondaryUnit: product.secondary_unit_name || product.secondary_unit || "",
      });
    }
  }, [open, product]);

  // Update product quantity
  const updateProductQty = (branchId, input_qty) => {
    const branch = branchwiseStocks.find((br) => br.branch_id == branchId);

    const rawStock =
      selectedProdConversionFlg == "2"
        ? parseFloat(branch?.actual_sec_currenct_stock || 0)
        : parseFloat(branch?.current_stock || 0);

    const stockToUse = rawStock;

    if (branch && !isNaN(input_qty) && input_qty <= stockToUse) {
      setBranchwiseStocks((prevStocks) => {
        const updatedBranchwiseStock = prevStocks.map((branch) => {
          if (branch.branch_id == branchId) {
            return {
              ...branch,
              qty: input_qty,
            };
          }
          return branch;
        });

        // Calculate main_qty
        const usedQuantity = parseFloat(product.usedquantity) || 0;
        let main_qty;
        if (product.conversion_flg == "2") {
          const secQtyTotal = parseFloat(product.SecQtyTotal) || 0;
          const secondaryBaseQty = parseFloat(product.secondary_base_qty) || 1;
          main_qty = secQtyTotal - usedQuantity * secondaryBaseQty;
        } else {
          const soQuantity = parseFloat(product.soquantity) || 0;
          main_qty = soQuantity - usedQuantity;
        }

        // Calculate branchWiseQtySum
        const branchWiseQtySum = updatedBranchwiseStock.reduce((sum, branch) => {
          const qty = parseFloat(branch.qty) || 0;
          return sum + qty;
        }, 0);

        // Compare values
        if (branchWiseQtySum <= main_qty) {
          return updatedBranchwiseStock;
        } else {
          toast.error(
            `Error: Quantity (${branchWiseQtySum}) cannot exceed available order quantity (Order Qty - Used Qty = ${main_qty}).`
          );
          return prevStocks;
        }
      });
    } else {
      const unitName =
        selectedProdConversionFlg == "2"
          ? selectedProdStockUnits.secondaryUnit
          : selectedProdStockUnits.primaryUnit;
      toast.error(
        `Error: Entered Quantity (${input_qty}) cannot exceed available stock (${stockToUse} ${unitName}).`
      );
    }
  };

  // Handle save
  const handleSave = () => {
    const branchWiseQtySum = branchwiseStocks.reduce((sum, branch) => {
      const qty = parseFloat(branch.qty) || 0;
      return sum + qty;
    }, 0);

    if (branchWiseQtySum <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    // Pass the updated product back to parent
    onSave({
      ...product,
      quantity: branchWiseQtySum,
      branchwise_stock: branchwiseStocks,
    });
    onOpenChange(false);
    toast.success("Quantity updated successfully");
  };

  // Handle cancel
  const handleCancel = () => {
    setBranchwiseStocks(product?.branchwise_stock || []);
    onOpenChange(false);
  };

  // Filter branches with stock
  const branchesWithStock = branchwiseStocks.filter((br) => {
    if (selectedProdConversionFlg == "2") {
      return parseInt(br.actual_sec_currenct_stock || 0) > 0;
    } else {
      return parseInt(br.current_stock || 0) > 0;
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto bg-white p-0 rounded-lg">
        <DialogHeader className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Add branch wise stock ({product?.product_name || "Product"})
          </DialogTitle>
          <DialogClose className="absolute right-3 sm:right-4 top-3 sm:top-4" />
        </DialogHeader>

        <div className="p-6">
          {/* Stock Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sr No</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Branch Name</TableHead>
                  <TableHead
                    style={
                      selectedProdConversionFlg == "2"
                        ? { backgroundColor: "#ced4da", color: "#fff" }
                        : {}
                    }
                  >
                    Primary Qty Stock
                  </TableHead>
                  <TableHead
                    style={
                      selectedProdConversionFlg == "1" ||
                        !selectedProdConversionFlg
                        ? { backgroundColor: "#ced4da", color: "#fff" }
                        : {}
                    }
                  >
                    Secondary Qty Stock
                  </TableHead>
                  <TableHead>Order Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchesWithStock.length > 0 ? (
                  branchesWithStock.map((br, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{salesOrder?.company_name || ""}</TableCell>
                      <TableCell>{br.branch_name}</TableCell>
                      <TableCell
                        style={
                          selectedProdConversionFlg == "2"
                            ? { backgroundColor: "#ced4da", color: "#fff" }
                            : {}
                        }
                      >
                        {br.current_stock}
                        {selectedProdStockUnits.primaryUnit &&
                          ` (${selectedProdStockUnits.primaryUnit})`}
                      </TableCell>
                      <TableCell
                        style={
                          selectedProdConversionFlg == "1" ||
                            !selectedProdConversionFlg
                            ? { backgroundColor: "#ced4da", color: "#fff" }
                            : {}
                        }
                      >
                        {br.sec_currenct_stock || br.actual_sec_currenct_stock || "0"}
                        {selectedProdStockUnits.secondaryUnit &&
                          ` (${selectedProdStockUnits.secondaryUnit})`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="text"
                            value={br.qty ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              const regex = /^\d*$/;
                              if (regex.test(value) || value === "") {
                                updateProductQty(br.branch_id, value);
                              }
                            }}
                            className="w-16 h-8 text-center text-sm"
                            placeholder="Qty"
                          />
                          <span className="text-sm text-gray-600">
                            {selectedProdConversionFlg == "2"
                              ? selectedProdStockUnits.secondaryUnit
                              : selectedProdStockUnits.primaryUnit}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Stock Not Found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BranchStockDialog;
