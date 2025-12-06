"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ArrowUpDown,
  MapPin,
  Eye,
  Pencil,
  CalendarCheck,
  Ruler,
} from "lucide-react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ContactService } from "@/lib/ContactService";
import { leadService } from "@/lib/leadService";
import { useLoginStore } from "@/stores/auth.store";
import { Badge } from "@/components/ui/badge";
import LeadDetailsDialog from "../shared/LeadDetailsDialog";
import { useRouter } from "next/navigation";
import LeadFollowupForm from "../forms/LeadFollowupForm";
import useLocationPermission from "@/hooks/useLocationPermission";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@radix-ui/react-label";

const LeadTable = () => {
  const { user, token, location, navConfig, appConfig } = useLoginStore();

  const { permissions = {}, labels = {} } = navConfig;

  // Permission checks
  const isEmployee = user?.isEmployee;

  const canManageMeasurements = () => {
    if (appConfig?.isadmin == 1) return true;
    return isEmployee;
  };
  const router = useRouter();
  const leadLabel = useLoginStore(
    (state) => state.navConfig?.labels?.leads || "Lead"
  );
  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );
  const checkAndRequestLocation = useLocationPermission();
  const [data, setData] = useState([]);
  const [visitorFound, setVisitorFound] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({ id: false });
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [disabledVisitIn, setDisabledVisitIn] = useState(false);
  const [disabledVisitOut, setDisabledVisitOut] = useState(false);
  const [isFollowupDialogOpen, setIsFollowupDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isVisitOutDialogOpen, setIsVisitOutDialogOpen] = useState(false);
  const [visitOutLead, setVisitOutLead] = useState(null);
  const [visitOutAction, setVisitOutAction] = useState("");
  const [processingStates, setProcessingStates] = useState({}); // Track processing per lead.id
  // Add this useEffect to check if visitor exists in contact list
  const [showVisitorMessage, setShowVisitorMessage] = useState(false);
  const [matchedVisitor, setMatchedVisitor] = useState(null);
  const queryClient = useQueryClient();

  // Check export permissions
  const canExport =
    appConfig?.user_role?.lead?.canExportReport == 1 &&
    appConfig?.user_role?.lead?.canExportToCSVLead == 1;

  const mapStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "Completed";
      case "pending":
        return "Pending";
      case "cancelled":
        return "Cancelled";
      default:
        return status || "Unknown";
    }
  };

  const {
    data: leadData,
    error: leadError,
    isLoading: leadLoading,
    refetch: refetchLeads,
  } = useQuery({
    queryKey: ["leadPastOrders", user?.id, token],
    queryFn: () => leadService.getLeadPastOrders(token, user?.id, user?.type),
    enabled: !!token && !!user?.id,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (leadData) {
      const responseData = Array.isArray(leadData) ? leadData[0] : leadData;
      if (responseData?.STATUS == "SUCCESS") {
        const leadList = responseData?.DATA?.lead_orders
          .filter((item) => item && item.order_no)
          .map((order) => {
            // Check if this lead has an active visitor
            const isVisitorOut =
              responseData?.DATA?.visitor_found[0]?.reference_id == order.order_no &&
              responseData?.DATA?.visitor_found[0]?.reference_type == "7"; // Direct comparison with "7"

            return {
              id: order.order_no || "",
              leadno: order.fullorder_no || `${order.order_no}`,
              customername: order.reference_name_optional || "Unknown",
              lead_title: order.lead_title || "",
              createdate: order.lead_dt || "",
              visitStatus: isVisitorOut ? "out" : null,
              leadstatus: mapStatus(order.status),
              location: order.gmapAddress,
              gmapAddress: order.gmapAddress,
              gmapurl: order.gmapurl,
              ev_id: order.ev_id || null,
              customer_address: order.reference_address || "",
              created_by: order.created_by || "",
              company_id: order?.company_id || "",
              // No contact_type needed for leads as it's always "7"
            };
          });

        setVisitorFound(responseData?.DATA?.visitor_found || []);
        setData(leadList);

        // Set visitor message visibility
        const visitorFound = responseData?.DATA?.visitor_found || [];
        if (visitorFound?.length > 0 && leadList?.length > 0 && visitorFound[0]) {
          const visitor = visitorFound[0];

          const foundLead = leadList.find(
            (item) =>
              item.id == visitor?.reference_id &&
              visitor?.reference_type == "7" // Direct comparison with "7"
          );
          setShowVisitorMessage(!!foundLead);
        } else {
          setShowVisitorMessage(false);
        }
      } else {
        console.error(responseData?.MSG || "Failed to fetch lead orders");
      }
    }
    if (leadError) {
      console.error("Error fetching leads:", leadError.message);
    }
  }, [leadData]);

  // Effect to find matched visitor
  useEffect(() => {
    if (visitorFound.length > 0) {
      const visitor = visitorFound[0];

      // For leads, reference_type should always be "7"
      if (visitor.reference_type == "7") {
        const found = data.find(
          (item) => item.id == visitor.reference_id
        );
        setMatchedVisitor(found);
      }
    }
  }, [visitorFound, data]);

  const handleCreateLead = () => {
    router.push("/leads/create");
  };

  const handleAddMeasurement = (id, company_id) => {
    const queryParams = new URLSearchParams({
      lead_id: id,
      ev_id: visitorFound[0]?.ev_id || "",
      // company_id: company_id || "",
    });
    router.push(`/measurements/add?${queryParams.toString()}`);
  };

  const handleVisitIn = async (lead, action) => {
    setProcessingStates((prev) => ({ ...prev, [lead.leadno]: "in" }));
    setDisabledVisitIn(true);
    try {
      if (!user?.id || !user?.type) {
        toast.error("User information is missing.");
        return;
      }

      const leadType = "7"; // Lead type is always "7"
      const response = await ContactService.employeeVisitorInOut(
        token,
        action,
        user.id,
        lead.id,
        leadType
      );

      const result = response[0] || {};
      if (result.STATUS == "SUCCESS") {
        await refetchLeads();
        toast.success("Visit In recorded successfully.", {
          duration: 2000,
        });
      } else {
        toast.error(result.MSG || "Failed to record Visit In.");
      }
    } catch (error) {
      console.error(
        "Error recording Visit In:",
        error.message,
        error.response?.data
      );
      toast.error("An error occurred while recording Visit In.");
    } finally {
      setProcessingStates((prev) => {
        const newStates = { ...prev };
        delete newStates[lead.leadno];
        return newStates;
      });
      setDisabledVisitIn(false);
    }
  };

  const handleVisitOut = async (lead, action) => {
    setProcessingStates((prev) => ({ ...prev, [lead.leadno]: "out" }));
    setDisabledVisitOut(true);
    try {
      if (!user?.id || !user?.type) {
        toast.error("User information is missing.");
        return;
      }

      if (!visitorFound[0]?.ev_id) {
        toast.error("No active visitor ID found.");
        return;
      }

      if (permissions.showMeasurements && canManageMeasurements()) {
        setVisitOutLead({ id: lead.leadno, name: lead.customername, company_id: lead.company_id });
        setIsVisitOutDialogOpen(true);
      } else {
        setSelectedLead({
          id: lead.leadno,
        });
        setIsFollowupDialogOpen(true);
      }
    } catch (error) {
      console.error(
        "Error preparing Visit Out:",
        error.message,
        error.response?.data
      );
      toast.error("An error occurred while preparing Visit Out.");
    } finally {
      setProcessingStates((prev) => {
        const newStates = { ...prev };
        delete newStates[lead.leadno];
        return newStates;
      });
      setDisabledVisitOut(false);
    }
  };

  const handleVisitOutAction = () => {
    if (!visitOutLead) return;
    const { id, name, company_id } = visitOutLead;
    switch (visitOutAction) {
      case "followup":
        setSelectedLead({ id, name });
        setIsFollowupDialogOpen(true);
        break;
      case "measurement":
        handleAddMeasurement(id, company_id);
        break;
      default:
        toast.error("Please select an action.");
        return;
    }
    setIsVisitOutDialogOpen(false);
    setVisitOutAction("");
    setVisitOutLead(null);
  };

  const handleFollowupSubmit = async (followupData) => {
    try {
      // await checkAndRequestLocation("followup submission");

      const followupResponse = await leadService.saveLeadFollowup(
        token,
        followupData.leadId,
        user.id,
        followupData.outcomeId,
        followupData.followupTypeId,
        followupData.description,
        followupData.followupDate,
        followupData.nextActionDate,
        followupData.singleFile,
        location
      );

      const followupResult = followupResponse[0] || {};
      if (followupResult.STATUS === "SUCCESS") {
        const leadType = "7";
        const visitorResponse = await ContactService.employeeVisitorInOut(
          token,
          "out",
          user.id,
          followupData.leadId,
          leadType,
          visitorFound[0].ev_id
        );

        const visitorResult = visitorResponse[0] || {};
        if (visitorResult.STATUS === "SUCCESS") {
          await refetchLeads();
          toast.success("Followup and Visit Out recorded successfully.", {
            duration: 2000,
          });
          setIsFollowupDialogOpen(false);
          setSelectedLead(null);
        } else {
          toast.error(visitorResult.MSG || "Failed to record Visit Out.");
        }
      } else {
        toast.error(followupResult.MSG || "Failed to save followup.");
      }
    } catch (error) {
      console.error(
        "Error processing followup and visit out:",
        error.message,
        error.response?.data
      );
      toast.error(error.message, {
        position: "top-right",
        duration: 3000,
      });
    }
  };

  // Helper function for Lead Status Badge
  const getLeadStatusBadge = (status) => {
    const displayText = status || "-";
    const backgroundColor = "rgba(39, 134, 241, 0.10)";
    const textColor = "#4A5A6B";
    
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
      ...(!user?.isEmployee
        ? []
        : [
          {
            id: "visit",
            header: () => <div className="text-center text-white">Visit</div>,
            cell: ({ row }) => {
              const lead = row.original || {};

              // For leads, contact type is always "7"
              const mappedContactType = "7";

              // Check if there's an active visitor AND if it matches this lead
              const hasActiveVisitor = showVisitorMessage;
              const isCurrentLeadVisitor =
                hasActiveVisitor &&
                lead.id == visitorFound[0]?.reference_id &&
                mappedContactType == visitorFound[0]?.reference_type;

              // Disable Visit In if there's an active visitor that's NOT this lead
              const shouldDisableVisitIn = hasActiveVisitor && !isCurrentLeadVisitor;
              const isProcessingIn = processingStates[lead.leadno] == "in";
              const isProcessingOut = processingStates[lead.leadno] == "out";

              if (lead.visitStatus == "out") {
                return (
                  <div className="text-center">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 mx-auto w-full px-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVisitOut(lead, "out");
                      }}
                      disabled={disabledVisitOut || shouldDisableVisitIn}
                    >
                      {isProcessingOut ? "Visiting..." : "Visit Out"}
                    </Button>
                  </div>
                );
              }

              return (
                <div className="text-center">
                  <Button
                    variant="default"
                    size="sm"
                    className={`mx-auto text-white w-full px-1 ${lead.ev_id
                      ? "bg-[#4a5a6b] hover:bg-[#5c6b7a]"
                      : "bg-[#287f71] hover:bg-[#20665a]"
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVisitIn(lead, "in");
                    }}
                    disabled={disabledVisitIn || shouldDisableVisitIn}
                  >
                    {isProcessingIn ? "Visiting..." : "Visit In"}
                  </Button>
                </div>
              );
            },
            enableHiding: false,
          }
        ]),
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
                  className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#2786F1] bg-[#D4E7FC] hover:bg-[#2786F1] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50"
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
        accessorKey: "leadno",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            {`${leadLabel} No`}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="capitalize text-left">{row.getValue("leadno")}</div>
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
            Created At
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
        accessorKey: "lead_title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            {`${leadLabel} Title`}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("lead_title")}</div>
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
        accessorKey: "leadstatus",
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
          const status = row.getValue("leadstatus");
          return (
            <div className="text-center">
              {getLeadStatusBadge(status)}
            </div>
          );
        },
      },
      {
        id: "viewLead",
        header: () => <div className="text-center text-white">Actions</div>,
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="text-center flex justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedLeadId(lead.leadno);
                  setDialogOpen(true);
                }}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
              >
                <Eye className="h-5 w-5 text-[#287F71] group-hover:text-white cursor-pointer transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
            </div>
          );
        },
        enableHiding: false,
      },
    ],
    [visitorFound, user?.isEmployee, disabledVisitIn, disabledVisitOut]
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
        row.getValue("leadno")?.toLowerCase().includes(search) ||
        row.getValue("createdate")?.toLowerCase().includes(search) ||
        row.getValue("customername")?.toLowerCase().includes(search) ||
        row.getValue("lead_title")?.toLowerCase().includes(search) ||
        row.getValue("leadstatus")?.toLowerCase().includes(search) ||
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

  const handleExportCSV = () => {
    // Excel-compatible CSV format with BOM for UTF-8
    const BOM = "\uFEFF";
    const headers = [
      `${contactLabel} Address`,
      "Created Address",
      `${leadLabel} Number`,
      "Create Date",
      `${leadLabel} Title`,
      "Customer Name",
      "Created By",
      "Status",
    ];

    const csvData = data.map((lead) => {
      const escapeCsv = (str) => {
        if (!str) return "";
        return `"${String(str).replace(/"/g, '""')}"`;
      };

      return [
        escapeCsv(lead.customer_address),
        escapeCsv(lead.location),
        escapeCsv(lead.leadno),
        escapeCsv(lead.createdate),
        escapeCsv(lead.lead_title),
        escapeCsv(lead.customername),
        escapeCsv(lead.created_by),
        escapeCsv(lead.leadstatus),
      ];
    });

    const csvContent =
      BOM +
      [headers.join(","), ...csvData.map((row) => row.join(","))].join("\r\n");

    // Download with current date in filename
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `${leadLabel}_report_${dateStr}.csv`);
  };

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
      {showVisitorMessage && visitorFound.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500">
          <p className="font-bold text-yellow-700">
            Visit status: <span className="">Pending check-out</span> for{" "}
            <span className="underline">
              {`${leadLabel} No`}: {visitorFound[0].reference_id}
              {/* {matchedVisitor && ` - ${matchedVisitor.customername}`} */}
            </span>
          </p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Input
            placeholder={`Search ${leadLabel}...`}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full sm:max-w-sm bg-[#fff]"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
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

          <div className="flex gap-3 w-full sm:w-auto">
            {canExport && (
              <Button
                onClick={handleExportCSV}
                className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white"
              >
                Export CSV
              </Button>
            )}
            <Button
              onClick={handleCreateLead}
              className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            >
              Create {leadLabel}
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
            {leadLoading ? (
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
        <div className="flex flex-col md:flex-row items-center space-x-4">
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
      {selectedLeadId && (
        <LeadDetailsDialog
          leadId={selectedLeadId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
      {selectedLead && (
        <LeadFollowupForm
          isOpen={isFollowupDialogOpen}
          onClose={() => {
            setIsFollowupDialogOpen(false);
            setSelectedLead(null);
          }}
          onFollowupSubmit={handleFollowupSubmit}
          lead={selectedLead}
        />
      )}
      <Dialog
        open={isVisitOutDialogOpen}
        onOpenChange={setIsVisitOutDialogOpen}
      >
        <DialogContent className="w-[90vw] max-w-[425px] md:w-full max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle>Select Post Visit Action</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <RadioGroup
              value={visitOutAction}
              onValueChange={setVisitOutAction}
              className="grid gap-4 py-4"
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem
                  value="followup"
                  id="followup"
                  className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71] h-5 w-5"
                />
                <Label
                  htmlFor="followup"
                  className="flex items-center gap-2 font-normal cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-[#287f71]/10 text-[#287f71]">
                    <CalendarCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Add {`${leadLabel}`} Followup</p>
                    <p className="text-sm text-muted-foreground">
                      Schedule a future follow-up
                    </p>
                  </div>
                </Label>
              </div>
              {permissions.showMeasurements && canManageMeasurements() && <div className="flex items-center space-x-3">
                <RadioGroupItem
                  value="measurement"
                  id="measurement"
                  className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71] h-5 w-5"
                />
                <Label
                  htmlFor="measurement"
                  className="flex items-center gap-2 font-normal cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-[#287f71]/10 text-[#287f71]">
                    <Ruler className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Add Measurement</p>
                    <p className="text-sm text-muted-foreground">
                      Record a new measurement
                    </p>
                  </div>
                </Label>
              </div>}
            </RadioGroup>
          </div>
          <DialogFooter className="flex justify-end gap-4 flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsVisitOutDialogOpen(false);
                setVisitOutAction("");
                setVisitOutLead(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm sm:text-base"
              disabled={!visitOutAction}
              onClick={handleVisitOutAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadTable;
