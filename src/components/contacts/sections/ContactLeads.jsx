
"use client";

import { useEffect, useState, useMemo } from "react";
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
import { ArrowUpDown, Eye, MapPin } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import LeadDetailsDialog from "@/components/shared/LeadDetailsDialog";

const ContactLeads = ({ leadData, contact }) => {
    const leadLabel = useLoginStore(
        (state) => state.navConfig?.labels?.leads || "Lead"
    );
    const contactLabel = useLoginStore(
        (state) => state.navConfig?.labels?.contacts || "Contact"
    );
    const [data, setData] = useState([]);
    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);
    const [columnVisibility, setColumnVisibility] = useState({});
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [selectedLeadId, setSelectedLeadId] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Map status function
    const mapStatus = (status) => {
        const statusMap = {
            1: "Pending",
            3: "Completed",
            cancelled: "Cancelled",
        };
        return statusMap[status] || "Unknown";
    };

    // Process leadData
    useEffect(() => {
        if (leadData && Array.isArray(leadData)) {
            const leadList = leadData
                .filter((item) => item && item.lead_id)
                .map((order) => ({
                    id: order.lead_id || "",
                    leadno: order.lead_id || "",
                    customername: contact?.name || "",
                    lead_title: order.lead_title || "",
                    createdate: order.lead_dt || "",
                    leadstatus: order.status_flg,
                    location: order.gmapAddress || "",
                    gmapurl: order.gmapurl || "",
                    customer_address: contact?.address || "",
                    created_by: order.created_name || "",
                }));
            setData(leadList);
        } else {
            console.error("Invalid or missing lead data");
        }
    }, [leadData, contact]);

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
            {
                accessorFn: (row) => ({
                    CustomerAddress: row.customer_address || "",
                    CreatedAddress: row.location || "",
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
                                    disabled
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
                                        href={CreatedAddress.includes("http") ? CreatedAddress : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CreatedAddress)}`}
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
                    <div className="capitalize text-left">{row.getValue("leadno") || "-"}</div>
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
                    <div className="capitalize text-left">{row.getValue("createdate") || "-"}</div>
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
                    <div className="text-left">{row.getValue("lead_title") || "-"}</div>
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
                    const status = row.getValue("leadstatus") || "Unknown";
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
                                <Eye className="h-4 w-4 text-[#287F71] group-hover:text-white transition-all duration-300 ease-in-out group-hover:scale-110" />
                            </Button>
                        </div>
                    );
                },
                enableHiding: false,
            },
        ],
        [leadLabel, contactLabel]
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
                "leadno",
                "createdate",
                "customername",
                "lead_title",
                "leadstatus",
                "created_by",
            ].some((key) =>
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
                {`${leadLabel}`}
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
            {selectedLeadId && (
                <LeadDetailsDialog
                    leadId={selectedLeadId}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                />
            )}
        </div>
    );
};

export default ContactLeads;
