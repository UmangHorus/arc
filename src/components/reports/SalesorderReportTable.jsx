"use client";
import React, { useState, useEffect, useMemo } from "react";
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
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ChevronDown, ArrowUpDown, Download } from "lucide-react";
import { toast } from "sonner";
import { useLoginStore } from "@/stores/auth.store";
import OrderProcessingService from "@/lib/OrderProcessingService";
import { HashLoader } from "react-spinners";

// Status mapping: dropdown value to numeric status for API
const statusToNumberMap = {
  "Pending": "1",
  "Approved": "2",
  "Rejected": "3",
  "Cancel": "4",
  "Invoice Generated": "5",
  "Returned": "6",
  "Delivered & Unpaid": "7",
  "Delivered & Paid": "8",
  "Processed": "9",
  "Closed": "10",
  "Acception for dispatch": "11",
};

// Number to status map for display
const numberToStatusMap = {
  "1": "Pending",
  "2": "Approved",
  "3": "Rejected",
  "4": "Cancel",
  "5": "Invoice Generated",
  "6": "Returned",
  "7": "Delivered & Unpaid",
  "8": "Delivered & Paid",
  "9": "Processed",
  "10": "Closed",
  "11": "Acception for dispatch",
};

const SalesorderReportTable = () => {
  const { user, token, appConfig } = useLoginStore();
  const [selectedStatus, setSelectedStatus] = useState("Pending");
  const [showSearchInput, setShowSearchInput] = useState(true);
  const [uniqueSalesOrderCount, setUniqueSalesOrderCount] = useState(0);
  const [sodata, setSoData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Get sales order list - matches old code logic
  const getSalesorderList = async (dc_status = "Pending") => {
    if (!token) {
      console.error("No PHPTOKEN found");
      setSoData([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await OrderProcessingService.getSalesOrderToDeliverySummaryReport({
        token,
        status: statusToNumberMap[dc_status] || "",
      });

      const responseData = Array.isArray(response) ? response[0] : response;

      if (responseData?.STATUS === "SUCCESS") {
        let dclist_arr = responseData.DATA?.solist || [];

        // Filter for medbot_user_type: "3"
        if (String(appConfig?.medbot_user_type) == "3" && user?.id) {
          dclist_arr = dclist_arr.filter(
            (item) => String(item.employee_id) === String(user.id)
          );
        }

        // Calculate unique sales order count
        const uniqueSalesOrders = new Set(
          dclist_arr.map((item) => item.fullsalesorderno)
        );
        setUniqueSalesOrderCount(uniqueSalesOrders.size);

        const processedOrderIds = new Set();
        const convertedTableData = dclist_arr.map((item, i) => {
          const isDuplicate = processedOrderIds.has(item.dc_id);
          processedOrderIds.add(item.dc_id);

          return {
            id: i,
            orderno: item.fullsalesorderno,
            orderdate: item.salesorder_dt,
            contact: item.contact_name,
            branch: item.branch_name,
            prodname: item.product_name + " (" + item.code + ")",
            dcno: item.dc_fullno,
            dcdate: item.dc_date,
            invoice_id: item.invoice_no,
            invoice_no: item.invoice_no,
            dcdispatchstatus: item.dispatch_status,
            deliveredstatus: item.delivered_status,
            route: item.route_name,
            assignee: item.employee_name,
            status: item.status, // Numeric status from API
            payment_status: item.payment_status,
          };
        });

        setSoData(convertedTableData);
        setIsLoading(false);
      } else {
        console.error("API STATUS not SUCCESS:", responseData?.MSG || responseData?.MESSAGE);
        setSoData([]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching sales order list:", error);
      toast.error("Error fetching sales order list");
      setSoData([]);
      setIsLoading(false);
    }
  };

  // Call API on component mount with default "Pending" status
  useEffect(() => {
    if (token) {
      getSalesorderList("Pending");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Only run when token is available

  // Filter data based on search text - matches old code logic
  const filteredData = useMemo(() => {
    let filteredItems = sodata;

    // Apply text filter if search input is visible and has a value
    if (showSearchInput && globalFilter) {
      const cleanedSearchValue = globalFilter
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      filteredItems = filteredItems.filter((item) =>
        Object.keys(item).some((key) => {
          if (item[key] && typeof item[key] === "string") {
            const cleanedItem = item[key]
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "")
              .replace(/\s+/g, " ")
              .trim();
            return cleanedItem.includes(cleanedSearchValue);
          }
          return false;
        })
      );
    }

    return filteredItems;
  }, [sodata, globalFilter, showSearchInput]);

  const handleStatusChange = (value) => {
    setSelectedStatus(value);
    setShowSearchInput(!!value);
    setGlobalFilter("");
  };

  const handleSearchButtonClick = () => {
    getSalesorderList(selectedStatus); // Call API with selected status
    setShowSearchInput(!!selectedStatus); // Show search input if status is selected
    setGlobalFilter(""); // Reset search text
  };

  // CSV Export function
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Excel-compatible CSV format with BOM for UTF-8
    const BOM = "\uFEFF";
    const headers = [
      "Order No",
      "Invoice No",
      "Order Date",
      "Contact",
      "Shipping Branch",
      "Product",
      "DC No",
      "DC Date",
      "Status",
      "Route",
      "Assignee",
    ];

    const csvData = filteredData.map((order) => {
      const escapeCsv = (str) => {
        if (!str) return "";
        return `"${String(str).replace(/"/g, '""')}"`;
      };

      return [
        escapeCsv(order.orderno),
        escapeCsv(order.invoice_no || ""),
        escapeCsv(order.orderdate),
        escapeCsv(order.contact),
        escapeCsv(order.branch),
        escapeCsv(order.prodname),
        escapeCsv(order.dcno || ""),
        escapeCsv(order.dcdate || ""),
        escapeCsv(numberToStatusMap[order.status] || order.status),
        escapeCsv(order.route || ""),
        escapeCsv(order.assignee || ""),
      ];
    });

    const csvContent =
      BOM +
      [headers.join(","), ...csvData.map((row) => row.join(","))].join("\r\n");

    // Download with current date in filename
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `salesorder_summary_data_${dateStr}.csv`);
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

  const columns = useMemo(
    () => [
      {
        accessorKey: "orderno",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Order No
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left whitespace-normal">{row.getValue("orderno")}</div>
        ),
      },
      {
        accessorKey: "invoice_no",
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
        cell: ({ row }) => (
          <div className="text-left whitespace-normal">{row.getValue("invoice_no") || "-"}</div>
        ),
      },
      {
        accessorKey: "orderdate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Order Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("orderdate")}</div>
        ),
      },
      {
        accessorKey: "contact",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Contact
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left whitespace-normal">{row.getValue("contact")}</div>
        ),
      },
      {
        accessorKey: "branch",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Shipping Branch
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left whitespace-normal">{row.getValue("branch")}</div>
        ),
      },
      {
        accessorKey: "prodname",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Product
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left whitespace-normal">{row.getValue("prodname")}</div>
        ),
      },
      {
        accessorKey: "dcno",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            DC No
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left whitespace-normal">{row.getValue("dcno") || "-"}</div>
        ),
      },
      {
        accessorKey: "dcdate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            DC Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("dcdate") || "-"}</div>
        ),
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
        cell: ({ row }) => (
          <div className="text-left whitespace-normal">
            {numberToStatusMap[row.getValue("status")] || row.getValue("status")}
          </div>
        ),
      },
      {
        accessorKey: "route",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Route
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("route") || "-"}</div>
        ),
      },
      {
        accessorKey: "assignee",
        header: () => <div className="text-center text-white">Assignee</div>,
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("assignee") || "-"}</div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
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
      const search = String(filterValue || "").toLowerCase().trim();
      if (!search) return true;

      const normalize = (val) => {
        if (val == null) return "";
        return String(val).replace(/,/g, "").trim().toLowerCase();
      };

      const o = row.original;
      return (
        normalize(o.orderno).includes(search) ||
        normalize(o.invoice_no).includes(search) ||
        normalize(o.orderdate).includes(search) ||
        normalize(o.contact).includes(search) ||
        normalize(o.branch).includes(search) ||
        normalize(o.prodname).includes(search) ||
        normalize(o.dcno).includes(search) ||
        normalize(o.dcdate).includes(search) ||
        normalize(numberToStatusMap[o.status] || o.status).includes(search) ||
        normalize(o.route).includes(search) ||
        normalize(o.assignee).includes(search)
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

  const statusOptions = [
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
    { value: "Acception for dispatch", label: "Acception for dispatch" },
    { value: "Cancel", label: "Cancel" },
    { value: "Invoice Generated", label: "Invoice Generated" },
    { value: "Returned", label: "Returned" },
    { value: "Delivered & Unpaid", label: "Delivered & Unpaid" },
    { value: "Delivered & Paid", label: "Delivered & Paid" },
    { value: "Processed", label: "Processed" },
    { value: "Closed", label: "Closed" },
  ];

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
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleSearchButtonClick}
            disabled={isLoading}
            className="bg-[#287F71] hover:bg-[#1a5c4d] text-white"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Global Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        {showSearchInput && (
          <Input
            placeholder="Filter selected data..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                // Search is handled automatically by globalFilter
              }
            }}
            className="w-full sm:max-w-sm bg-[#fff]"
          />
        )}
        <div className="flex gap-3 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                  >
                    {typeof col.columnDef.header === "string"
                      ? col.columnDef.header
                      : col.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={handleExportCSV}
            className="bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            disabled={filteredData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
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
                    <TableHead
                      key={header.id}
                      className="bg-[#4a5a6b] text-white"
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
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
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
                    className="h-24 text-center text-gray-500"
                  >
                    {selectedStatus
                      ? "No data found for selected status."
                      : "Please select a status and click Search to view data."}
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
    </div>
  );
};

export default SalesorderReportTable;

