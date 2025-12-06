import ProductListTable from "@/components/products/ProductListTable";

export default function ProductsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                <p className="text-muted-foreground">
                    Manage your product catalog
                </p>
            </div>
            <ProductListTable />
        </div>
    );
}
