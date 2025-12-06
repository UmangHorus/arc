// Table columns for detailed view (so_listing_transaction_config == "1")
export const tableColumns = [
  {
    accessorKey: "dcno",
    header: "DC No",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.dcno}</div>
    ),
  },
  {
    accessorKey: "invoice_no",
    header: "Invoice No",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.invoice_no || ""}</div>
    ),
  },
  {
    accessorKey: "dcdate",
    header: "DC Date",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.dcdate}</div>
    ),
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.contact}</div>
    ),
  },
  {
    accessorKey: "company_name",
    header: "Company",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.company_name}</div>
    ),
  },
  {
    accessorKey: "branch_name",
    header: "Branch",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.branch_name}</div>
    ),
  },
  {
    accessorKey: "assigned_to_employee_name",
    header: "Assign Emp",
    cell: ({ row }) => (
      <div className="whitespace-normal">
        {row.original.assigned_to_employee_name}
      </div>
    ),
  },
  {
    accessorKey: "prodname",
    header: "Product",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.prodname}</div>
    ),
  },
  {
    accessorKey: "shipping_area",
    header: "Area",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.shipping_area}</div>
    ),
  },
  {
    accessorKey: "route_id",
    header: "Route",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.route_id || ""}</div>
    ),
  },
  {
    accessorKey: "shipping_pincode",
    header: "Pincode",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.shipping_pincode}</div>
    ),
  },
  {
    accessorKey: "qty",
    header: "Qty",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.qty}</div>
    ),
  },
  {
    accessorKey: "sec_qty",
    header: "Secondary Qty",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.sec_qty}</div>
    ),
  },
  {
    accessorKey: "remark",
    header: "Remarks",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.remark || ""}</div>
    ),
  },
];

// Table columns for summary view (so_listing_transaction_config == "0")
export const summaryTableColumns = [
  {
    accessorKey: "dc_fullno",
    header: "DC No",
    cell: ({ row }) => {
      // Handle both string and React element (button) for dc_fullno
      const dcFullNo = row.original.dc_fullno;
      if (typeof dcFullNo === "string") {
        return <div className="whitespace-normal" >{dcFullNo}</div>;
      }
      // If it's a React element (button), render it directly
      return <div className="whitespace-normal font-bold">{dcFullNo}</div>;
    },
  },
  {
    accessorKey: "invoice_no",
    header: "Invoice No",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.invoice_no || ""}</div>
    ),
  },
  {
    accessorKey: "dc_date",
    header: "DC Date",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.dc_date || ""}</div>
    ),
  },
  {
    accessorKey: "contact_name",
    header: "Contact",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.contact_name}</div>
    ),
  },
  {
    accessorKey: "company_name",
    header: "Company",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.company_name}</div>
    ),
  },
  {
    accessorKey: "branch_name",
    header: "Branch",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.branch_name}</div>
    ),
  },
  {
    accessorKey: "assigned_to_employee_name",
    header: "Assign Emp",
    cell: ({ row }) => (
      <div className="whitespace-normal">
        {row.original.assigned_to_employee_name}
      </div>
    ),
  },
  {
    accessorKey: "shipping_area",
    header: "Area",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.shipping_area}</div>
    ),
  },
  {
    accessorKey: "route_id",
    header: "Route",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.route_id || ""}</div>
    ),
  },
  {
    accessorKey: "shipping_pincode",
    header: "Pincode",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.shipping_pincode}</div>
    ),
  },
  // {
  //   accessorKey: "qtyDisplay",
  //   header: "Total Qty",
  //   cell: ({ row }) => (
  //     <div className="whitespace-normal">{row.original.qtyDisplay}</div>
  //   ),
  // },
  // {
  //   accessorKey: "secQtyDisplay",
  //   header: "Total Sec Qty",
  //   cell: ({ row }) => (
  //     <div className="whitespace-normal">{row.original.secQtyDisplay}</div>
  //   ),
  // },
  {
    accessorKey: "remark",
    header: "Remarks",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.remark || ""}</div>
    ),
  },
];
