"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { ChevronDown, ArrowUpDown, MapPin, Eye, Pencil, Download, FileText, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import QuotationDetailsDialog from "../shared/QuotationDetailsDialog";
import { QuotationService } from "@/lib/QuotationService";
import { useLoginStore } from "@/stores/auth.store";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";

const QuotationTable = () => {
  const { user, token, appConfig } = useLoginStore();
  const { templateList } =
    useSharedDataStore();
  const router = useRouter();
  const orderLabel = useLoginStore(
    (state) => state.navConfig?.labels?.orders || "Order"
  );
  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );
  const quotationLabel = useLoginStore(
    (state) => state.navConfig?.labels?.Quotation_config_name || "Quotation"
  );
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({
    id: false,
    approveReject: false, // Initialize as false, will be updated in useEffect
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(""); // State for selected template
  const [downloading, setDownloading] = useState({}); // Track downloading state per quotation
  const queryClient = useQueryClient();

  // Add these states
  const [approving, setApproving] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState({ quotationId: null, action: null });
  const [remark, setRemark] = useState("");


  const {
    data: quotationData,
    error: quotationError,
    isLoading: quotationLoading,
    refetch: refetchQuotations,
  } = useQuery({
    queryKey: ["quotations", user?.id, token],
    queryFn: () => QuotationService.getQuotation(token, user?.id), // Assuming it takes token and user.id
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
    if (quotationData) {
      const responseData = Array.isArray(quotationData) ? quotationData[0] : quotationData;
      if (responseData?.STATUS === "SUCCESS") {
        const quotationList = responseData?.DATA
          .filter((item) => item && item.quotation_id)
          .map((quotation) => ({
            id: quotation.quotation_id || "",
            fullquotationno: quotation.fullquotationno || "",
            customername: quotation.contact_name || "Unknown",
            createdate: quotation.created_dt || "",
            status_flg: quotation.status_flg || "N/A",
            location: quotation.gmapAddress || "", // Assume added in future
            gmapAddress: quotation.gmapAddress || "", // Assume added in future
            gmapurl: quotation.gmapurl || "", // Assume added in future
            customer_address: quotation.contact_address || "", // Assume added in future
            create_from: quotation.create_from || "",
            created_by: quotation.employee_name || "", // Use employee_name for display
          }));
        setData(quotationList);
      } else {
        // toast.error(responseData?.MSG || "Failed to fetch quotation data");
        console.error(responseData?.MSG || "Failed to fetch quotation data"); // Log for debugging
      }
    }
    if (quotationError) {
      // toast.error("Error fetching quotations: " + quotationError.message);
      console.error("Error fetching quotations:", quotationError.message); // Log for debugging
    }
  }, [quotationData, quotationError]);

  const handleCreateQuotation = () => {
    router.push("/quotations/create");
  };

  // Handle approve/reject action
  const handleApproveReject = (quotationId, action) => {
    setPendingAction({ quotationId, action });
    setRemark(""); // Reset remark when opening dialog
    setShowConfirmDialog(true);
  };

  // Confirm and execute the action
  const handleConfirmAction = async () => {
    const { quotationId, action } = pendingAction;

    if (!quotationId) {
      toast.error("No quotation selected for action");
      setShowConfirmDialog(false);
      return;
    }

    // Validate remark is provided
    if (!remark || remark.trim() === "") {
      toast.error("Remark is required");
      return;
    }

    setApproving(prev => ({ ...prev, [quotationId]: true }));

    try {
      // Determine status flag based on action
      const statusFlag = action == "approve" ? "A" : "R";

      const response = await QuotationService.approveRejectQuotation(
        token,
        quotationId,
        statusFlag,
        remark.trim()
      );

      // Check if response is an array and get the first element
      const responseData = Array.isArray(response) ? response[0] : response;

      if (responseData?.STATUS == "SUCCESS") {
        toast.success(`Quotation ${action == "approve" ? "approved" : "rejected"} successfully`);
        // Refetch quotations to update the list
        refetchQuotations();
      } else {
        throw new Error(responseData?.MSG || `Failed to ${action} quotation`);
      }
    } catch (error) {
      console.error(`Error ${action}ing quotation:`, error);
      toast.error(error.message || `Failed to ${action} quotation`);
    } finally {
      setApproving(prev => ({ ...prev, [quotationId]: false }));
      setShowConfirmDialog(false);
      setPendingAction({ quotationId: null, action: null });
      setRemark(""); // Reset remark after action
    }
  };


  const handleDownloadTemplate = async (quotationId) => {
    if (!selectedTemplate) {
      toast.error("Please select a template before downloading.", {
        duration: 2000,
      });
      return;
    }

    setDownloading((prev) => ({ ...prev, [quotationId]: true }));

    try {
      const response = await QuotationService.downloadTemplate(
        token,
        quotationId,
        "17",
        selectedTemplate
      );

      if (response?.STATUS !== "SUCCESS") {
        throw new Error(response?.MSG || "Failed to fetch template download path");
      }

      const { transaction_id, path } = response?.DATA || {};
      if (!path) {
        throw new Error("No download path provided in response");
      }

      // Get selected template name
      const template = templateList?.data?.["17"]?.find(
        (t) => t.id == selectedTemplate
      );
      const templateName = template?.name || "template";

      // Get full quotation number
      const quotation = data.find((q) => q.id == quotationId);
      const fullQuotationNo = quotation?.fullquotationno || transaction_id;

      // Get file extension
      const fileExtension = path.split(".").pop() || "pdf";

      // ✅ Add cache-busting query param to prevent old file caching
      const downloadUrl = `${path}?t=${Date.now()}`;

      // Fetch the file as a blob
      const fileResponse = await fetch(downloadUrl, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch the file (Status: ${fileResponse.status})`);
      }

      const blob = await fileResponse.blob();

      // Create a URL for the blob and trigger download with dynamic filename
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${templateName}_${fullQuotationNo}.${fileExtension}`;
      document.body.appendChild(link);

      // ✅ Trigger download programmatically
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.error("❌ Error downloading template:", error.message, error);
      toast.error(error.message || "Failed to download template");
    } finally {
      setDownloading((prev) => ({ ...prev, [quotationId]: false }));
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
    } else if (status == "R") {
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
        accessorKey: "fullquotationno",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            {`${quotationLabel} Number`}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("fullquotationno")}</div>
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
          <div className="capitalize text-left">{row.getValue("createdate")}</div>
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
        id: "viewQuotation",
        header: () => <div className="text-center text-white">Actions</div>,
        cell: ({ row }) => {
          const quotation = row.original;
          return (
            <div className="text-center flex justify-center gap-2">
              {/* Eye Icon Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedQuotationId(quotation.id);
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
                  router.push(`/quotations/create?quotationId=${quotation.id}`);
                }}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#F59440] bg-[rgba(40,127,113,0.06)] hover:bg-[#F59440] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
              >
                <Pencil className="h-5 w-5 text-[#F59440] group-hover:text-white cursor-pointer transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
              {/* Download Template Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadTemplate(quotation.id)}
                disabled={downloading[quotation.id]}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50"
              >
                {downloading[quotation.id] ? (
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
      {
        id: "approveReject",
        header: () => <div className="text-center text-white">Approve/Reject</div>,
        cell: ({ row }) => {
          const quotation = row.original;
          const status = quotation.status_flg;

          // Check if should show approve/reject icons
          const shouldShowIcons =
            appConfig?.user_role?.so?.canApproveSO == 1 &&
            user?.isEmployee &&
            status != "A" &&
            status != "R";

          if (!shouldShowIcons) {
            return <div className="text-center">-</div>;
          }

          return (
            <div className="text-center flex justify-center gap-2">
              {/* Approve Icon Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApproveReject(quotation.id, "approve")}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
                title="Approve Quotation"
              >
                <CheckCircle className="h-5 w-5 text-[#287F71] group-hover:text-white cursor-pointer transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
              {/* Reject Icon Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApproveReject(quotation.id, "reject")}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#ED1515] bg-[rgba(237,21,21,0.10)] hover:bg-[#ED1515] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
                title="Reject Quotation"
              >
                <XCircle className="h-5 w-5 text-[#ED1515] group-hover:text-white cursor-pointer transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
            </div>
          );
        },
        enableHiding: appConfig?.user_role?.so?.canApproveSO == 1 && user?.isEmployee,
      },
      {
        id: "createOrder",
        header: () => <div className="text-center text-white">Create SO</div>,
        cell: ({ row }) => {
          const quotation = row.original;
          const status = quotation.status_flg;
          
          // Only show button if status is "A" (Approved)
          if (status != "A") {
            return <div className="text-center">-</div>;
          }

          return (
            <div className="text-center flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(`/orders/create?quotationId=${quotation.id}`);
                }}
                className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white hover:text-white"
                title="Create Sales Order from Quotation"
              >
                Create SO
              </Button>
            </div>
          );
        },
        enableHiding: false,
      },
      // New Approve/Reject Column
     
    ],
    [selectedTemplate, downloading, setSelectedQuotationId, setDialogOpen, router, quotationLabel, contactLabel, handleDownloadTemplate, appConfig, user, handleApproveReject]
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
        row.getValue("fullquotationno")?.toLowerCase().includes(search) ||
        row.getValue("createdate")?.toLowerCase().includes(search) ||
        row.getValue("customername")?.toLowerCase().includes(search) ||
        (row.getValue("status_flg") === "A"
          ? "Approved"
          : row.getValue("status_flg") === "R"
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
      `${quotationLabel} Number`,
      "Create Date", // Will show as "27/06/2025 03:25 pm"
      `${contactLabel} Name`,
      "Created By",
      "Status", // Will show human-readable status
      "Source", // Will show human-readable source
    ];

    const csvData = data.map((quotation) => {
      const escapeCsv = (str) => {
        if (!str) return "";
        return `"${String(str).replace(/"/g, '""')}"`;
      };

      // Status display logic
      const displayStatus =
        quotation.status_flg == "A"
          ? "Approved"
          : quotation.status_flg == "R"
            ? "Rejected"
            : quotation.status_flg == "P"
              ? "Pending"
              : "N/A";

      // Source display logic
      const displaySource =
        quotation.create_from === "OE" || quotation.create_from === "officeexpre"
          ? "Office Express"
          : quotation.create_from === "NP"
            ? "E-Commerce"
            : quotation.create_from === "" ||
              quotation.create_from === null ||
              (quotation.create_from && quotation.create_from.includes("salesorder_"))
              ? "H-Office"
              : quotation.create_from || "N/A";

      return [
        escapeCsv(quotation.customer_address),
        escapeCsv(quotation.location),
        escapeCsv(quotation.fullquotationno),
        escapeCsv(quotation.createdate), // Keep original date format
        escapeCsv(quotation.customername),
        escapeCsv(quotation.created_by),
        escapeCsv(displayStatus), // Use formatted status
        escapeCsv(displaySource), // Use formatted source
      ];
    });

    const csvContent =
      BOM +
      [headers.join(","), ...csvData.map((row) => row.join(","))].join("\r\n");

    // Download with current date in filename
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `quotations_report_${dateStr}.csv`);
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
        {/* Search and Template Selection Section */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Input
            placeholder={`Search ${quotationLabel}`}
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
              {templateList?.data?.["17"]?.map((template) => (
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
              onClick={handleCreateQuotation}
              className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            >
              {`Create ${quotationLabel}`}
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
            {quotationLoading ? (
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
      {selectedQuotationId && (
        <QuotationDetailsDialog
          quotationId={selectedQuotationId} // Changed prop name assuming the dialog expects quotationId
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
              Are you sure you want to {pendingAction.action} this quotation?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="remark" className="text-sm font-medium text-gray-700">
              Remark <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={`Enter remark for ${pendingAction.action === "approve" ? "approval" : "rejection"}...`}
              className="mt-2 min-h-[100px]"
              disabled={approving[pendingAction.quotationId]}
            />
          </div>
          <DialogFooter className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setRemark("");
              }}
              disabled={approving[pendingAction.quotationId]}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              Cancel
            </Button>
            <Button
              className={
                pendingAction.action === "approve"
                  ? "px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
                  : "px-6 bg-[#EC344C] hover:bg-[#d11a32] text-white"
              }
              onClick={handleConfirmAction}
              disabled={approving[pendingAction.quotationId] || !remark.trim()}
            >
              {approving[pendingAction.quotationId] ? (
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

export default QuotationTable;