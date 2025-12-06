"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ArrowUpDown, MapPin, Eye, Pencil, Download, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useLoginStore } from "@/stores/auth.store";
import { Badge } from "@/components/ui/badge";
import OrderDetailsDialog from "../shared/OrderDetailsDialog";
import { useRouter } from "next/navigation";
import OrderService from "@/lib/OrderService";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { QuotationService } from "@/lib/QuotationService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OrderTable = () => {
  const { user, token, appConfig } = useLoginStore();
  const router = useRouter();
  const orderLabel = useLoginStore(
    (state) => state.navConfig?.labels?.orders || "Order"
  );
  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );
  const { templateList } =
    useSharedDataStore();
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({
    approveReject: false, // Initialize as false, will be updated in useEffect
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(""); // State for selected template
  const [downloading, setDownloading] = useState({}); // Track downloading state per quotation
  const queryClient = useQueryClient();

  // Add these states
  const [approving, setApproving] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState({ orderId: null, action: null });

  const {
    data: orderData,
    error: orderError,
    isLoading: orderLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["orderPastOrders", user?.id, token],
    queryFn: () => OrderService.getLeadPastOrders(token, user?.id, user?.type),
    enabled: !!token && !!user?.id,
    refetchOnMount: "always",
  });

  // Update column visibility when appConfig or user changes
  useEffect(() => {
    const canSeeApproveReject =
      appConfig?.user_role?.so?.canApproveSO == 1 && user?.isEmployee;

    setColumnVisibility((prev) => ({
      ...prev,
      approveReject: canSeeApproveReject,
    }));
  }, [appConfig, user]);

  useEffect(() => {
    if (orderData) {
      const responseData = Array.isArray(orderData) ? orderData[0] : orderData;
      if (responseData?.STATUS === "SUCCESS") {
        const orderList = responseData?.DATA?.lead_orders
          .filter((item) => item && item.order_no)
          .map((order) => ({
            id: order.order_no || "",
            fullorder_no: order.fullorder_no || `${order.order_no}`,
            customername: order.reference_name_optional || "Unknown",
            createdate: order.lead_dt || "",
            status_flg: order.status_flg || "N/A",
            location: order.gmapAddress,
            gmapAddress: order.gmapAddress,
            gmapurl: order.gmapurl,
            customer_address: order.reference_address || "",
            create_from: order.create_from || "", // Add create_from to data mapping
            created_by: order.created_by || "",
          }));
        setData(orderList);
      } else {
        // toast.error(responseData?.MSG || "Failed to fetch order data");
        console.error(responseData?.MSG || "Failed to fetch order data"); // Log for debugging
      }
    }
    if (orderError) {
      // toast.error("Error fetching orders: " + orderError.message);
      console.error("Error fetching orders:", orderError.message); // Log for debugging
    }
  }, [orderData, orderError]);

  const handleCreateOrder = () => {
    router.push("/orders/create");
  };

  const handleDownloadTemplate = async (orderId) => {
    if (!selectedTemplate) {
      toast.error("Please select a template before downloading.", {
        duration: 2000,
      });
      return;
    }

    setDownloading((prev) => ({ ...prev, [orderId]: true }));

    try {
      const response = await QuotationService.downloadTemplate(
        token,
        orderId,
        "21", // For Orders
        selectedTemplate
      );

      if (response?.STATUS !== "SUCCESS") {
        throw new Error(response?.MSG || "Failed to fetch template download path");
      }

      const { transaction_id, path } = response?.DATA || {};
      if (!path) {
        throw new Error("No download path provided in response");
      }

      // ✅ Get the selected template name
      const template = templateList?.data?.["21"]?.find(
        (t) => t.id == selectedTemplate
      );
      const templateName = template?.name || "template";

      // ✅ Get the full order number
      const order = data.find((o) => o.id == orderId);
      const fullOrderNo = order?.fullorder_no || transaction_id;

      // ✅ Get file extension safely
      const fileExtension = path.split(".").pop() || "pdf";


      // ✅ Add cache-busting query param to prevent stale downloads
      const downloadUrl = `${path}?t=${Date.now()}`;

      // ✅ Fetch file fresh (no caching)
      const fileResponse = await fetch(downloadUrl, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });


      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file (Status: ${fileResponse.status})`);
      }

      const blob = await fileResponse.blob();

      // ✅ Create a URL for the blob and trigger download dynamically
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${templateName}_${fullOrderNo}.${fileExtension}`;
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // ✅ Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.error("❌ Error downloading template:", error.message, error);
      toast.error(error.message || "Failed to download template");
    } finally {
      setDownloading((prev) => ({ ...prev, [orderId]: false }));
    }
  };


  // Handle approve/reject action
  const handleApproveReject = (orderId, action) => {
    setPendingAction({ orderId, action });
    setShowConfirmDialog(true);
  };

  // Confirm and execute the action
  const handleConfirmAction = async () => {
    const { orderId, action } = pendingAction;

    if (!orderId) {
      toast.error("No order selected for action");
      setShowConfirmDialog(false);
      return;
    }

    setApproving(prev => ({ ...prev, [orderId]: true }));

    try {
      // Determine status flag based on action
      const statusFlag = action == "approve" ? "A" : "R";

      const response = await OrderService.approveRejectOrder(
        token,
        orderId,
        statusFlag
      );

      // Check if response is an array and get the first element
      const responseData = Array.isArray(response) ? response[0] : response;

      if (responseData?.STATUS == "SUCCESS") {
        toast.success(`Order ${action == "approve" ? "approved" : "rejected"} successfully`);
        // Refetch orders to update the list
        refetchOrders();
      } else {
        throw new Error(responseData?.MSG || `Failed to ${action} order`);
      }
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      toast.error(error.message || `Failed to ${action} order`);
    } finally {
      setApproving(prev => ({ ...prev, [orderId]: false }));
      setShowConfirmDialog(false);
      setPendingAction({ orderId: null, action: null });
    }
  };

  // Helper function for Status Badge
  const getStatusBadge = (status) => {
    let backgroundColor = "";
    let textColor = "";
    let displayText = "N/A";
    
    if (status == "A") {
      backgroundColor = "rgba(40, 127, 113, 0.1)";
      textColor = "#287F71";
      displayText = "Approved";
    } else if (status == "C") {
      backgroundColor = "rgba(236, 52, 76, 0.1)";
      textColor = "#EC344C";
      displayText = "Rejected";
    } else if (status == "P") {
      backgroundColor = "rgba(245, 148, 64, 0.1)";
      textColor = "#F59440";
      displayText = "Pending";
    } else {
      backgroundColor = "rgba(156, 163, 175, 0.1)";
      textColor = "#6B7280";
      displayText = "N/A";
    }
    
    return (
      <Badge 
        style={{ 
          backgroundColor: backgroundColor,
          color: textColor,
        }}
        className="rounded-full px-3 py-1 inline-flex items-center gap-1.5 font-medium text-sm border-none text-center shadow-none"
      >
        <span 
          style={{
            backgroundColor: textColor,
          }}
          className="w-1.5 h-1.5 rounded-full inline-block"
        />
        {displayText}
      </Badge>
    );
  };

  const columns = useMemo(
    () => [
      {
        accessorFn: (row) => ({
          CustomerAddress: row.customer_address,
          CreatedAddress: row.location,
        }),
        id: "location",
        header: () => <div className="text-center text-white">Location</div>,
        cell: ({ row }) => {
          const { CustomerAddress, CreatedAddress } = row.getValue("location");
          const isCustomerAddressDisabled =
            !CustomerAddress || CustomerAddress.trim() === "";
          const isCreatedAddressDisabled =
            !CreatedAddress || CreatedAddress.trim() === "";

          return (
            <div className="flex items-center justify-center gap-2">
              {isCustomerAddressDisabled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={true}
                  title="No contact address available"
                  className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-gray-400 bg-gray-100 cursor-not-allowed flex items-center justify-center opacity-50"
                >
                  <MapPin className="h-4 w-4 text-gray-400" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  title={`Contact Address: ${CustomerAddress}`}
                  className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#2786F1] bg-[#D4E7FC] hover:bg-[#2786F1] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
                >
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      CustomerAddress
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="h-4 w-4 text-[#2786F1] group-hover:text-white transition-all duration-300 ease-in-out group-hover:scale-110" />
                  </a>
                </Button>
              )}
              {isCreatedAddressDisabled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={true}
                  title="No followup address available"
                  className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-gray-400 bg-gray-100 cursor-not-allowed flex items-center justify-center opacity-50"
                >
                  <MapPin className="h-4 w-4 text-gray-400" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  title={`Created Address: ${CreatedAddress}`}
                  className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
                >
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      CreatedAddress
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MapPin className="h-4 w-4 text-[#287F71] group-hover:text-white transition-all duration-300 ease-in-out group-hover:scale-110" />
                  </a>
                </Button>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "fullorder_no",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            {`${orderLabel} Number`}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("fullorder_no")}</div>
        ),
      },
      {
        accessorKey: "createdate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Created Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="capitalize text-left">
            {row.getValue("createdate")}
          </div>
        ),
      },
      {
        accessorKey: "customername",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            {`${contactLabel} Name`}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("customername")}</div>
        ),
      },
      {
        accessorKey: "created_by",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Created By
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("created_by")}</div>
        ),
      },
      {
        accessorKey: "status_flg",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-center w-full justify-center text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = row.getValue("status_flg");
          return (
            <div className="text-center">
              {getStatusBadge(status)}
            </div>
          );
        },
      },
      {
        accessorKey: "create_from",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-center w-full justify-center text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Source
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const createFrom = row.getValue("create_from");
          let displaySource;
          if (createFrom === "OE" || createFrom === "officeexpre") {
            displaySource = "Office Express";
          } else if (createFrom === "NP") {
            displaySource = "E-Commerce";
          } else if (
            createFrom === "" ||
            createFrom === null ||
            createFrom.includes("salesorder_")
          ) {
            displaySource = "H-Office";
          } else {
            displaySource = createFrom || "N/A";
          }
          return <div className="text-center">{displaySource}</div>;
        },
      },
      {
        id: "viewOrder",
        header: () => <div className="text-center text-white">Actions</div>,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="text-center flex justify-center gap-2">
              {/* Eye Icon Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setDialogOpen(true);
                }}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
              >
                <Eye className="h-5 w-5 text-[#287F71] group-hover:text-white cursor-pointer transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
              {/* Pencil Icon Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  router.push(`/orders/create?orderId=${order.id}`);
                }}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#F59440] bg-[rgba(40,127,113,0.06)] hover:bg-[#F59440] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
              >
                <Pencil className="h-5 w-5 text-[#F59440] group-hover:text-white cursor-pointer transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
              {/* Download Template Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadTemplate(order.id)}
                disabled={downloading[order.id]}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50"
              >
                {downloading[order.id] ? (
                  <span className="animate-spin inline-block h-5 w-5 border-2 border-t-transparent border-[#287F71] group-hover:border-white rounded-full transition-colors duration-300"></span>
                ) : (
                  <Download className="h-5 w-5 text-[#287F71] group-hover:text-white cursor-pointer transition-all duration-300 ease-in-out group-hover:scale-110" />
                )}
              </Button>
            </div>
          );
        },
        enableHiding: false,
      },
      // New Approve/Reject Column
      {
        id: "approveReject",
        header: () => <div className="text-center text-white">Approve/Reject</div>,
        cell: ({ row }) => {
          const order = row.original;
          const status = order.status_flg;

          // Check if should show approve/reject icons
          const shouldShowIcons =
            appConfig?.user_role?.so?.canApproveSO == 1 &&
            user?.isEmployee &&
            status != "A" &&
            status != "C";

          if (!shouldShowIcons) {
            return <div className="text-center">-</div>;
          }

          return (
            <div className="text-center flex justify-center gap-2">
              {/* Approve Icon Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApproveReject(order.id, "approve")}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
                title="Approve Order"
              >
                <CheckCircle className="h-5 w-5 text-[#287F71] group-hover:text-white cursor-pointer transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
              {/* Reject Icon Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApproveReject(order.id, "reject")}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#ED1515] bg-[rgba(237,21,21,0.10)] hover:bg-[#ED1515] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
                title="Reject Order"
              >
                <XCircle className="h-5 w-5 text-[#ED1515] group-hover:text-white cursor-pointer transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
            </div>
          );
        },
        enableHiding:  appConfig?.user_role?.so?.canApproveSO == 1 && user?.isEmployee,
      },
    ],
    [selectedTemplate, downloading, setSelectedOrderId, setDialogOpen, router, orderLabel, contactLabel, handleDownloadTemplate]
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return (
        row.getValue("fullorder_no")?.toLowerCase().includes(search) ||
        row.getValue("createdate")?.toLowerCase().includes(search) ||
        row.getValue("customername")?.toLowerCase().includes(search) ||
        (row.getValue("status_flg") === "A"
          ? "Approved"
          : row.getValue("status_flg") === "C"
            ? "Rejected"
            : row.getValue("status_flg") === "P"
              ? "Pending"
              : "N/A"
        )
          .toLowerCase()
          .includes(search) ||
        (row.getValue("create_from") === "OE" ||
          row.getValue("create_from") === "officeexpre"
          ? "Office Express"
          : row.getValue("create_from") === "NP"
            ? "E-Commerce"
            : row.getValue("create_from") === "" ||
              row.getValue("create_from") === null ||
              row.getValue("create_from").includes("salesorder_")
              ? "H-Office"
              : row.getValue("create_from") || "N/A"
        )
          .toLowerCase()
          .includes(search) ||
        row.getValue("created_by")?.toLowerCase().includes(search)
      );
    },
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        const newPagination =
          typeof updater === "function" ? updater(prev) : updater;
        return {
          ...prev,
          ...newPagination,
          pageIndex:
            newPagination.pageSize !== prev.pageSize
              ? 0
              : newPagination.pageIndex,
        };
      });
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
  });

  // CSV Export function
  const handleExportCSV = () => {
    // Excel-compatible CSV format with BOM for UTF-8
    const BOM = "\uFEFF";
    const headers = [
      `${contactLabel} Address`,
      "Created Address",
      "Order Number",
      "Create Date", // Will show as "27/06/2025 03:25 pm"
      `${contactLabel} Name`,
      "Created By",
      "Status", // Will show human-readable status
      "Source", // Will show human-readable source
    ];

    const csvData = data.map((order) => {
      const escapeCsv = (str) => {
        if (!str) return "";
        return `"${String(str).replace(/"/g, '""')}"`;
      };

      // Status display logic
      const displayStatus =
        order.status_flg == "A"
          ? "Approved"
          : order.status_flg == "C"
            ? "Rejected"
            : order.status_flg == "P"
              ? "Pending"
              : "N/A";

      // Source display logic
      const displaySource =
        order.create_from === "OE" || order.create_from === "officeexpre"
          ? "Office Express"
          : order.create_from === "NP"
            ? "E-Commerce"
            : order.create_from === "" ||
              order.create_from === null ||
              (order.create_from && order.create_from.includes("salesorder_"))
              ? "H-Office"
              : order.create_from || "N/A";

      return [
        escapeCsv(order.customer_address),
        escapeCsv(order.location),
        escapeCsv(order.fullorder_no),
        escapeCsv(order.createdate), // Keep original date format
        escapeCsv(order.customername),
        escapeCsv(order.created_by),
        escapeCsv(displayStatus), // Use formatted status
        escapeCsv(displaySource), // Use formatted source
      ];
    });

    const csvContent =
      BOM +
      [headers.join(","), ...csvData.map((row) => row.join(","))].join("\r\n");

    // Download with current date in filename
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `orders_report_${dateStr}.csv`);
  };

  // Helper function for download (unchanged)
  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-4">
        {/* Search Section */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Input
            placeholder={`Search ${orderLabel}...`}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full sm:max-w-sm bg-[#fff]"
          />

          <Select
            value={selectedTemplate}
            onValueChange={setSelectedTemplate}
            disabled={templateList?.isLoading || !templateList?.data?.["17"]?.length}
          >
            <SelectTrigger className="w-full sm:max-w-[200px] bg-white">
              <SelectValue placeholder={templateList?.isLoading ? "Loading templates..." : "Select Printing Template"} />
            </SelectTrigger>
            <SelectContent>
              {templateList?.data?.["21"]?.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons Section */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
          {/* Columns Visibility Dropdown */}
          <div className="flex justify-end w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Export and Create Buttons */}
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              onClick={handleExportCSV}
              className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white"
              disabled={data.length === 0}
            >
              Export CSV
            </Button>
            <Button
              onClick={handleCreateOrder}
              className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            >
              Create {orderLabel}
            </Button>
          </div>
        </div>
      </div>
      <div>
        <Table className="min-w-full listing-tables">
          <TableHeader className="text-left">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-[#4a5a6b] text-white text-center"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="bg-white text-center">
            {orderLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-10 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-left">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-10 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4 pagination-responsive">
        <div className="flex flex-col md:flex-row items-center space-x-4 ">
          <div className="flex items-center rows-per-page-container gap-2">
            <span className="text-sm text-muted-foreground">
              Rows per page:
            </span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="w-[70px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 75, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* <div className="text-sm text-muted-foreground">
            {pagination.pageIndex * pagination.pageSize + 1}-
            {Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              data.length
            )}{" "}
            of {data.length} rows
          </div> */}
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length === 0
              ? "0-0 of 0 rows"
              : `${pagination.pageIndex * pagination.pageSize + 1}-${Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} of ${table.getFilteredRowModel().rows.length} rows`}
          </div>
          <div className="flex pagination-buttons gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              Last
            </Button>
          </div>
        </div>
      </div>
      {selectedOrderId && (
        <OrderDetailsDialog
          salesorderId={selectedOrderId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="w-[90vw] max-w-[425px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>
              Confirm {pendingAction.action === "approve" ? "Approve" : "Reject"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {pendingAction.action} this order?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={approving[pendingAction.orderId]}
            >
              Cancel
            </Button>
            <Button
              className={
                pendingAction.action === "approve"
                  ? "bg-[#287F71] hover:bg-[#1a5c4d] text-white"
                  : "bg-[#ec344c] hover:bg-[#d11a32] text-white"
              }
              onClick={handleConfirmAction}
              disabled={approving[pendingAction.orderId]}
            >
              {approving[pendingAction.orderId] ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-2 border-t-transparent border-white rounded-full mr-2"></span>
                  {pendingAction.action === "approve" ? "Approving..." : "Rejecting..."}
                </>
              ) : (
                `Yes, ${pendingAction.action === "approve" ? "Approve" : "Reject"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderTable;