"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
  flexRender,
} from "@tanstack/react-table";
import { ArrowUpDown, Eye, Pencil } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import MeasurementDetailsDialog from "@/components/shared/MeasurementDetailsDialog";

const ContactMeasurements = ({ measurementData }) => {
  const router = useRouter();
  const { user } = useLoginStore();
  const leadLabel = useLoginStore((state) => state.navConfig?.labels?.leads || "Lead");

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Format reference text
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

  // Process measurementData
  const data = useMemo(() => {
    if (!measurementData || !Array.isArray(measurementData)) return [];
    return measurementData
      .filter((item) => item && item.measurement_id)
      .map((item) => ({
        id: item.measurement_id || "",
        fullmeasurementno: item.fullmeasurementno || "",
        measurement_dt: item.measurement_dt || "",
        reference_by: getReferenceByText(
          item.reference_type,
          item.reference_name,
          item.reference_id
        ),
        created_by: item.created_by || "",
        updated_by: item.updated_by || "-",
        updated_dt: item.updated_dt || "-",
        reference_id: item.reference_id,
        reference_type: item.reference_type,
      }));
  }, [measurementData, leadLabel]);

  // Edit handler
  const handleEditMeasurement = (measurement_id, reference_id, reference_type) => {
    const queryParams = new URLSearchParams({
      measurement_id,
      reference_id,
      reference_type,
    });
    router.push(`/measurements/add?${queryParams.toString()}`);
  };

  // Columns – styled like ContactLeads
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
          <div className="text-left">{row.getValue("fullmeasurementno") || "-"}</div>
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
          <div className="text-left">{row.getValue("measurement_dt") || "-"}</div>
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
          <div className="text-left">{row.getValue("reference_by") || "-"}</div>
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
          <div className="text-left">{row.getValue("updated_by") || "-"}</div>
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
          <div className="text-left">{row.getValue("updated_dt") || "-"}</div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-center text-white">Actions</div>,
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="text-center flex justify-center gap-2">
              <Eye
                className="h-5 w-5 text-[#287f71] hover:text-[#1a5c50] cursor-pointer"
                onClick={() => {
                  setSelectedMeasurementId(m.id);
                  setDialogOpen(true);
                }}
              />
              <Pencil
                className="h-5 w-5 text-[#D97706] hover:text-[#B45309] cursor-pointer"
                onClick={() =>
                  handleEditMeasurement(m.id, m.reference_id, m.reference_type)
                }
              />
            </div>
          );
        },
        enableHiding: false,
      },
    ],
    [leadLabel]
  );

  // React Table
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        const newPagination = typeof updater === "function" ? updater(prev) : updater;
        return {
          ...prev,
          ...newPagination,
          pageIndex: newPagination.pageSize !== prev.pageSize ? 0 : newPagination.pageIndex,
        };
      });
    },
    state: {
      sorting,
      pagination,
    },
  });

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No measurement data available
      </div>
    );
  }

  return (
    <div>
      {/* Heading */}
      <h2 className="text-[#373838] text-[22px] sm:text-[22px] font-[500] leading-[32px] ml-4">
        Measurements
      </h2>

      {/* Table */}
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
                    <TableCell key={cell.id} className="text-left">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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

        {/* Pagination */}
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
              {`${pagination.pageIndex * pagination.pageSize + 1}-${Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                data.length
              )} of ${data.length} rows`}
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

      {/* View Dialog */}
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

export default ContactMeasurements;