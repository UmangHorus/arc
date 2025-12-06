"use client";
import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, ArrowUpDown, Pencil, Trash2, Plus, Package, Upload, Warehouse } from "lucide-react";
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
import ProductService from "@/lib/ProductService";
import ProductAddDialog from "../shared/ProductAddDialog";
import ImportProductDialog from "../shared/ImportProductDialog";
import ImportPriceListDialog from "../shared/ImportPriceListDialog";
import HashLoader from "react-spinners/HashLoader";

const ProductListTable = () => {
    const { token } = useLoginStore();
    const queryClient = useQueryClient();

    const [data, setData] = useState([]);
    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);
    const [columnVisibility, setColumnVisibility] = useState({});
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const [selectedProductId, setSelectedProductId] = useState(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showPriceImportDialog, setShowPriceImportDialog] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [showCreateInventory, setShowCreateInventory] = useState(false);
    const [inventoryProductId, setInventoryProductId] = useState(null);
    const [inventoryCategoryId, setInventoryCategoryId] = useState(null);

    // Fetch Categories
    const { data: categoriesData } = useQuery({
        queryKey: ["productCategories", token],
        queryFn: async () => {
            const response = await ProductService.getProductCategoryList(token);
            return response;
        },
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
    });

    // Fetch Units
    const { data: unitsData } = useQuery({
        queryKey: ["productUnits", token],
        queryFn: async () => {
            const response = await ProductService.getProductUnitList(token);
            return response;
        },
        enabled: !!token,
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
    });

    // Fetch products
    const { data: productData, isLoading, refetch } = useQuery({
        queryKey: ["productList", token],
        queryFn: async () => {
            const response = await ProductService.getProductListsFilter(token);
            return response;
        },
        enabled: !!token,
    });

    // Update data when productData changes
    React.useEffect(() => {
        if (productData) {
            const responseData = Array.isArray(productData) ? productData[0] : productData;
            if (responseData?.STATUS === "SUCCESS" && responseData?.DATA?.productlists) {
                setData(responseData.DATA.productlists);
            } else {
                setData([]);
            }
        }
    }, [productData]);

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (productId) => ProductService.deleteProduct(token, productId),
        onSuccess: (response) => {
            const responseData = Array.isArray(response) ? response[0] : response;
            if (responseData?.STATUS === "SUCCESS") {
                toast.success(responseData.MSG || "Product deleted successfully");
                refetch();
            } else {
                toast.error(responseData?.MSG || "Failed to delete product");
            }
        },
        onError: () => {
            toast.error("Error deleting product");
        },
    });

    const handleCreateProduct = () => {
        setSelectedProductId(null);
        setShowAddDialog(true);
    };

    const handleEditProduct = (productId) => {
        setSelectedProductId(productId);
        setShowAddDialog(true);
    };

    const handleDeleteClick = (product) => {
        setProductToDelete(product);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            deleteMutation.mutate(productToDelete.product_id);
            setDeleteDialogOpen(false);
            setProductToDelete(null);
        }
    };

    const handleCreateInventory = (productId, categoryId) => {
        setInventoryProductId(productId);
        setInventoryCategoryId(categoryId);
        setShowCreateInventory(true);
        // TODO: Implement CreateInventory dialog component
        toast.info("Create Inventory feature - Coming soon");
    };


    const columns = useMemo(
        () => [
            {
                accessorKey: "product_id",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
                    >
                        ID
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => <div className="text-left">{row.getValue("product_id")}</div>,
            },
            {
                accessorKey: "code",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
                    >
                        Code
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => <div className="text-left">{row.getValue("code")}</div>,
            },
            {
                accessorKey: "name",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
                    >
                        Product Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => <div className="text-left font-medium">{row.getValue("name")}</div>,
            },
            {
                accessorKey: "mrp_price",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="text-right w-full justify-end text-white hover:text-white hover:bg-[#4a5a6b]"
                    >
                        MRP Price
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => <div className="text-right">{row.getValue("mrp_price")}</div>,
            },
            {
                accessorKey: "price1_min",
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="text-right w-full justify-end text-white hover:text-white hover:bg-[#4a5a6b]"
                    >
                        Price
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                ),
                cell: ({ row }) => <div className="text-right">{row.getValue("price1_min")}</div>,
            },
            {
                id: "inventory",
                header: () => <div className="text-center text-white">Inventory</div>,
                cell: ({ row }) => {
                    const product = row.original;
                    return (
                        <div className="text-center flex justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCreateInventory(product.product_id, product.category)}
                                className="p-0 h-auto hover:bg-transparent"
                                title="Create Inventory"
                            >
                                <Warehouse className="h-5 w-5 text-[#562A75] hover:text-[#452060] cursor-pointer" />
                            </Button>
                        </div>
                    );
                },
            },
            {
                id: "actions",
                header: () => <div className="text-center text-white">Edit</div>,
                cell: ({ row }) => {
                    const product = row.original;
                    return (
                        <div className="text-center flex justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProduct(product.product_id)}
                                className="p-0 h-auto hover:bg-transparent"
                            >
                                <Pencil className="h-5 w-5 text-[#D97706] hover:text-[#B45309] cursor-pointer" />
                            </Button>
                        </div>
                    );
                },
            },
            {
                id: "delete",
                header: () => <div className="text-center text-white">Delete</div>,
                cell: ({ row }) => {
                    const product = row.original;
                    return (
                        <div className="text-center flex justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(product)}
                                className="p-0 h-auto hover:bg-transparent"
                            >
                                <Trash2 className="h-5 w-5 text-[#ec344c] hover:text-[#d11a32] cursor-pointer" />
                            </Button>
                        </div>
                    );
                },
            },
        ],
        []
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
        <div className="w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-4">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Input
                        placeholder="Search products..."
                        value={globalFilter ?? ""}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="w-full sm:max-w-sm bg-[#fff]"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
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
                                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant="outline"
                        onClick={() => setShowPriceImportDialog(true)}
                        className="bg-[#287F71] hover:bg-[#1a5c4d] text-white border-[#287F71] hover:border-[#1a5c4d] w-full sm:w-auto"
                    >
                        <Package className="mr-2 h-4 w-4" /> Import Price List
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setShowImportDialog(true)}
                        className="bg-[#287F71] hover:bg-[#1a5c4d] text-white border-[#287F71] hover:border-[#1a5c4d] w-full sm:w-auto"
                    >
                        <Upload className="mr-2 h-4 w-4" /> Import Products
                    </Button>

                    <Button
                        onClick={handleCreateProduct}
                        className="bg-[#287F71] hover:bg-[#1a5c4d] text-white w-full sm:w-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Button>
                </div>
            </div>

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
                        {isLoading ? (
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the product
                            "{productToDelete?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialogs */}
            <ProductAddDialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                productId={selectedProductId}
                categoriesData={categoriesData}
                unitsData={unitsData}
                onSuccess={() => {
                    refetch();
                    setShowAddDialog(false);
                }}
            />

            <ImportProductDialog
                open={showImportDialog}
                onOpenChange={setShowImportDialog}
                onSuccess={() => {
                    refetch();
                }}
            />

            <ImportPriceListDialog
                open={showPriceImportDialog}
                onOpenChange={setShowPriceImportDialog}
                onSuccess={() => {
                    // Optional: refresh data if needed
                }}
            />
        </div>
    );
};

export default ProductListTable;
