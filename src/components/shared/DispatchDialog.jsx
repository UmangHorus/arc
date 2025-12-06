"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import OrderProcessingService from "@/lib/OrderProcessingService";
import { useLoginStore } from "@/stores/auth.store";
import { format } from "date-fns";
import { useSharedDataStore } from "@/stores/sharedData.store";

const DispatchDialog = ({
  isOpen,
  onClose,
  selectedRows,
  typeTransporter,
  selectedRoute,
  routeName,
  selectedShipThrough,
  shipThroughName,
  onDispatchSuccess,
  companyDetails,
  sodata,
  filteredSummaryData,
  filteredSoData,
}) => {
  const { token, user } = useLoginStore();
  const { routeList } = useSharedDataStore();
  const [transporterList, setTransporterList] = useState([]);
  const [dispatchDate, setDispatchDate] = useState(new Date());
  const [selectedTransporter, setSelectedTransporter] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [lrDate, setLrDate] = useState(new Date());
  const [lrAttach, setLrAttach] = useState(null);
  const [vehicleNo, setVehicleNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchingRoutes, setMatchingRoutes] = useState([]);

  // Fetch transporter list
  const { data: transporterData } = useQuery({
    queryKey: ["transporterList", token],
    queryFn: () => OrderProcessingService.getTransporterList({ token }),
    enabled: !!token && isOpen && typeTransporter === "2",
    staleTime: 5 * 60 * 1000,
  });
  const route_arr = routeList || [];

  useEffect(() => {
    if (transporterData) {
      const responseData = Array.isArray(transporterData) ? transporterData[0] : transporterData;
      if (responseData?.STATUS === "SUCCESS") {
        // Handle dynamic structure: DATA.transporter_list or DATA.transporter or DATA directly
        const data = responseData.DATA || responseData.data || {};
        const transporterDataValue = 
          data.transporter_list || 
          data.transporter || 
          (Array.isArray(data) ? data : []);
        setTransporterList(transporterDataValue);
      }
    }
  }, [transporterData]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setDispatchDate(new Date());
      setSelectedTransporter("");
      setLrNo("");
      setLrDate(new Date());
      setLrAttach(null);
      setVehicleNo("");
      setRemarks("");
    }
  }, [isOpen]);

  // Update matchingRoutes with null checks
  useEffect(() => {
    if (!route_arr || !selectedRows.length) {
      setMatchingRoutes([]);
      return;
    }
    // Filter out null/undefined shipping_area values and log invalid entries
    const uniqueArray = [
      ...new Set(
        selectedRows
          .map((row) => {
            if (row.shipping_area == null) {
              console.warn("Invalid shipping_area in row:", row);
              return null;
            }
            return row.shipping_area;
          })
          .filter((area) => area != null) // Remove null/undefined values
      ),
    ];
    if (!uniqueArray.length) {
      setMatchingRoutes([]);
      return;
    }
    const matchedRoutes = route_arr.filter((route) => {
      if (!route.area) return false;
      const routeAreas = route.area
        .split(",")
        .map((area) => area.trim().toLowerCase())
        .filter((area) => area);
      return (
        routeAreas.length === uniqueArray.length &&
        uniqueArray.every(
          (area) =>
            area &&
            typeof area === "string" && // Ensure area is a string
            routeAreas.includes(area.toLowerCase())
        ) &&
        routeAreas.every((area) =>
          uniqueArray
            .map((a) => (a && typeof a === "string" ? a.toLowerCase() : null))
            .filter((a) => a != null)
            .includes(area)
        )
      );
    });
    setMatchingRoutes(matchedRoutes);
  }, [selectedRows, route_arr]);

  const handleTransporterChange = (value) => {
    setSelectedTransporter(value || "");
    if (!value || value === "") {
      setLrNo("");
      setLrDate(new Date());
      setVehicleNo("");
    }
  };

  const handleLrAttach = (event) => {
    const file = event.target.files[0];
    setLrAttach(null);

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Invalid file type. Only JPG, JPEG, PNG, PDF, and Word documents are allowed."
      );
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("File size exceeds 2MB limit.");
      return;
    }

    setLrAttach(file);
  };

  const handleDispatch = async (e) => {
    e.preventDefault();

    if (selectedRows.length === 0) {
      toast.error("Please select at least one delivery challan for dispatch.");
      return;
    }

    if (!selectedShipThrough) {
      toast.error("Please select mode of delivery.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("shipthrough", selectedShipThrough);
      formData.append("transporter", selectedTransporter || "");
      formData.append("lr_no", lrNo || "");
      formData.append("vehicle_no", vehicleNo || "");
      formData.append("remarks", remarks || "");
      formData.append("lr_date", format(dispatchDate, "dd-MM-yy"));

      // Filter selectedRows based on filteredSummaryData or filteredSoData
      let filteredRows = selectedRows;
      if (companyDetails?.so_listing_transaction_config === "0") {
        filteredRows = selectedRows.filter((row) =>
          filteredSummaryData?.some((summary) => summary.dc_id == row.dc_id)
        );
      } else if (companyDetails?.so_listing_transaction_config === "1") {
        filteredRows = selectedRows.filter((row) =>
          filteredSoData?.some((so) => so.dc_id == row.dc_id)
        );
      }

      if (filteredRows.length === 0) {
        toast.error("No valid delivery challans found in the filtered data.");
        setIsSubmitting(false);
        return;
      }

      const routeIdValue = typeTransporter === "1" 
        ? (selectedRoute || matchingRoutes[0]?.route_id || "") 
        : "";
      formData.append("route_id", routeIdValue);

      const virtualAreas =
        filteredRows?.map((row) => row.shipping_area).filter(Boolean) || [];
      const uniqueRouteArray = [...new Set(virtualAreas)].slice().reverse();

      if (typeTransporter === "1") {
        formData.append("virtual_route", selectedRoute ? "" : JSON.stringify(uniqueRouteArray));
      } else {
        formData.append("virtual_route", "");
      }

      // Helper function to convert qty/sec_qty string to React element structure (matching old project format)
      const convertQtyToReactElement = (qtyValue) => {
        // Handle if it's already a React element or object
        if (qtyValue && typeof qtyValue === "object" && qtyValue.type) {
          return qtyValue;
        }

        // Convert string to React element structure
        const qtyString = String(qtyValue || "");
        
        if (!qtyString || qtyString.trim() === "") {
          return {
            type: "span",
            key: null,
            ref: null,
            props: {
              children: [""]
            },
            _owner: null
          };
        }

        // Split by space to separate value and unit
        // Format is like "9 BOX" or "108 Pieces"
        const trimmed = qtyString.trim();
        const spaceIndex = trimmed.indexOf(" ");
        
        let value = trimmed;
        let unit = "";
        
        if (spaceIndex > 0) {
          value = trimmed.substring(0, spaceIndex);
          unit = trimmed.substring(spaceIndex + 1).trim();
        }

        const children = [value];
        
        if (unit) {
          children.push(" ");
          children.push({
            key: null,
            ref: null,
            props: {
              children: [
                {
                  type: "br",
                  key: null,
                  ref: null,
                  props: {},
                  _owner: null
                },
                unit
              ]
            },
            _owner: null
          });
        }

        return {
          type: "span",
          key: null,
          ref: null,
          props: {
            children: children
          },
          _owner: null
        };
      };

      // Prepare dc_details with React element structure for qty and sec_qty
      if (companyDetails?.so_listing_transaction_config === "0") {
        const dcDetailsArray = sodata?.filter((soItem) =>
          filteredRows.some((row) => row.dc_id == soItem.dc_id)
        ) || [];
        
        // Convert qty and sec_qty to React element structure
        const processedDcDetails = dcDetailsArray.map((item) => ({
          ...item,
          qty: convertQtyToReactElement(item.qty),
          sec_qty: convertQtyToReactElement(item.sec_qty || "")
        }));
        
        formData.append("dc_details", JSON.stringify(processedDcDetails));
      } else if (companyDetails?.so_listing_transaction_config === "1") {
        // Convert qty and sec_qty to React element structure
        const processedFilteredRows = filteredRows.map((item) => ({
          ...item,
          qty: convertQtyToReactElement(item.qty),
          sec_qty: convertQtyToReactElement(item.sec_qty || "")
        }));
        
        formData.append("dc_details", JSON.stringify(processedFilteredRows));
      }

      if (lrAttach) {
        formData.append("lr_attach", lrAttach);
      }

      const response = await OrderProcessingService.dispatchDeliveryChallan({
        token,
        employeeId: user?.employee_id || user?.id,
        formData,
      });

      const responseData = Array.isArray(response) ? response[0] : response;

      if (responseData?.STATUS === "SUCCESS") {
        let successMessage = "";

        if (companyDetails?.so_listing_transaction_config === "0") {
          const dcNumbers = filteredRows
            .map((row) => {
              if (typeof row.dc_fullno === "object" && row.dc_fullno.props) {
                return row.dc_fullno.props.children;
              }
              return row.dc_fullno_text || row.dc_fullno || "";
            })
            .filter(Boolean)
            .join(", ");

          successMessage = `Delivery challans ${dcNumbers} dispatched successfully`;
        } else {
          const dc_fullno = responseData?.data?.[0]?.dc_no?.replace(/,$/, "");
          successMessage = dc_fullno
            ? `Delivery challan ${dc_fullno} dispatched successfully`
            : "Delivery challan(s) dispatched successfully";
        }

        toast.success(successMessage);
        onClose();
        onDispatchSuccess?.();
      } else {
        toast.error(responseData?.MSG || "Failed to dispatch delivery challan.");
      }
    } catch (error) {
      console.error("Error dispatching delivery challan:", error);
      toast.error(
        error.response?.data?.MSG ||
          "Failed to dispatch delivery challan. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-[90vw] max-w-[900px] max-h-[90vh] overflow-y-auto bg-white p-0 rounded-lg">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b relative">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-800">Dispatch Delivery Challan</DialogTitle>
          <DialogClose className="absolute right-3 sm:right-4 top-3 sm:top-4" />
        </DialogHeader>

        <form onSubmit={handleDispatch}>
          <div className="flex flex-col lg:flex-row">
            {/* Left side - Dispatch illustration - Hidden on mobile, visible on desktop */}
            <div className="hidden lg:flex w-full lg:w-1/2 p-4 sm:p-6 items-center justify-center">
              <div className="w-full max-w-xs sm:max-w-sm">
                <img
                  src="/dispatch-vector.png"
                  alt="Dispatch Illustration"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>

            {/* Right side - Form */}
            <div className="w-full lg:w-1/2 p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)] lg:max-h-none">
              {typeTransporter === "1" ? (
                <>
                  <div className="space-y-2">
                    <Label>Dispatch Date</Label>
                    <Input
                      type="date"
                      value={dispatchDate ? format(dispatchDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : new Date();
                        setDispatchDate(date);
                      }}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Route</Label>
                    <Input
                      type="text"
                      value={routeName || "V-Route"}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mode of Delivery</Label>
                    <Input
                      type="text"
                      value={shipThroughName || ""}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Transporter</Label>
                    <Select
                      value={selectedTransporter || undefined}
                      onValueChange={handleTransporterChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Transporter" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(transporterList) && transporterList.length > 0 ? (
                          transporterList.map((transporter, i) => (
                            <SelectItem
                              key={i}
                              value={transporter.contact_id?.toString()}
                            >
                              {transporter.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-transporters" disabled>
                            No transporters available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mode of Delivery</Label>
                    <Input
                      type="text"
                      value={shipThroughName || ""}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>LR No</Label>
                    <Input
                      type="text"
                      value={lrNo}
                      onChange={(e) => setLrNo(e.target.value)}
                      placeholder="LR No"
                      disabled={!selectedTransporter}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>LR Date</Label>
                    <Input
                      type="date"
                      value={lrDate ? format(lrDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : new Date();
                        setLrDate(date);
                      }}
                      className="w-full"
                      disabled={!selectedTransporter}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>LR Attach</Label>
                    <Input
                      type="file"
                      onChange={handleLrAttach}
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      className="cursor-pointer"
                    />
                    {lrAttach && (
                      <p className="text-sm text-gray-600">{lrAttach.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Vehicle No</Label>
                    <Input
                      type="text"
                      value={vehicleNo}
                      onChange={(e) => setVehicleNo(e.target.value)}
                      placeholder="Vehicle No"
                      disabled={!selectedTransporter}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 py-4 border-t px-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            >
              {isSubmitting ? "Dispatching..." : "Dispatch"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DispatchDialog;

