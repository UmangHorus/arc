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
import { ArrowUpDown, Download, Eye, MapPin } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";

const ContactLeadFollowUp = ({ leadFollowUpData, contact }) => {
  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );
  const leadLabel = useLoginStore(
    (state) => state.navConfig?.labels?.leads || "Lead"
  );
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedFollowUpId, setSelectedFollowUpId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Process leadFollowUpData
  useEffect(() => {
    if (leadFollowUpData && Array.isArray(leadFollowUpData)) {
      const followUpList = leadFollowUpData
        .filter((item) => item)
        .map((item) => {
          const routes = contact?.route && Array.isArray(contact.route)
            ? contact.route
              .map((item) => item?.RouteMaster?.route_name)
              .filter(Boolean)
              .join(", ")
            : "-";
          return {
            id: item.id || "",
            leadId: item.lead_id || "",
            contactAddress: contact?.address || "",
            followupAddress: item.gmapAddress || "",
            contactName: contact?.name || "",
            associateName: item.subsubordinate_names || "",
            contactMobile: contact?.mobile || "",
            contactEmail: contact?.email || "",
            contactCity: contact?.city || "",
            contactRoute: routes,
            contactIndustry: contact?.industry || "",
            followupType: item.followup_type || "",
            followupOutcome: item.outcome_name || "",
            followupTakenDate: item.action_dt || "",
            nextActionDate: item.next_action_dt || "",
            keyAccountManager: contact?.handled_by || "",
            createdDate: item.followup_dt || "",
            createdBy: item.followup_doneby || "",
            followupDescription: item.remarks || "",
            attachment: item.file_url || "",
          };
        });
      setData(followUpList);
    } else {
      console.error("Invalid or missing lead follow-up data");
    }
  }, [leadFollowUpData, contact]);

  const columns = useMemo(
    () => [
      {
        accessorFn: (row) => ({
          contactAddress: row.contactAddress,
          followupAddress: row.followupAddress,
          file_url: row.attachment,
        }),
        id: "location",
        header: () => <div className="text-center text-white">Actions</div>,
        cell: ({ row }) => {
          const { contactAddress, followupAddress, file_url } = row.getValue("location") || {};
          const isContactAddressDisabled = !contactAddress || contactAddress.trim() === "";
          const isFollowupAddressDisabled = !followupAddress || followupAddress.trim() === "";
          const isAttachmentDisabled = !file_url;

          return (
            <div className="flex items-center justify-center gap-2">
              {isAttachmentDisabled ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={true}
                  title="No attachment available"
                  className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-gray-400 bg-gray-100 cursor-not-allowed flex items-center justify-center opacity-50"
                >
                  <Download className="h-4 w-4 text-gray-400" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  title="Download Attachment"
                  className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
                >
                  <a
                    href={file_url}
                    download
                  >
                    <Download className="h-4 w-4 text-[#287F71] group-hover:text-white transition-all duration-300 ease-in-out group-hover:scale-110" />
                  </a>
                </Button>
              )}
              {isFollowupAddressDisabled ? (
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
                  title={`Followup Address: ${followupAddress}`}
                  className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#287F71] bg-[rgba(40,127,113,0.06)] hover:bg-[#287F71] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
                >
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(followupAddress)}`}
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
        accessorKey: "leadId",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Lead Id
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("leadId") || "-"}</div>
        ),
      },
      {
        accessorKey: "contactName",
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
          <div className="text-left">{row.getValue("contactName") || "-"}</div>
        ),
      },
      {
        accessorKey: "contactMobile",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Contact Mobile
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("contactMobile") || "-"}</div>
        ),
      },
      {
        accessorKey: "contactEmail",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Contact Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("contactEmail") || "-"}</div>
        ),
      },
      {
        accessorKey: "contactCity",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Contact City
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("contactCity") || "-"}</div>
        ),
      },
      {
        accessorKey: "contactRoute",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Contact Route
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const routes = row.getValue("contactRoute") || "-";
          return <div className="text-left">{routes}</div>;
        },
      },
      {
        accessorKey: "contactIndustry",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Contact Industry
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("contactIndustry") || "-"}</div>
        ),
      },
      {
        accessorKey: "followupType",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Followup Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("followupType") || "-"}</div>
        ),
      },
      {
        accessorKey: "followupOutcome",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Followup Outcome
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("followupOutcome") || "-"}</div>
        ),
      },
      {
        accessorKey: "followupTakenDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Followup Taken Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("followupTakenDate") || "-"}</div>
        ),
      },
      {
        accessorKey: "nextActionDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Next Action Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("nextActionDate") || "-"}</div>
        ),
      },
      {
        accessorKey: "keyAccountManager",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Key A/C Manager
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">{row.getValue("keyAccountManager") || "-"}</div>
        ),
      },
      {
        accessorKey: "createdDate",
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
          <div className="text-left">{row.getValue("createdDate") || "-"}</div>
        ),
      },
      {
        accessorKey: "createdBy",
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
          <div className="text-left">{row.getValue("createdBy") || "-"}</div>
        ),
      },
      {
        accessorKey: "followupDescription",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
          >
            Followup Remark
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-left">
            {row.getValue("followupDescription")
              ? row.getValue("followupDescription").length > 15
                ? row.getValue("followupDescription").substring(0, 15) + "..."
                : row.getValue("followupDescription")
              : "-"}
          </div>
        ),
      },

    ],
    [contactLabel]
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
      return [
        "leadId",
        "contactName",
        "contactMobile",
        "contactEmail",
        "contactCity",
        "contactRoute",
        "contactIndustry",
        "followupType",
        "followupOutcome",
        "followupTakenDate",
        "nextActionDate",
        "keyAccountManager",
        "createdDate",
        "createdBy",
        "followupDescription",
      ].some((key) => String(row.getValue(key) || "").toLowerCase().includes(search));
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
        {`${leadLabel}-Follow Up`}
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
        <div className="flex items-center justify-end space-x-2 py-4 pagination-responsive">
          <div className="flex items-center flex-col md:flex-row space-x-4">
            <div className="flex items-center rows-per-page-container gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
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
    </div>
  );
};

export default ContactLeadFollowUp;