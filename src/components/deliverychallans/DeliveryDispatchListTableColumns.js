import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, MapPin, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const tableColumns = [
  {
    id: "action",
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => row.original.action || null,
    enableSorting: false,
  },
  {
    id: "location",
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => {
      const fullAddress = row.original.full_address;
      if (!fullAddress || fullAddress === "N/A" || fullAddress.trim() === "") {
        return <div className="w-4" />;
      }
      return (
        <Button
          variant="link"
          size="sm"
          className="p-0 h-auto"
          title={`Address: ${fullAddress}`}
          asChild
        >
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary"
          >
            <MapPin size={16} />
          </a>
        </Button>
      );
    },
    enableSorting: false,
  },
  {
    id: "contact",
    accessorKey: "contact_name",
    header: "Contact",
    cell: ({ row }) => {
      const contactType = row.original.contact_type;
      const contactName = row.original.contact_name || "";
      return (
        <div className="whitespace-normal">
          {contactName}
          {contactType == 1 && " (C)"}
          {contactType == 6 && " (RC)"}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "mobile",
    accessorKey: "mobile_no",
    header: "Mobile",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.mobile_no || "-"}</div>
    ),
    enableSorting: false,
  },
  {
    id: "contact_address",
    accessorKey: "full_address",
    header: "Contact address",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.full_address}</div>
    ),
    enableSorting: false,
  },
  {
    id: "dc_no",
    accessorKey: "dcno",
    header: "DC No",
    cell: ({ row, table }) => {
      const dcId = row.original.dc_id;
      const dcNo = row.original.dcno;
      const templateList = table.options.meta?.templateList || {};
      const dcTemplateId = table.options.meta?.dcTemplateId || "";
      const userRole = table.options.meta?.userRole || {};
      const isDownloading = table.options.meta?.isDownloading || {};
      const isSharing = table.options.meta?.isSharing || {};
      const rowId = `${dcId}-${dcTemplateId}-${row.index}`;
      const selectedTemplate = templateList["25"]?.find(
        (t) => t.id === dcTemplateId
      );

      return (
        <div className="flex flex-col items-center gap-2">
          <div className="whitespace-normal">{dcNo}</div>
          {dcId && dcTemplateId && selectedTemplate && (
            <div className="flex flex-row items-center gap-2">
              {isDownloading[rowId] ? (
                <span className="text-xs text-gray-500">downloading...</span>
              ) : (
                userRole?.dc?.canViewDConExpressPortal == 1 && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={isDownloading[rowId]}
                    onClick={() => {
                      table.options.meta?.handleDownloadTemplate?.(
                        dcId,
                        "25",
                        dcTemplateId,
                        selectedTemplate.name,
                        rowId
                      );
                    }}
                    className="p-0 h-auto"
                  >
                    <Download className="text-base" />
                  </Button>
                )
              )}
              {isSharing[rowId] ? (
                <span className="text-xs text-gray-500">sending...</span>
              ) : (
                userRole?.dc?.canWhatsappDConExpressPortal == 1 && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={isSharing[rowId]}
                    onClick={() => {
                      table.options.meta?.handleShareWhatsapp?.(
                        dcId,
                        "25",
                        dcTemplateId,
                        selectedTemplate.name,
                        rowId,
                        row.original.contact_id,
                        row.original.contact_type,
                        row.original.mobile_no,
                        row.original.isd,
                        table.options.meta?.companyDetails,
                        row.original.contact_name
                      );
                    }}
                    className="p-0 h-auto"
                  >
                    <MessageCircle className="text-base text-[#25D366]" />
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "invoice_no",
    accessorKey: "invoice_no",
    header: "Invoice No",
    cell: ({ row, table }) => {
      const invoiceId = row.original.invoice_id;
      const invoiceNo = row.original.invoice_no;
      const templateList = table.options.meta?.templateList || {};
      const invoiceTemplateId = table.options.meta?.invoiceTemplateId || "";
      const userRole = table.options.meta?.userRole || {};
      const isDownloading = table.options.meta?.isDownloading || {};
      const isSharing = table.options.meta?.isSharing || {};
      const rowId = `${invoiceId}-${invoiceTemplateId}-${row.index}`;
      const selectedTemplate = templateList["22"]?.find(
        (t) => t.id === invoiceTemplateId
      );

      return (
        <div className="flex flex-col items-center gap-2">
          <div className="whitespace-normal">{invoiceNo}</div>
          {invoiceId && invoiceTemplateId && selectedTemplate && (
            <div className="flex flex-row items-center gap-2">
              {isDownloading[rowId] ? (
                <span className="text-xs text-gray-500">downloading...</span>
              ) : (
                userRole?.invoice?.canViewInvoiceonExpressPortal == 1 && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={isDownloading[rowId]}
                    onClick={() => {
                      table.options.meta?.handleDownloadTemplate?.(
                        invoiceId,
                        "22",
                        invoiceTemplateId,
                        selectedTemplate.name,
                        rowId
                      );
                    }}
                    className="p-0 h-auto"
                  >
                    <Download className="text-base" />
                  </Button>
                )
              )}
              {isSharing[rowId] ? (
                <span className="text-xs text-gray-500">sending...</span>
              ) : (
                userRole?.invoice?.canWhatsappInvoiceonExpressPortal == 1 && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={isSharing[rowId]}
                    onClick={() => {
                      table.options.meta?.handleShareWhatsapp?.(
                        invoiceId,
                        "22",
                        invoiceTemplateId,
                        selectedTemplate.name,
                        rowId,
                        row.original.contact_id,
                        row.original.contact_type,
                        row.original.mobile_no,
                        row.original.isd,
                        table.options.meta?.companyDetails,
                        row.original.contact_name
                      );
                    }}
                    className="p-0 h-auto"
                  >
                    <MessageCircle className="text-base text-[#25D366]" />
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "dc_date",
    accessorKey: "dcdate",
    header: "DC Date",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.dcdate}</div>
    ),
    enableSorting: false,
  },
  {
    id: "delivery_type",
    accessorKey: "delivery_type",
    header: "Delivery type",
    cell: ({ row }) => {
      const deliveryType = row.original.delivery_type;
      return (
        <div className="whitespace-normal">
          {deliveryType == "2"
            ? "Delivery"
            : deliveryType == "1"
            ? "Pickup from store"
            : deliveryType}
        </div>
      );
    },
    enableSorting: false,
    omit: (deliveryType) => deliveryType == "2",
  },
  {
    id: "company_name",
    accessorKey: "company_name",
    header: "Company",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.company_name}</div>
    ),
    enableSorting: false,
  },
  {
    id: "branch_name",
    accessorKey: "branch_name",
    header: "Branch",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.branch_name}</div>
    ),
    enableSorting: false,
  },
  {
    id: "area",
    accessorKey: "area",
    header: "Area",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.area || "N/A"}</div>
    ),
    enableSorting: false,
  },
  {
    id: "pincode",
    accessorKey: "pincode",
    header: "Pincode",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.pincode || "N/A"}</div>
    ),
    enableSorting: false,
  },
  {
    id: "route_name",
    accessorKey: "route_name",
    header: "Selected Route",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.route_name || "N/A"}</div>
    ),
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "transport",
  },
  {
    id: "prodname",
    accessorKey: "prodname",
    header: "Product Name",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.prodname}</div>
    ),
    enableSorting: false,
  },
  {
    id: "qty",
    accessorKey: "qty",
    header: "Qty",
    cell: ({ row }) => row.original.qty,
    enableSorting: false,
  },
  {
    id: "sec_qty",
    accessorKey: "sec_qty",
    header: "Sec. Qty",
    cell: ({ row }) => row.original.sec_qty,
    enableSorting: false,
  },
  {
    id: "pending_amount",
    accessorKey: "pending_amount",
    header: () => (
      <div>
        <div>Amount</div>
        <div>(Pending)</div>
      </div>
    ),
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.pending_amount}</div>
    ),
    enableSorting: false,
  },
  {
    id: "status",
    accessorKey: "status",
    header: () => (
      <div>
        <div>Delivery</div>
        <div>Status</div>
      </div>
    ),
    cell: ({ row }) => row.original.status,
    enableSorting: false,
  },
  {
    id: "payment_status",
    accessorKey: "payment_status",
    header: () => (
      <div>
        <div>Payment</div>
        <div>Status</div>
      </div>
    ),
    cell: ({ row }) => row.original.payment_status,
    enableSorting: false,
  },
  {
    id: "shipp_through",
    accessorKey: "shipp_through",
    header: "Ship Through",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.shipp_through}</div>
    ),
    enableSorting: true,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "transporter",
    accessorKey: "transporter",
    header: "Transporter",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.transporter || "N/A"}</div>
    ),
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "vehicleno",
    accessorKey: "vehicleno",
    header: "Vehicle No",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.vehicleno || "N/A"}</div>
    ),
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "lrno",
    accessorKey: "lrno",
    header: "LR No",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.lrno || "N/A"}</div>
    ),
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "lrdate",
    accessorKey: "lrdate",
    header: "LR Date",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.lrdate || "N/A"}</div>
    ),
    enableSorting: true,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "lr_attach",
    accessorKey: "lr_attach",
    header: "LR Attach",
    cell: ({ row }) => {
      const imagePath = row.original.image_path;
      const imageName = row.original.image_name;
      if (
        !imagePath ||
        imagePath === "N/A" ||
        imagePath.trim() === ""
      ) {
        return <span></span>;
      }
      return (
        <div className="flex justify-center items-center w-full">
          <Download
            className="cursor-pointer text-blue-500 text-xl"
            onClick={() => {
              const link = document.createElement("a");
              link.href = imagePath;
              link.download = imageName || "downloaded_file";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          />
        </div>
      );
    },
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "cumulativeDistance",
    accessorKey: "cumulativeDistance",
    header: () => (
      <div>
        <div>Cumulative</div>
        <div>Distance (km)</div>
      </div>
    ),
    cell: ({ row }) => (
      <div>{row.original.cumulativeDistance || "N/A"}</div>
    ),
    enableSorting: false,
  },
];

