"use client";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
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
import { Badge } from "@/components/ui/badge";
import { useLoginStore } from "@/stores/auth.store";

const TableComponent = ({ table, title }) => (
  <div className="w-full">
    <h2 className="text-[#373838] text-[22px] font-medium leading-[32px] mb-4">{title}</h2>
    <div className="rounded-md">
      <Table className="min-w-full listing-tables">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="bg-[#4a5a6b] text-white">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="bg-white">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="text-center">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-10 text-center">No results.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);

export default function RecentDeliveryChallans() {
  const { navConfig } = useLoginStore();
  const deliveryChallanLabel = navConfig?.labels?.delivery_challan || "Delivery Challan";

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

  const dummyData = useMemo(() => [
    { id: "DC001", fullorder_no: "DC-2025-001", customername: "ABC Corp", createdate: "2025-11-10", status_flg: "A", location: "Mumbai", gmapAddress: "Andheri, Mumbai" },
    { id: "DC002", fullorder_no: "DC-2025-002", customername: "XYZ Ltd", createdate: "2025-11-08", status_flg: "P", location: "Pune", gmapAddress: "Hinjawadi, Pune" },
    { id: "DC003", fullorder_no: "DC-2025-003", customername: "Tech Solutions", createdate: "2025-11-05", status_flg: "C", location: "Delhi", gmapAddress: "Nehru Place, Delhi" },
  ], []);

  const columns = useMemo(() => [
    {
      accessorFn: (row) => ({ CustomerAddress: row.gmapAddress, CreatedAddress: row.location }),
      id: "location",
      header: () => <div className="text-center text-white">Location</div>,
      cell: ({ row }) => {
        const { CustomerAddress, CreatedAddress } = row.getValue("location");
        return (
          <div className="flex items-center justify-center gap-1">
            {CustomerAddress && (
              <Button variant="ghost" size="sm" asChild title={`Contact: ${CustomerAddress}`}>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CustomerAddress)}`} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4 text-[#287F71]" />
                </a>
              </Button>
            )}
            {CreatedAddress && (
              <Button variant="ghost" size="sm" asChild title={`Created: ${CreatedAddress}`}>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CreatedAddress)}`} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4 text-[#287F71]" />
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
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="text-left w-full justify-start text-white">
          DC No <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-left">{row.getValue("fullorder_no")}</div>,
    },
    {
      accessorKey: "createdate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="text-left w-full justify-start text-white">
          Created Date <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-left">{row.getValue("createdate")}</div>,
    },
    {
      accessorKey: "customername",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="text-left w-full justify-start text-white">
          Customer Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-left">{row.getValue("customername")}</div>,
    },
    {
      accessorKey: "status_flg",
      header: () => <div className="text-center text-white">Status</div>,
      cell: ({ row }) => {
        const status = row.getValue("status_flg");
        const display = status === "A" ? "Accepted" : status === "C" ? "Completed" : status === "P" ? "Pending" : "N/A";
        const badge = { Accepted: "bg-[#287F71]", Completed: "bg-green-600", Pending: "bg-orange-500", "N/A": "bg-gray-500" };
        return <Badge className={`${badge[display]} text-white shadow-none`}>{display}</Badge>;
      },
    },
    {
      id: "view",
      header: () => <div className="text-center text-white">Actions</div>,
      cell: () => (
        <div className="text-center">
          <Eye className="h-5 w-5 text-[#287F71] cursor-pointer inline-block" />
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: dummyData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <TableComponent table={table} title={`Recent 10 ${pluralize(deliveryChallanLabel)}`} />
    </div>
  );
}