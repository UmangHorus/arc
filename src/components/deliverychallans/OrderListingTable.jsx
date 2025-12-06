"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ArrowUpDown, Download } from "lucide-react";
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
import OrderEditDialog from "@/components/deliverychallans/OrderEditDialog";
import HashLoader from "react-spinners/HashLoader";

// date-fns imports - replaced moment
import { parse, format, isWithinInterval, startOfDay, endOfDay, isValid } from "date-fns";

const OrderListingTable = () => {
  const { user, token } = useLoginStore();
  const { companyBranchDivisionData } = useSharedDataStore();

  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [selectedCreator, setSelectedCreator] = useState("all");
  const [scheduleFrom, setScheduleFrom] = useState("");
  const [scheduleTo, setScheduleTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [allOrders, setAllOrders] = useState([]);
  const [displayedOrders, setDisplayedOrders] = useState([]);
  const [selectedSalesOrderIds, setSelectedSalesOrderIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const companies = companyBranchDivisionData?.companies || [];
  const branches = companyBranchDivisionData?.branches || [];
  const divisions = companyBranchDivisionData?.division || [];
  const employees = companyBranchDivisionData?.employee || [];

  const parseCompanyIds = (str) =>
    !str ? [] : str.split(",").map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id));

  const filteredEmployees = useMemo(() => {
    if (selectedCompany === "all") return employees;
    const companyId = parseInt(selectedCompany, 10);
    return employees.filter((emp) => parseCompanyIds(emp.company_ids).includes(companyId));
  }, [employees, selectedCompany]);

  useEffect(() => {
    if (selectedCreator !== "all" && !filteredEmployees.some((e) => e.employee_id == selectedCreator)) {
      setSelectedCreator("all");
    }
  }, [selectedCreator, filteredEmployees]);

  useEffect(() => {
    if (user?.id && token && companyBranchDivisionData) {
      fetchAllOrders();
    }
  }, [user?.id, token, companyBranchDivisionData]);

  const fetchAllOrders = async () => {
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
        ordersList = ordersList
          .filter((item) => item.status_flg !== "C" && item.dispatch_flg !== "C")
          .filter((item) => !(item.status_flg === "A" || item.dispatch_flg === "C"));

        setAllOrders(ordersList);
        setDisplayedOrders(ordersList);
      } else {
        toast.error(responseData?.MSG || "Failed to load orders", { duration: 2000 });
      }
    } catch (error) {
      toast.error("Error loading orders: " + error.message, { duration: 2000 });
    } finally {
      setIsLoading(false);
    }
  };

  const refetchWithCurrentFilters = async () => {
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
        ordersList = ordersList
          .filter((item) => item.status_flg !== "C" && item.dispatch_flg !== "C")
          .filter((item) => !(item.status_flg === "A" || item.dispatch_flg === "C"));

        let filtered = [...ordersList];

        if (selectedCompany !== "all") filtered = filtered.filter(o => o.company_id == selectedCompany);
        if (selectedBranch !== "all") filtered = filtered.filter(o => o.branch_id == selectedBranch);
        if (selectedDivision !== "all") filtered = filtered.filter(o => o.division_id == selectedDivision);
        if (selectedCreator !== "all") filtered = filtered.filter(o => o.created_by_id == selectedCreator);

        // Date filtering using date-fns
        if (scheduleFrom || scheduleTo) {
          filtered = filtered.filter((order) => {
            if (!order.delivery_dt) return false;

            const [d, m, y] = order.delivery_dt.split("/");
            const orderDate = parse(`${y}-${m}-${d}`, "yyyy-MM-dd", new Date());

            if (!isValid(orderDate)) return false;

            const fromDate = scheduleFrom ? new Date(scheduleFrom) : null;
            const toDate = scheduleTo ? new Date(scheduleTo) : null;

            if (fromDate && startOfDay(orderDate) < startOfDay(fromDate)) return false;
            if (toDate && endOfDay(orderDate) > endOfDay(toDate)) return false;

            return true;
          });
        }

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(order =>
            order.fullsalesorderno?.toLowerCase().includes(term) ||
            order.contact_name?.toLowerCase().includes(term)
          );
        }

        setAllOrders(ordersList);
        setDisplayedOrders(filtered);
      }
    } catch (error) {
      toast.error("Error reloading orders", { duration: 2000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    let result = [...allOrders];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.fullsalesorderno?.toLowerCase().includes(term) ||
          order.contact_name?.toLowerCase().includes(term)
      );
    }
    if (selectedCompany !== "all") result = result.filter((o) => o.company_id == selectedCompany);
    if (selectedBranch !== "all") result = result.filter((o) => o.branch_id == selectedBranch);
    if (selectedDivision !== "all") result = result.filter((o) => o.division_id == selectedDivision);
    if (selectedCreator !== "all") result = result.filter((o) => o.created_by_id == selectedCreator);

    // Date filtering with date-fns
    if (scheduleFrom || scheduleTo) {
      result = result.filter((order) => {
        if (!order.delivery_dt) return false;

        const [d, m, y] = order.delivery_dt.split("/");
        const orderDate = parse(`${y}-${m}-${d}`, "yyyy-MM-dd", new Date());

        if (!isValid(orderDate)) return false;

        const fromDate = scheduleFrom ? new Date(scheduleFrom) : null;
        const toDate = scheduleTo ? new Date(scheduleTo) : null;

        if (fromDate && startOfDay(orderDate) < startOfDay(fromDate)) return false;
        if (toDate && endOfDay(orderDate) > endOfDay(toDate)) return false;

        return true;
      });
    }

    setDisplayedOrders(result);
    setGlobalFilter("");
    toast.success(`Found ${result.length} order(s)`, { duration: 2000 });
  };

  const handleReset = () => {
    setSelectedCompany("all");
    setSelectedBranch("all");
    setSelectedDivision("all");
    setSelectedCreator("all");
    setScheduleFrom("");
    setScheduleTo("");
    setSearchTerm("");
    setSelectedSalesOrderIds([]);
    setGlobalFilter("");
    fetchAllOrders();
  };

  const handleOrderClick = (id) => {
    setSelectedOrderId(id);
    setIsOrderDialogOpen(true);
  };

  const toggleSalesOrderSelection = (salesorder_id) => {
    setSelectedSalesOrderIds((prev) =>
      prev.includes(salesorder_id)
        ? prev.filter((id) => id != salesorder_id)
        : [...prev, salesorder_id]
    );
  };

  const toggleSelectAll = () => {
    const visibleOrderIds = [...new Set(displayedOrders.map((o) => o.salesorder_id))];
    if (selectedSalesOrderIds.length === visibleOrderIds.length) {
      setSelectedSalesOrderIds([]);
    } else {
      setSelectedSalesOrderIds(visibleOrderIds);
    }
  };

  const isSalesOrderSelected = (id) => selectedSalesOrderIds.includes(id);

  const isFirstOccurrence = (index) => {
    const currentId = displayedOrders[index]?.salesorder_id;
    for (let i = 0; i < index; i++) {
      if (displayedOrders[i].salesorder_id == currentId) return false;
    }
    return true;
  };

  const getPaymentStatusBadge = (status) => {
    let backgroundColor = "";
    let textColor = "";
    let displayText = status || "-";
    
    if (status === "Paid") {
      backgroundColor = "rgba(40, 127, 113, 0.1)";
      textColor = "#287F71";
    } else if (status === "Un Paid") {
      backgroundColor = "rgba(236, 52, 76, 0.1)";
      textColor = "#EC344C";
    } else {
      backgroundColor = "rgba(245, 148, 64, 0.1)";
      textColor = "#F59440";
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
        id: "select",
        header: () => (
          <Checkbox
            checked={
              selectedSalesOrderIds.length > 0 &&
              selectedSalesOrderIds.length === [...new Set(displayedOrders.map((o) => o.salesorder_id))].length
            }
            onCheckedChange={toggleSelectAll}
            className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
          />
        ),
        cell: ({ row }) => {
          if (!isFirstOccurrence(row.index)) return <div className="w-4 h-4" />;
          return (
            <Checkbox
              checked={isSalesOrderSelected(row.original.salesorder_id)}
              onCheckedChange={() => toggleSalesOrderSelection(row.original.salesorder_id)}
              className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
            />
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
      { accessorKey: "company_name", header: "Company" },
      { accessorKey: "branch_name", header: "Branch" },
      { accessorKey: "division_name", header: "Division" },
      {
        accessorKey: "fullsalesorderno",
        header: "Order No",
        cell: ({ row }) => (
          <button
            onClick={() => handleOrderClick(row.original.salesorder_id)}
            className="font-semibold text-[#287F71] hover:underline"
          >
            {row.getValue("fullsalesorderno")}
          </button>
        ),
      },
      { accessorKey: "salesorder_dt", header: "Order Date" },
      {
        id: "product",
        header: "Product",
        accessorFn: (row) => `${row.name || ""} ${row.code || ""}`,
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <div className="font-medium truncate">{row.original.name}</div>
            <div className="text-xs text-gray-500">{row.original.code}</div>
          </div>
        ),
      },
      {
        id: "quantity",
        header: "Qty",
        accessorFn: (row) => {
          if (row?.conversion_flg == "1") {
            return `${row?.qty || "0"}${row?.primary_unit_name ? ` (${row.primary_unit_name})` : ""}`;
          } else if (row?.conversion_flg == "2") {
            return `${row?.SecQtyTotal || "0"}${row?.secondary_unit_name ? ` (${row.secondary_unit_name})` : ""}`;
          } else {
            return `${row?.qty || "0"}${row?.unit ? ` (${row.unit})` : ""}`;
          }
        },
        cell: ({ row }) => {
          let displayText = "N/A";
          if (row.original?.conversion_flg == "1") {
            displayText = `${row.original?.qty || "0"}${row.original?.primary_unit_name ? ` (${row.original.primary_unit_name})` : ""}`;
          } else if (row.original?.conversion_flg == "2") {
            displayText = `${row.original?.SecQtyTotal || "0"}${row.original?.secondary_unit_name ? ` (${row.original.secondary_unit_name})` : ""}`;
          } else {
            displayText = `${row.original?.qty || "0"}${row.original?.unit ? ` (${row.original.unit})` : ""}`;
          }
          return <div>{displayText}</div>;
        },
      },
      { accessorKey: "delivery_dt", header: "Schedule Date" },
      {
        accessorKey: "contact_name",
        header: "Customer",
        cell: ({ row }) => (
          <div className="whitespace-normal text-left">
            {row.original.contact_name || ""} {row.original.contact_type == 1 ? "(C)" : row.original.contact_type == 6 ? "(RC)" : ""}
          </div>
        ),
      },
      { accessorKey: "billing_area", header: "Area" },
      { accessorKey: "billing_pincode", header: "Pincode" },
      {
        accessorKey: "grand_total",
        header: "Amount",
        cell: ({ row }) => <span className="font-medium">₹{row.getValue("grand_total")}</span>,
      },
      {
        id: "advance",
        header: "Advance",
        accessorFn: (row) => row.advance_received,
        cell: ({ row }) => `₹${row.original.advance_received}`,
      },
      {
        accessorKey: "payment_status",
        header: "Payment Status",
        cell: ({ row }) => getPaymentStatusBadge(row.getValue("payment_status")),
      },
      { accessorKey: "created_by_name", header: "Created By" },
    ],
    [displayedOrders, selectedSalesOrderIds]
  );

  const table = useReactTable({
    data: displayedOrders,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      pagination,
    },
  });

  const approveMutation = useMutation({
    mutationFn: (ids) =>
      OrderProcessingService.salesOrderApproved({ token, employeeId: user.id, salesOrderIds: ids }),
    onSuccess: () => {
      toast.success(`${selectedSalesOrderIds.length} order(s) approved!`, { duration: 2000 });
      setSelectedSalesOrderIds([]);
      setShowApproveConfirm(false);
      refetchWithCurrentFilters();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (ids) =>
      OrderProcessingService.salesOrderRejected({ token, employeeId: user.id, salesOrderIds: ids }),
    onSuccess: () => {
      toast.success(`${selectedSalesOrderIds.length} order(s) rejected!`, { duration: 2000 });
      setSelectedSalesOrderIds([]);
      setShowRejectConfirm(false);
      refetchWithCurrentFilters();
    },
  });

  const handleExportCSV = () => {
    const headers = [
      "Company", "Branch", "Division", "Order No", "Order Date", "Product Name", "Product Code",
      "Qty", "Unit", "Schedule Date", "Customer", "Area", "Pincode", "Amount", "Advance",
      "Payment Status", "Created By"
    ].join(",");

    const rows = displayedOrders.map((order) => [
      `"${order.company_name || ""}"`,
      `"${order.branch_name || ""}"`,
      `"${order.division_name || ""}"`,
      order.fullsalesorderno,
      order.salesorder_dt,
      `"${order.name || ""}"`,
      order.code || "",
      order.qty,
      order.unit,
      order.delivery_dt || "",
      `"${order.contact_name || ""}"`,
      order.billing_area || "",
      order.billing_pincode || "",
      order.grand_total,
      order.advance_received,
      order.payment_status,
      order.created_by_name || "",
    ].join(","));

    const csv = "\uFEFF" + [headers, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pending_orders_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!", { duration: 2000 });
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium block mb-1">Company</label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.company_id} value={c.company_id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Branch</label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.branch_id} value={b.branch_id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Division</label>
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.cd_id} value={d.cd_id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Created By</label>
            <Select value={selectedCreator} onValueChange={setSelectedCreator}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {filteredEmployees.map((e) => (
                  <SelectItem key={e.employee_id} value={e.employee_id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">From Date</label>
            <Input type="date" value={scheduleFrom} onChange={(e) => setScheduleFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">To Date</label>
            <Input type="date" value={scheduleTo} onChange={(e) => setScheduleTo(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSearch}  className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white">Search</Button>
          <Button variant="outline" onClick={handleReset}>Reset & Reload</Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <Input
          placeholder="Search Order No, Customer, Product, Code..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-full sm:max-w-sm bg-[#fff]"
        />
        <div className="flex gap-3 ml-auto">
          {/* Uncomment when needed */}
          {/* <Button onClick={handleExportCSV} disabled={displayedOrders.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button> */}
          <Button onClick={() => setShowApproveConfirm(true)} disabled={selectedSalesOrderIds.length === 0} className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white">
            Approve ({selectedSalesOrderIds.length})
          </Button>
          <Button onClick={() => setShowRejectConfirm(true)} disabled={selectedSalesOrderIds.length === 0} className="px-6 bg-[#EC344C] hover:bg-[#c92a3e] text-white">
            Reject ({selectedSalesOrderIds.length})
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns().filter((col) => col.getCanHide()).map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={col.getIsVisible()}
                  onCheckedChange={(value) => col.toggleVisibility(!!value)}
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
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-[#4a5a6b]">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="bg-[#4a5a6b] text-white">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                    No orders found
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
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => table.setPageSize(Number(value))}
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
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              First
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              Last
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <Dialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Confirm Approval</DialogTitle></DialogHeader>
          <DialogDescription>Approve {selectedSalesOrderIds.length} selected order(s)?</DialogDescription>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowApproveConfirm(false)}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate(selectedSalesOrderIds)}
              disabled={approveMutation.isPending}
              className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Confirm Rejection</DialogTitle></DialogHeader>
          <DialogDescription>Reject {selectedSalesOrderIds.length} selected order(s)?</DialogDescription>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowRejectConfirm(false)}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => rejectMutation.mutate(selectedSalesOrderIds)}
              disabled={rejectMutation.isPending}
              className="px-6 bg-[#EC344C] hover:bg-[#c92a3e] text-white"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <OrderEditDialog
        salesorderId={selectedOrderId}
        open={isOrderDialogOpen}
        onOpenChange={setIsOrderDialogOpen}
      />
    </div>
  );
};

export default OrderListingTable;