export const dispatchSummaryTableColumns = [
  {
    id: "action",
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => row.original.action || null,
    enableSorting: false,
  },
  {
    id: "location",
    accessorKey: "location",
    header: "",
    cell: ({ row }) => {
      const fullAddress = row.original.full_address;
      if (!fullAddress || fullAddress === "N/A" || fullAddress.trim() === "") {
        return <div className="w-4" />;
      }
      return (
        <Button
          variant="link"
          size="sm"
          className="p-0 h-auto"
          title={`Address: ${fullAddress}`}
          asChild
        >
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary"
          >
            <MapPin size={16} />
          </a>
        </Button>
      );
    },
    enableSorting: false,
  },
  {
    id: "contact",
    accessorKey: "contact_name",
    header: "Contact",
    cell: ({ row }) => {
      const contactType = row.original.contact_type;
      const contactName = row.original.contact_name || "";
      return (
        <div className="whitespace-normal">
          {contactName}
          {contactType == 1 && " (C)"}
          {contactType == 6 && " (RC)"}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "mobile",
    accessorKey: "mobile_no",
    header: "Mobile",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.mobile_no || "-"}</div>
    ),
    enableSorting: false,
  },
  {
    id: "contact_address",
    accessorKey: "full_address",
    header: "Contact address",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.full_address}</div>
    ),
    enableSorting: false,
  },
  {
    id: "dc_fullno",
    accessorKey: "dc_fullno",
    header: "DC No",
    cell: ({ row, table }) => {
      const dcId = row.original.dc_id;
      const dcFullNo = row.original.dc_fullno;
      const templateList = table.options.meta?.templateList || {};
      const dcTemplateId = table.options.meta?.dcTemplateId || "";
      const userRole = table.options.meta?.userRole || {};
      const isDownloading = table.options.meta?.isDownloading || {};
      const isSharing = table.options.meta?.isSharing || {};
      const rowId = `${dcId}-${dcTemplateId}-${row.index}`;
      const selectedTemplate = templateList["25"]?.find(
        (t) => t.id === dcTemplateId
      );

      return (
        <div className="flex flex-col items-center gap-2">
          {typeof dcFullNo === "function" ? (
            dcFullNo(row.original)
          ) : (
            <div className="whitespace-normal">{dcFullNo}</div>
          )}
          {dcId && dcTemplateId && selectedTemplate && (
            <div className="flex flex-row items-center gap-2">
              {isDownloading[rowId] ? (
                <span className="text-xs text-gray-500">downloading...</span>
              ) : (
                userRole?.dc?.canViewDConExpressPortal == 1 && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={isDownloading[rowId]}
                    onClick={() => {
                      table.options.meta?.handleDownloadTemplate?.(
                        dcId,
                        "25",
                        dcTemplateId,
                        selectedTemplate.name,
                        rowId
                      );
                    }}
                    className="p-0 h-auto"
                  >
                    <Download className="text-base" />
                  </Button>
                )
              )}
              {isSharing[rowId] ? (
                <span className="text-xs text-gray-500">sending...</span>
              ) : (
                userRole?.dc?.canWhatsappDConExpressPortal == 1 && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={isSharing[rowId]}
                    onClick={() => {
                      table.options.meta?.handleShareWhatsapp?.(
                        dcId,
                        "25",
                        dcTemplateId,
                        selectedTemplate.name,
                        rowId,
                        row.original.contact_id,
                        row.original.contact_type,
                        row.original.mobile_no,
                        row.original.isd,
                        table.options.meta?.companyDetails,
                        row.original.contact_name
                      );
                    }}
                    className="p-0 h-auto"
                  >
                    <MessageCircle className="text-base text-[#25D366]" />
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "invoice_no",
    accessorKey: "invoice_no",
    header: "Invoice No",
    cell: ({ row, table }) => {
      const invoiceId = row.original.invoice_id;
      const invoiceNo = row.original.invoice_no;
      const templateList = table.options.meta?.templateList || {};
      const invoiceTemplateId = table.options.meta?.invoiceTemplateId || "";
      const userRole = table.options.meta?.userRole || {};
      const isDownloading = table.options.meta?.isDownloading || {};
      const isSharing = table.options.meta?.isSharing || {};
      const rowId = `${invoiceId}-${invoiceTemplateId}-${row.index}`;
      const selectedTemplate = templateList["22"]?.find(
        (t) => t.id === invoiceTemplateId
      );

      return (
        <div className="flex flex-col items-center gap-2">
          <div className="whitespace-normal">{invoiceNo}</div>
          {invoiceId && invoiceTemplateId && selectedTemplate && (
            <div className="flex flex-row items-center gap-2">
              {isDownloading[rowId] ? (
                <span className="text-xs text-gray-500">downloading...</span>
              ) : (
                userRole?.invoice?.canViewInvoiceonExpressPortal == 1 && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={isDownloading[rowId]}
                    onClick={() => {
                      table.options.meta?.handleDownloadTemplate?.(
                        invoiceId,
                        "22",
                        invoiceTemplateId,
                        selectedTemplate.name,
                        rowId
                      );
                    }}
                    className="p-0 h-auto"
                  >
                    <Download className="text-base" />
                  </Button>
                )
              )}
              {isSharing[rowId] ? (
                <span className="text-xs text-gray-500">sending...</span>
              ) : (
                userRole?.invoice?.canWhatsappInvoiceonExpressPortal == 1 && (
                  <Button
                    variant="link"
                    size="sm"
                    disabled={isSharing[rowId]}
                    onClick={() => {
                      table.options.meta?.handleShareWhatsapp?.(
                        invoiceId,
                        "22",
                        invoiceTemplateId,
                        selectedTemplate.name,
                        rowId,
                        row.original.contact_id,
                        row.original.contact_type,
                        row.original.mobile_no,
                        row.original.isd,
                        table.options.meta?.companyDetails,
                        row.original.contact_name
                      );
                    }}
                    className="p-0 h-auto"
                  >
                    <MessageCircle className="text-base text-[#25D366]" />
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "dc_date",
    accessorKey: "dc_date",
    header: "DC Date",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.dc_date}</div>
    ),
    enableSorting: false,
  },
  {
    id: "delivery_type",
    accessorKey: "delivery_type",
    header: "Delivery type",
    cell: ({ row }) => {
      const deliveryType = row.original.delivery_type;
      return (
        <div className="whitespace-normal">
          {deliveryType == "2"
            ? "Delivery"
            : deliveryType == "1"
            ? "Pickup from store"
            : deliveryType}
        </div>
      );
    },
    enableSorting: false,
    omit: (deliveryType) => deliveryType == "2",
  },
  {
    id: "company_name",
    accessorKey: "company_name",
    header: "Company",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.company_name}</div>
    ),
    enableSorting: false,
  },
  {
    id: "branch_name",
    accessorKey: "branch_name",
    header: "Branch",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.branch_name}</div>
    ),
    enableSorting: false,
  },
  {
    id: "area",
    accessorKey: "area",
    header: "Area",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.area || "N/A"}</div>
    ),
    enableSorting: false,
  },
  {
    id: "pincode",
    accessorKey: "pincode",
    header: "Pincode",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.pincode || "N/A"}</div>
    ),
    enableSorting: false,
  },
  {
    id: "route_name",
    accessorKey: "route_name",
    header: "Selected Route",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.route_name || "N/A"}</div>
    ),
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "transport",
  },
  {
    id: "pending_amount",
    accessorKey: "pending_amount",
    header: () => (
      <div>
        <div>Amount</div>
        <div>(Pending)</div>
      </div>
    ),
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.pending_amount}</div>
    ),
    enableSorting: false,
  },
  {
    id: "status",
    accessorKey: "status",
    header: () => (
      <div>
        <div>Delivery</div>
        <div>Status</div>
      </div>
    ),
    cell: ({ row }) => row.original.status,
    enableSorting: false,
  },
  {
    id: "payment_status",
    accessorKey: "payment_status",
    header: () => (
      <div>
        <div>Payment</div>
        <div>Status</div>
      </div>
    ),
    cell: ({ row }) => row.original.payment_status,
    enableSorting: false,
  },
  {
    id: "shipp_through",
    accessorKey: "shipp_through",
    header: "Ship Through",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.shipp_through || "N/A"}</div>
    ),
    enableSorting: true,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "transporter_name",
    accessorKey: "transporter_name",
    header: "Transporter",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.transporter_name || "N/A"}</div>
    ),
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "vehicle_no",
    accessorKey: "vehicle_no",
    header: "Vehicle No",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.vehicle_no || "N/A"}</div>
    ),
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "lr_no",
    accessorKey: "lr_no",
    header: "LR No",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.lr_no || "N/A"}</div>
    ),
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "lr_date",
    accessorKey: "lr_date",
    header: "LR Date",
    cell: ({ row }) => (
      <div className="whitespace-normal">{row.original.lr_date || "N/A"}</div>
    ),
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "lr_attach",
    accessorKey: "lr_attach",
    header: "LR Attach",
    cell: ({ row }) => {
      const imagePath = row.original.image_path;
      const imageName = row.original.image_name;
      if (
        !imagePath ||
        imagePath === "N/A" ||
        imagePath.trim() === ""
      ) {
        return <span></span>;
      }
      return (
        <div className="flex justify-center items-center w-full">
          <Download
            className="cursor-pointer text-blue-500 text-xl"
            onClick={() => {
              const link = document.createElement("a");
              link.href = imagePath;
              link.download = imageName || "downloaded_file";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          />
        </div>
      );
    },
    enableSorting: false,
    omit: (deliveryType, viewType) =>
      deliveryType == "1" || viewType == "route",
  },
  {
    id: "cumulativeDistance",
    accessorKey: "cumulativeDistance",
    header: () => (
      <div>
        <div>Cumulative</div>
        <div>Distance (km)</div>
      </div>
    ),
    cell: ({ row }) => (
      <div>{row.original.cumulativeDistance || "N/A"}</div>
    ),
    enableSorting: false,
  },
];

