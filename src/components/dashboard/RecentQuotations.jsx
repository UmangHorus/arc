"use client";
import { useState, useEffect, useMemo } from "react";
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, MapPin, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useLoginStore } from "@/stores/auth.store";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import QuotationDetailsDialog from "../shared/QuotationDetailsDialog";
import { QuotationService } from "@/lib/QuotationService";

export default function RecentQuotations() {
    const { user = {}, navConfig, token } = useLoginStore();
    const quotationLabel = navConfig?.labels?.Quotation_config_name || "Quotation";
    const contactLabel = navConfig?.labels?.contacts || "Contact";
    const isAuthenticated = !!user?.id;

    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);
    const [data, setData] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedQuotationId, setSelectedQuotationId] = useState(null);

    // Helper function for pluralization
    const pluralize = (word) => {
        if (word.toLowerCase() == "inquiry") {
            return "Inquiries";
        }
        if (word.toLowerCase().endsWith("y") && !/[aeiou]y$/i.test(word)) {
            return word.slice(0, -1) + "ies";
        }
        return word + "s";
    };

    // Fetch quotations using useQuery
    const {
        data: quotationData,
        error: quotationError,
        isLoading: quotationLoading,
        refetch: refetchQuotations,
    } = useQuery({
        queryKey: ["quotations", user?.id, token],
        queryFn: () => QuotationService.getQuotation(token, user?.id),
        enabled: !!token && !!user?.id && isAuthenticated,
        refetchOnMount: "always",
        staleTime: 0,
        cacheTime: 0,
    });

    // Handle quotation data
    useEffect(() => {
        if (quotationData) {
            const responseData = Array.isArray(quotationData) ? quotationData[0] : quotationData;
            if (responseData?.STATUS == "SUCCESS") {
                const quotationList = responseData?.DATA
                    .filter((item) => item && item.quotation_id)
                    .map((quotation) => ({
                        id: quotation.quotation_id || "",
                        fullquotationno: quotation.fullquotationno || `${quotation.quotation_id}`,
                        customername: quotation.contact_name || "Unknown",
                        createdate: quotation.created_dt || "",
                        status_flg: quotation.status_flg || "N/A",
                        location: quotation.gmapAddress || "",
                        gmapAddress: quotation.gmapAddress || "",
                        gmapurl: quotation.gmapurl || "",
                        customer_address: quotation.contact_address || "",
                        create_from: quotation.create_from || "",
                        created_by: quotation.employee_name || "",
                    }))
                    .slice(0, 10); // Limit to first 10 results
                setData(quotationList);
            } else {
                console.error("Failed to fetch quotation data:", responseData?.MSG);
                setData([]); // Set empty array if no data
            }
        }
        if (quotationError) {
            console.error("Error fetching quotations:", quotationError.message);
            setData([]); // Set empty array on error
        }
    }, [quotationData, quotationError]);

    // Helper function for Status Badge
    const getStatusBadge = (status) => {
        let backgroundColor = "";
        let textColor = "";
        let displayText = "N/A";
        
        if (status == "A") {
            backgroundColor = "rgba(40, 127, 113, 0.1)";
            textColor = "#287F71";
            displayText = "Approved";
        } else if (status == "C") {
            backgroundColor = "rgba(236, 52, 76, 0.1)";
            textColor = "#EC344C";
            displayText = "Rejected";
        } else if (status == "P") {
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
                    const { CustomerAddress, CreatedAddress } = row.getValue("location");
                    const isCustomerAddressDisabled = !CustomerAddress || CustomerAddress.trim() == "";
                    const isCreatedAddressDisabled = !CreatedAddress || CreatedAddress.trim() == "";

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
                                    className="p-0 w-[30px] h-[30px] rounded-[5.625px] border-[0.5px] border-[#2786F1] bg-[#D4E7FC] hover:bg-[#2786F1] flex items-center justify-center transition-all duration-300 ease-in-out group hover:scale-105 active:scale-95"
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
                accessorKey: "fullquotationno",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() == "asc")}
                        className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
                    >
                        {`${quotationLabel} Number`}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => (
                    <div className="text-left">{row.getValue("fullquotationno")}</div>
                ),
            },
            {
                accessorKey: "createdate",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() == "asc")}
                        className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
                    >
                        Created Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => (
                    <div className="capitalize text-left">{row.getValue("createdate")}</div>
                ),
            },
            {
                accessorKey: "customername",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() == "asc")}
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
                        onClick={() => column.toggleSorting(column.getIsSorted() == "asc")}
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
                accessorKey: "status_flg",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() == "asc")}
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
                        onClick={() => column.toggleSorting(column.getIsSorted() == "asc")}
                        className="text-center w-full justify-center text-white hover:text-white hover:bg-[#4a5a6b]"
                    >
                        Source
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => {
                    const createFrom = row.getValue("create_from");
                    let displaySource;
                    if (createFrom == "OE" || createFrom == "officeexpre") {
                        displaySource = "Office Express";
                    } else if (createFrom == "NP") {
                        displaySource = "E-Commerce";
                    } else if (
                        createFrom == "" ||
                        createFrom == null ||
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
                id: "viewQuotation",
                header: () => <div className="text-center text-white">Actions</div>,
                cell: ({ row }) => {
                    const quotation = row.original;
                    return (
                        <div className="text-center flex justify-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedQuotationId(quotation.id);
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
        [quotationLabel, contactLabel, setSelectedQuotationId, setDialogOpen]
    );

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            sorting,
            columnFilters,
        },
    });

    // If no data, return null to show blank space
    if (!quotationLoading && data.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-[#373838] text-[22px] font-medium leading-[32px] mb-4">
                Recent 10 {pluralize(quotationLabel)}
            </h2>
            <div className="w-full">
                <div className="rounded-md">
                    <Table className="min-w-full listing-tables">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
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
                        <TableBody className="bg-white">
                            {quotationLoading ? (
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
                                            <TableCell key={cell.id} className="text-center">
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
                                        No {pluralize(quotationLabel).toLowerCase()} found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {selectedQuotationId && (
                    <QuotationDetailsDialog
                        quotationId={selectedQuotationId}
                        open={dialogOpen}
                        onOpenChange={setDialogOpen}
                    />
                )}
            </div>
        </div>
    );
}