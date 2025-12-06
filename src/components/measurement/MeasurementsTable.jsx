"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { ChevronDown, ArrowUpDown, Eye, Pencil } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useLoginStore } from "@/stores/auth.store";
import MeasurementDetailsDialog from "../shared/MeasurementDetailsDialog";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { leadService } from "@/lib/leadService";

const MeasurementsTable = () => {
  const { user, token, appConfig } = useLoginStore();
  const router = useRouter();
  const leadLabel = useLoginStore(
    (state) => state.navConfig?.labels?.leads || "Lead"
  );

  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedMeasurementId, setSelectedMeasurementId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  /* ------------------- FETCH MEASUREMENTS ------------------- */
  const {
    data: measurementData,
    error: measurementError,
    isLoading: measurementLoading,
  } = useQuery({
    queryKey: [
      "measurements",
      user?.id,
      appConfig?.company_id,
      appConfig?.branch_id,
      token,
    ],
    queryFn: () =>
      leadService.getMeasurement(
        token,
        user?.id,
        appConfig?.company_id,
        appConfig?.branch_id
      ),
    enabled:
      !!token && !!user?.id && !!appConfig?.company_id && !!appConfig?.branch_id,
    refetchOnMount: "always",
  });

  // Utility function to format reference text
  const getReferenceByText = (referenceType, referenceName, referenceId) => {
    switch (referenceType) {
      case "1":
        return `${referenceName} (C)`;
      case "6":
        return `${referenceName} (RC)`;
      case "7":
        return `${leadLabel} No: ${referenceId}`;
      default:
        return referenceName || referenceId || "-";
    }
  };

  /* ------------------- PROCESS API RESPONSE ------------------- */
  useEffect(() => {
    if (measurementData) {
      const responseData = Array.isArray(measurementData)
        ? measurementData[0]
        : measurementData;

      if (responseData?.STATUS === "SUCCESS") {
        const measurementList = responseData?.DATA?.map((item) => {
          const referenceType = item.reference_type || "";
          const referenceName = item.reference_name || "";
          const referenceId = item.reference_id || "";

          return {
            id: item.measurement_id || "",
            fullmeasurementno: item.fullmeasurementno || "",
            measurement_dt: item.measurement_dt || "",
            reference_by: getReferenceByText(referenceType, referenceName, referenceId),
            created_by: item.created_by || "",
            updated_by: item.updated_by || "-", // New field
            updated_dt: item.updated_dt || "-", // New field
            // Keep original fields for edit
            reference_id: referenceId,
            reference_type: referenceType,
          };
        });
        setData(measurementList);
      } else {
        console.error(responseData?.MSG || "Failed to fetch measurement data");
      }
    }
    if (measurementError) {
      console.error("Error fetching measurements:", measurementError.message);
    }
  }, [measurementData, measurementError]);

  /* ------------------- EDIT HANDLER ------------------- */
  const handleEditMeasurement = (measurement_id, reference_id, reference_type) => {
    const queryParams = new URLSearchParams({
      measurement_id,
      reference_id,
      reference_type,
    });
    router.push(`/measurements/add?${queryParams.toString()}`);
  };

  /* ------------------- TABLE COLUMNS ------------------- */
  const columns = useMemo(
    () => [
      {
        accessorKey: "fullmeasurementno",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Full Measurement No
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("fullmeasurementno")}</div>
        ),
      },
      {
        accessorKey: "measurement_dt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Measurement Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("measurement_dt")}</div>
        ),
      },
      {
        accessorKey: "reference_by",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Reference By
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("reference_by")}</div>
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
        accessorKey: "updated_by",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Updated By
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("updated_by")}</div>
        ),
      },
      {
        accessorKey: "updated_dt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Updated Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("updated_dt")}</div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-center text-white">Actions</div>,
        cell: ({ row }) => {
          const measurement = row.original;
          return (
            <div className="flex items-center justify-center gap-3">
              <Eye
                className="h-5 w-5 text-[#287F71] hover:text-[#1a5c50] cursor-pointer"
                onClick={() => {
                  setSelectedMeasurementId(measurement.id);
                  setDialogOpen(true);
                }}
              />
              <Pencil
                className="h-5 w-5 text-[#D97706] hover:text-[#B45309] cursor-pointer"
                onClick={() =>
                  handleEditMeasurement(
                    measurement.id,
                    measurement.reference_id,
                    measurement.reference_type
                  )
                }
              />
            </div>
          );
        },
        enableHiding: false,
      },
      {
        id: "createQuo",
        header: () => <div className="text-center text-white">Create Quo</div>,
        cell: ({ row }) => {
          const measurement = row.original;
          return (
            <div className="text-center flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  router.push(`/quotations/create?measurementId=${measurement.id}`);
                }}
                className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white hover:text-white"
                title="Create Quotation from Measurement"
              >
                Create Quo
              </Button>
            </div>
          );
        },
        enableHiding: false,
      },
    ],
    [leadLabel]
  );

  /* ------------------- REACT TABLE SETUP ------------------- */
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
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return (
        row.getValue("fullmeasurementno")?.toString().toLowerCase().includes(search) ||
        row.getValue("measurement_dt")?.toString().toLowerCase().includes(search) ||
        row.getValue("reference_by")?.toString().toLowerCase().includes(search) ||
        row.getValue("created_by")?.toString().toLowerCase().includes(search) ||
        row.getValue("updated_by")?.toString().toLowerCase().includes(search) ||
        row.getValue("updated_dt")?.toString().toLowerCase().includes(search)
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
            newPagination.pageSize !== prev.pageSize ? 0 : newPagination.pageIndex,
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

  /* ------------------- CSV EXPORT ------------------- */
  const handleExportCSV = () => {
    const BOM = "\uFEFF";
    const headers = [
      "Full Measurement No",
      "Measurement Date",
      "Reference By",
      "Created By",
      "Updated By",
      "Updated Date",
    ];

    const csvData = data.map((m) => [
      `"${m.fullmeasurementno}"`,
      `"${m.measurement_dt}"`,
      `"${m.reference_by}"`,
      `"${m.created_by}"`,
      `"${m.updated_by}"`,
      `"${m.updated_dt}"`,
    ]);

    const csvContent =
      BOM + [headers.join(","), ...csvData.map((row) => row.join(","))].join("\r\n");

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `measurements_report_${dateStr}.csv`);
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

  /* ------------------- RENDER ------------------- */
  return (
    <div className="w-full">
      {/* SEARCH + COLUMNS + EXPORT */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-4">
        {/* Search - full width on mobile */}
        <div className="w-full">
          <Input
            placeholder="Search measurements..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full sm:max-w-sm bg-[#fff]"
          />
        </div>

        {/* Columns + Export - in one line on mobile */}
        <div className="flex gap-3 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((c) => c.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  >
                    {column.id === "fullmeasurementno"
                      ? "Full Measurement No"
                      : column.id === "measurement_dt"
                        ? "Measurement Date"
                        : column.id === "reference_by"
                          ? "Reference By"
                          : column.id === "created_by"
                            ? "Created By"
                            : column.id === "updated_by"
                              ? "Updated By"
                              : column.id === "updated_dt"
                                ? "Updated Date"
                                : column.id.replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            disabled={data.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* TABLE */}
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
            {measurementLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-10 text-center">
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
                <TableCell colSpan={columns.length} className="h-10 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-end space-x-2 py-4 pagination-responsive">
        <div className="flex flex-col md:flex-row items-center space-x-4">
          <div className="flex items-center rows-per-page-container gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="w-[70px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 75, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
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

      {/* DETAILS DIALOG */}
      {selectedMeasurementId && (
        <MeasurementDetailsDialog
          measurementId={selectedMeasurementId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
};

export default MeasurementsTable;