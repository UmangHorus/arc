"use client";
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
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
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import { useQuery } from "@tanstack/react-query";
import InvoiceService from "@/lib/InvoiceService";
import EInvoiceDialog from "@/components/shared/EInvoiceDialog";
import EWaybillDialog from "@/components/shared/EWaybillDialog";
import { HashLoader } from "react-spinners";

const InvoiceTable = () => {
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const d = new Date();
    const pad = (n) => `${n}`.padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Initial values
  const initialStatus = "All";
  const initialInvoiceStatus = "All";
  const initialDate = getTodayDate();

  // Filter states (UI values - these change on input)
  const [status, setStatus] = useState(initialStatus);
  const [invoiceStatus, setInvoiceStatus] = useState(initialInvoiceStatus);
  const [fromDate, setFromDate] = useState(initialDate);
  const [toDate, setToDate] = useState(initialDate);

  // Applied filter states (these are used for API calls - only change on Search/Reset)
  const [appliedStatus, setAppliedStatus] = useState(initialStatus);
  const [appliedInvoiceStatus, setAppliedInvoiceStatus] = useState(initialInvoiceStatus);
  const [appliedFromDate, setAppliedFromDate] = useState(initialDate);
  const [appliedToDate, setAppliedToDate] = useState(initialDate);

  // Table states
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Helper: ensure Select always receives a string value
  const toSelectValue = (v) => (typeof v === "string" ? v : "");

  const { token, user, appConfig } = useLoginStore();
  const employeeId = user?.id;

  // Fetch invoices - using APPLIED filter states
  const { data: invoiceApi, isLoading: invoiceLoading } = useQuery({
    queryKey: [
      "invoiceList",
      token,
      employeeId,
      appliedFromDate,
      appliedToDate,
      appliedStatus,
      appliedInvoiceStatus,
    ],
    queryFn: async () => {
      // format to DD/MM/YYYY for API
      const fmt = (d) => d.split("-").reverse().join("/");

      return InvoiceService.getInvoiceList({
        token: token,
        employeeId,
        fromDate: fmt(appliedFromDate),
        toDate: fmt(appliedToDate),
        status: appliedStatus === "All" ? "" : appliedStatus,
        invoiceStatus: appliedInvoiceStatus === "All" ? "" : appliedInvoiceStatus,
      });
    },
    enabled: !!token && !!appliedFromDate && !!appliedToDate,
    refetchOnMount: "always",
  });

  const rows = useMemo(() => {
    if (invoiceApi?.STATUS === "SUCCESS") {
      return (invoiceApi.DATA || []).map((item) => ({
        invoice_id: item.invoice_id,
        invoiceno: item.invoiceno,
        invoice_date: item.invoice_date,
        customername: item.customername,
        netamount: item.netamount,
        status: item.status,
        city: item.city,
        state: item.state,
      }));
    }
    return [];
  }, [invoiceApi]);

  const [eInvoiceOpen, setEInvoiceOpen] = useState(false);
  const [eWaybillOpen, setEWaybillOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  // react-table setup
  const columns = useMemo(
    () => [
      {
        accessorKey: "action",
        header: () => <div className="text-center text-white">Action</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" className="bg-[#287F71] hover:bg-[#1a5c4d] text-white" onClick={() => { setSelectedInvoiceId(row.original.invoice_id); setEInvoiceOpen(true); }}>EInvoice</Button>
            <Button size="sm" variant="secondary" className="bg-[#287F71] hover:bg-[#1a5c4d] text-white" onClick={() => { setSelectedInvoiceId(row.original.invoice_id); setEWaybillOpen(true); }}>E-Way Bill</Button>
          </div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "invoiceno",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Invoice No
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-left">{row.getValue("invoiceno")}</div>,
      },
      {
        accessorKey: "invoice_date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Invoice Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-left">{row.getValue("invoice_date")}</div>,
      },
      {
        accessorKey: "netamount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Invoice Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-left">{row.getValue("netamount")}</div>,
      },
      {
        accessorKey: "customername",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Customer Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-left">{row.getValue("customername")}</div>,
      },
      {
        accessorKey: "city",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            City
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-left">{row.getValue("city")}</div>,
      },
      {
        accessorKey: "state",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            State
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="text-left">{row.getValue("state")}</div>,
      },
      {
        accessorKey: "status",
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
        cell: ({ row }) => <div className="text-center">{row.getValue("status")}</div>,
      },
    ],
    []
  );

  const table = useReactTable({
    data: rows,
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
        row.getValue("invoiceno")?.toLowerCase().includes(search) ||
        row.getValue("invoice_date")?.toLowerCase().includes(search) ||
        row.getValue("netamount")?.toLowerCase().includes(search) ||
        row.getValue("customername")?.toLowerCase().includes(search) ||
        row.getValue("city")?.toLowerCase().includes(search) ||
        row.getValue("state")?.toLowerCase().includes(search) ||
        row.getValue("status")?.toLowerCase().includes(search)
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

  // Handle Search - Apply current filter values and trigger API call
  const handleSearch = () => {
    setAppliedStatus(status);
    setAppliedInvoiceStatus(invoiceStatus);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    table.setPageIndex(0);
  };

  // Handle Reset - Reset both UI and applied values to initial state
  const handleReset = () => {
    const today = getTodayDate();

    // Reset UI values
    setStatus(initialStatus);
    setInvoiceStatus(initialInvoiceStatus);
    setFromDate(today);
    setToDate(today);

    // Reset applied values (this triggers API call)
    setAppliedStatus(initialStatus);
    setAppliedInvoiceStatus(initialInvoiceStatus);
    setAppliedFromDate(today);
    setAppliedToDate(today);

    // Reset other UI states
    setGlobalFilter("");
    table.setPageIndex(0);
  };

  // CSV Export function
  const handleExportCSV = () => {
    // Excel-compatible CSV format with BOM for UTF-8
    const BOM = "\uFEFF";
    const headers = [
      "Invoice No",
      "Invoice Date",
      "Invoice Amount",
      "Customer Name",
      "City",
      "State",
      "Status",
    ];

    const csvData = rows.map((invoice) => {
      const escapeCsv = (str) => {
        if (!str) return "";
        return `"${String(str).replace(/"/g, '""')}"`;
      };

      return [
        escapeCsv(invoice.invoiceno),
        escapeCsv(invoice.invoice_date),
        escapeCsv(invoice.netamount),
        escapeCsv(invoice.customername),
        escapeCsv(invoice.city),
        escapeCsv(invoice.state),
        escapeCsv(invoice.status),
      ];
    });

    const csvContent =
      BOM +
      [headers.join(","), ...csvData.map((row) => row.join(","))].join("\r\n");

    // Download with current date in filename
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `invoices_report_${dateStr}.csv`);
  };

  // Helper function for download
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

  // Show loading spinner while API is being called
  if (invoiceLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-sm font-medium mb-1">Status</div>
            <Select
              value={toSelectValue(status)}
              onValueChange={(v) => setStatus(v ?? "All")}
            >
              <SelectTrigger className="bg-white w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="A">Active</SelectItem>
                <SelectItem value="C">Cancel</SelectItem>
                <SelectItem value="CL">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Invoice Status</div>
            <Select
              value={toSelectValue(invoiceStatus)}
              onValueChange={(v) => setInvoiceStatus(v ?? "All")}
            >
              <SelectTrigger className="bg-white w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="1">Paid</SelectItem>
                <SelectItem value="2">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">From Date</div>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-white"
            />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">To Date</div>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-white"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleSearch}
            className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
          >
            Search
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Top Section: Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {/* Search Section */}
        <Input
          placeholder="Search invoices..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="w-full sm:max-w-sm bg-[#fff]"
        />

        {/* Action Buttons Section */}
        <div className="flex gap-3 ml-auto">
          {/* Columns Visibility Dropdown */}
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

          {/* Export Button */}
          <Button
            onClick={handleExportCSV}
            className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white p-4 rounded-lg shadow">
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
            {invoiceLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-10 text-center">Loading...</TableCell>
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

      {/* Pagination Section */}
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

      <EInvoiceDialog open={eInvoiceOpen} onOpenChange={setEInvoiceOpen} invoiceId={selectedInvoiceId} />
      <EWaybillDialog open={eWaybillOpen} onOpenChange={setEWaybillOpen} invoiceId={selectedInvoiceId} />
    </div>
  );
};

export default InvoiceTable;