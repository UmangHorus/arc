"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown, AlertCircle } from "lucide-react";
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
import { useSharedDataStore } from "@/stores/sharedData.store";
import OrderProcessingService from "@/lib/OrderProcessingService";
import PaymentReceiptDialog from "@/components/shared/PaymentReceiptDialog";
import CreateDCDialog from "@/components/shared/CreateDCDialog";
import { parse, format } from "date-fns"; // Replaced moment with date-fns
import HashLoader from "react-spinners/HashLoader";

const OrderApproveTable = () => {
  const { user, token } = useLoginStore();
  const { companyBranchDivisionData } = useSharedDataStore();

  // Filter States
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("All");

  // Data States
  const [allOrders, setAllOrders] = useState([]);
  const [displayedOrders, setDisplayedOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog States
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [isDCDialogOpen, setIsDCDialogOpen] = useState(false);
  const [selectedOrderForDC, setSelectedOrderForDC] = useState(null);

  // Confirmation Dialog State
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { order, action: "Y"|"C" }

  // Table States
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const companies = companyBranchDivisionData?.companies || [];
  const branches = companyBranchDivisionData?.branches || [];

  const getStatusText = (dispatch_flg) => {
    switch (dispatch_flg) {
      case "Y": return "Accepted";
      case "C": return "Rejected";
      case "N": return "Process Pending";
      default: return "Unknown";
    }
  };

  const isFirstOccurrence = (index) => {
    const currentId = displayedOrders[index]?.salesorder_id;
    for (let i = 0; i < index; i++) {
      if (displayedOrders[i].salesorder_id == currentId) return false;
    }
    return true;
  };

  const fetchOrders = async () => {
    if (!user?.id || !token) return;
    setIsLoading(true);
    try {
      const response = await OrderProcessingService.searchSalesOrderList({
        token,
        employeeId: user.id,
        filters: {},
      });

      const responseData = Array.isArray(response) ? response[0] : response;
      if (responseData?.STATUS === "SUCCESS") {
        let ordersList = responseData.DATA?.salesorder || [];
        ordersList = ordersList.filter(
          (item) => item.status_flg === "A" || item.dispatch_flg === "C"
        );
        setAllOrders(ordersList);
        setDisplayedOrders(ordersList);
      } else {
        toast.error("Failed to load orders");
      }
    } catch {
      toast.error("Error loading orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && token && companyBranchDivisionData) {
      fetchOrders();
    }
  }, [user?.id, token, companyBranchDivisionData]);

  const handleSearch = () => {
    let result = [...allOrders];

    if (selectedStatus !== "All") {
      result = result.filter((o) => getStatusText(o.dispatch_flg) === selectedStatus);
    }
    if (selectedCompany !== "All") {
      result = result.filter((o) => o.company_id == selectedCompany);
    }
    if (selectedBranch !== "All") {
      result = result.filter((o) => o.branch_id == selectedBranch);
    }

    setDisplayedOrders(result);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    toast.success(`Found ${result.length} order(s)`);
  };

  const handleReset = () => {
    setSelectedStatus("All");
    setSelectedCompany("All");
    setSelectedBranch("All");
    setGlobalFilter("");
    fetchOrders();
    toast.success("Filters reset & data reloaded");
  };

  const processOrderMutation = useMutation({
    mutationFn: ({ salesOrderId, action }) =>
      OrderProcessingService.updateDispatchStatus({
        token,
        employeeId: user.id,
        salesOrderId,
        isDispatch: action,
      }),
    onSuccess: () => {
      toast.success("Order processed successfully");
      fetchOrders();
    },
    onError: () => toast.error("Failed to process order"),
  });

  const openConfirmDialog = (order, action) => {
    setPendingAction({ order, action });
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;

    processOrderMutation.mutate({
      salesOrderId: pendingAction.order.salesorder_id,
      action: pendingAction.action,
    });

    setConfirmDialogOpen(false);
    setPendingAction(null);
  };

  const handleDialogClose = (open) => {
    setConfirmDialogOpen(open);
    if (!open) {
      setPendingAction(null);
    }
  };

  const handlePaymentReceipt = (order) => {
    setSelectedOrderForPayment(order);
    setIsPaymentDialogOpen(true);
  };

  const handleCreateDC = (order) => {
    setSelectedOrderForDC(order);
    setIsDCDialogOpen(true);
  };

  const handleMapClick = (address) => {
    if (address)
      window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, "_blank");
  };

  const getPaymentStatusBadge = (status) => {
    const s = status?.toLowerCase();
    let backgroundColor = "";
    let textColor = "";
    let displayText = status || "-";

    if (s === "paid") {
      backgroundColor = "rgba(40, 127, 113, 0.1)";
      textColor = "#287F71";
      displayText = "Paid";
    } else if (s === "un paid") {
      backgroundColor = "rgba(236, 52, 76, 0.1)";
      textColor = "#EC344C";
      displayText = "Un Paid";
    } else if (s === "partially paid") {
      backgroundColor = "rgba(245, 148, 64, 0.1)";
      textColor = "#F59440";
      displayText = "Partially Paid";
    } else {
      backgroundColor = "rgba(156, 163, 175, 0.1)";
      textColor = "#6B7280";
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

  const getDispatchStatusBadge = (flg) => {
    const text = getStatusText(flg);
    let backgroundColor = "";
    let textColor = "";

    if (flg === "Y") {
      backgroundColor = "rgba(40, 127, 113, 0.1)";
      textColor = "#287F71";
    } else if (flg === "C") {
      backgroundColor = "rgba(236, 52, 76, 0.1)";
      textColor = "#EC344C";
    } else if (flg === "N") {
      backgroundColor = "rgba(245, 148, 64, 0.1)";
      textColor = "#F59440";
    } else {
      backgroundColor = "rgba(156, 163, 175, 0.1)";
      textColor = "#6B7280";
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
        {text}
      </Badge>
    );
  };

  const columns = useMemo(
    () => [
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const order = row.original;
          if (!isFirstOccurrence(row.index)) return <div className="h-10" />;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Action <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {order.dispatch_flg === "N" && order.status_flg === "A" && (
                  <>
                    <DropdownMenuItem onClick={() => openConfirmDialog(order, "Y")}>
                      Accept Order
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openConfirmDialog(order, "C")} className="text-red-600">
                      Reject Order
                    </DropdownMenuItem>
                  </>
                )}
                {order.dispatch_flg === "Y" && (
                  <DropdownMenuItem onClick={() => handleCreateDC(order)}>
                    Create DC
                  </DropdownMenuItem>
                )}
                {(() => {
                  const pending = parseFloat((order.pending_amount || "0").replace(/,/g, ""));
                  const showPayment = pending > 0 && Number(order.contact_type) == 1 &&
                    (order.payment_status === "Un Paid" || order.payment_status === "Partially Paid");
                  return showPayment && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handlePaymentReceipt(order)}>
                        Payment Receipt
                      </DropdownMenuItem>
                    </>
                  );
                })()}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
      { accessorKey: "dispatch_flg", header: "Status", cell: ({ row }) => getDispatchStatusBadge(row.original.dispatch_flg) },
      { accessorKey: "company_name", header: "Company" },
      { accessorKey: "branch_name", header: "Branch" },
      { accessorKey: "fullsalesorderno", header: "Order No" },
      {
        accessorKey: "salesorder_dt",
        header: "Order Date",
        cell: ({ row }) => {
          const dateStr = row.original.salesorder_dt;
          if (!dateStr || dateStr.trim() === "") return "-";
          try {
            // Parse DD/MM/YYYY format
            const parsedDate = parse(dateStr, "dd/MM/yyyy", new Date());
            return format(parsedDate, "dd/MM/yyyy");
          } catch (error) {
            return dateStr; // fallback to raw value if parsing fails
          }
        },
      },
      {
        id: "product",
        header: "Product",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-gray-500">{row.original.code}</div>
          </div>
        ),
      },
      { accessorKey: "qty", header: "Qty" },
      { accessorKey: "unit", header: "Unit" },
      { accessorKey: "contact_name", header: "Customer" },
      {
        accessorKey: "billing_area",
        header: "Area",
        cell: ({ row }) => {
          const addr = row.original.billto_address?.replace(/<br\s*\/?>/gi, " ");
          return addr ? (
            <Button variant="link" size="sm" onClick={() => handleMapClick(addr)} className="p-0">
              {row.original.billing_area}
            </Button>
          ) : row.original.billing_area || "-";
        },
      },
      { accessorKey: "billing_pincode", header: "Pincode" },
      { accessorKey: "grand_total", header: "Amount" },
      { accessorKey: "advance_received", header: "Advance" },
      {
        accessorKey: "payment_status",
        header: "Payment",
        cell: ({ row }) => getPaymentStatusBadge(row.original.payment_status),
      },
    ],
    [displayedOrders]
  );

  const table = useReactTable({
    data: displayedOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue || "").toLowerCase().trim();
      if (!search) return true;

      const o = row.original;

      const normalize = (val) => {
        if (val == null) return "";
        return String(val).replace(/,/g, "").trim().toLowerCase();
      };

      return (
        normalize(o.fullsalesorderno).includes(search) ||
        normalize(o.company_name).includes(search) ||
        normalize(o.branch_name).includes(search) ||
        normalize(o.salesorder_dt).includes(search) ||
        normalize(o.name).includes(search) ||
        normalize(o.code).includes(search) ||
        normalize(o.qty).includes(search) ||
        normalize(o.unit).includes(search) ||
        normalize(o.contact_name).includes(search) ||
        normalize(o.billing_area).includes(search) ||
        normalize(o.billing_pincode).includes(search) ||
        normalize(o.grand_total).includes(search) ||
        normalize(o.advance_received).includes(search) ||
        normalize(o.payment_status).includes(search) ||
        normalize(getStatusText(o.dispatch_flg)).includes(search)
      );
    },
    state: { sorting, columnVisibility, globalFilter, pagination },
  });

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium block mb-1">Status</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Orders</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Process Pending">Process Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Company</label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.company_id} value={c.company_id.toString()}>
                    {c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Branch</label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.branch_id} value={b.branch_id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSearch} className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white">Search</Button>
          <Button variant="outline" onClick={handleReset}>Reset & Reload</Button>
        </div>
      </div>

      {/* Global Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <Input
          placeholder="Search Order No, Amount, Customer, Product..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full sm:max-w-sm bg-[#fff]"
        />
        <div className="flex gap-3 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns().filter(col => col.getCanHide()).map(col => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={v => col.toggleVisibility(!!v)}
                >
                  {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id} className="bg-[#4a5a6b]">
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="bg-[#4a5a6b] text-white">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                    No orders found for approval
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4 pagination-responsive">
        <div className="flex flex-col md:flex-row items-center space-x-4">
          <div className="flex items-center rows-per-page-container gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={pagination.pageSize.toString()} onValueChange={v => table.setPageSize(Number(v))}>
              <SelectTrigger className="w-[70px] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 75, 100].map(size => (
                  <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length === 0
              ? "0-0 of 0"
              : `${pagination.pageIndex * pagination.pageSize + 1}-${Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} of ${table.getFilteredRowModel().rows.length} rows`}
          </div>

          <div className="flex pagination-buttons gap-2">
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>First</Button>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>Last</Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="w-[90vw] max-w-[425px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              {pendingAction?.action === "Y" ? "Accept for Dispatch" : "Reject Order"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.action === "Y"
                ? "Are you sure you want to accept this order for dispatch?"
                : "Are you sure you want to reject this order?"}
              <br />
              <strong>Order No:</strong> {pendingAction?.order?.fullsalesorderno}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={processOrderMutation.isPending}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={processOrderMutation.isPending}
              className={
                pendingAction?.action === "Y"
                  ? "px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
                  : "px-6 bg-[#EC344C] hover:bg-[#d11a32] text-white"
              }
            >
              {processOrderMutation.isPending
                ? "Processing..."
                : pendingAction?.action === "Y"
                  ? "Accept"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentReceiptDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        orderData={selectedOrderForPayment}
        pending_amount={selectedOrderForPayment?.pending_amount || 0}
        fetchOrders={fetchOrders}
      />
      <CreateDCDialog
        open={isDCDialogOpen}
        onOpenChange={setIsDCDialogOpen}
        orderData={selectedOrderForDC}
      />
    </div>
  );
};

export default OrderApproveTable;