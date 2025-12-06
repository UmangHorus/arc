"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ArrowUpDown, Eye, MapPin, Pencil } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import OrderDetailsDialog from "@/components/shared/OrderDetailsDialog";
import { useRouter } from "next/navigation";

const ContactSalesOrder = ({ salesOrderData, contact }) => {
  const router = useRouter();
  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );
  const orderLabel = "Sales Order";
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Process salesOrderData
  useEffect(() => {
    if (salesOrderData && Array.isArray(salesOrderData)) {
      const salesOrderList = salesOrderData
        .filter((item) => item && item.salesorder_id)
        .map((order) => ({
          id: order.salesorder_id || "",
          fullorder_no: order.fullsalesorderno || `${order.order_no}`,
          customername: contact?.name || "",
          createdate: order.salesorder_dt || "",
          status_flg: order.status_flg || "N/A",
          location: order.gmapAddress,
          gmapAddress: order.gmapAddress,
          gmapurl: order.gmapurl,
          customer_address: contact?.address || "",
          create_from: order.create_from || "",
          created_by: order.employee_name || "",
        }));
      setData(salesOrderList);
    } else {
      console.error("Invalid or missing sales order data");
    }
  }, [salesOrderData, contact]);

  // Helper function for Status Badge
  const getStatusBadge = (status) => {
    let backgroundColor = "";
    let textColor = "";
    let displayText = "N/A";
    
    if (status === "A") {
      backgroundColor = "rgba(40, 127, 113, 0.1)";
      textColor = "#287F71";
      displayText = "Approved";
    } else if (status === "C") {
      backgroundColor = "rgba(236, 52, 76, 0.1)";
      textColor = "#EC344C";
      displayText = "Rejected";
    } else if (status === "P") {
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
          const { CustomerAddress, CreatedAddress } = row.getValue("location") || {};
          const isCustomerAddressDisabled = !CustomerAddress || CustomerAddress.trim() === "";
          const isCreatedAddressDisabled = !CreatedAddress || CreatedAddress.trim() === "";

          return (
            <div className="flex items-center justify-center gap-2">
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
          <div className="text-left">{row.getValue("fullorder_no") || "-"}</div>
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
          <div className="capitalize text-left">{row.getValue("createdate") || "-"}</div>
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
          <div className="text-left">{row.getValue("customername") || "-"}</div>
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
          <div className="text-left">{row.getValue("created_by") || "-"}</div>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setDialogOpen(true);
                }}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
              >
                <Eye className="h-4 w-4 text-[#287F71] group-hover:text-white transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  router.push(`/orders/create?orderId=${order.id}`);
                }}
                className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#D97706] bg-[rgba(217,119,6,0.06)] hover:bg-[#D97706] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
              >
                <Pencil className="h-4 w-4 text-[#D97706] group-hover:text-white transition-all duration-300 ease-in-out group-hover:scale-110" />
              </Button>
            </div>
          );
        },
        enableHiding: false,
      },
    ],
    [contactLabel, orderLabel]
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
      return ["fullorder_no", "createdate", "customername", "status_flg", "created_by", "create_from"].some((key) =>
        String(row.getValue(key) || "").toLowerCase().includes(search)
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

  return (
    <div>
      <h2 className="text-[#373838] text-[22px] sm:text-[22px] font-[500] leading-[32px] ml-4">
        {`${orderLabel}`}
      </h2>
      <div className="overflow-x-auto mt-4">
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
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="bg-white text-center">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="text-left"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
        <div className="flex items-center justify-end space-x-2 py-4 pagination-responsive">
          <div className="flex items-center flex-col md:flex-row space-x-4">
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
                    <SelectItem
                      key={pageSize}
                      value={pageSize.toString()}
                      className="text-sm"
                    >
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
      {selectedOrderId && (
        <OrderDetailsDialog
          salesorderId={selectedOrderId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
};

export default ContactSalesOrder;