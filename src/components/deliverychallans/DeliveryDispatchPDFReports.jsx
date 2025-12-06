"use client";

import React from "react";
import { FileText } from "lucide-react";
import { format } from "date-fns";

// Cache for loaded modules
let cachedModules = null;

// Load modules dynamically to avoid SSR issues
const loadPDFModules = async () => {
  if (cachedModules) {
    return cachedModules;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    // Import both modules
    const [jsPDFModule, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    
    const jsPDF = jsPDFModule.default;
    
    // Get autoTable function - in v5 it's exported as default
    let autoTableFn = autoTableModule.default;
    
    // If default is not a function, try other exports
    if (typeof autoTableFn !== "function") {
      autoTableFn = autoTableModule.autoTable;
    }
    
    // If still not a function, check if it extended the prototype
    if (typeof autoTableFn !== "function") {
      const testDoc = new jsPDF();
      if (typeof testDoc.autoTable === "function") {
        // Use prototype method
        autoTableFn = (doc, options) => doc.autoTable(options);
      } else {
        throw new Error("autoTable is not available. Please ensure jspdf-autotable is properly installed.");
      }
    }
    
    // Cache and return
    cachedModules = {
      jsPDF,
      autoTable: autoTableFn
    };
    
    return cachedModules;
  } catch (error) {
    console.error("Error loading PDF modules:", error);
    throw error;
  }
};

const DeliveryDispatchPDFReports = ({
  filteredDcDispatchData,
  filteredDcDispatchSummaryData,
  route_id,
  selectedRoute,
}) => {

  const exportPDF = async () => {
    // Load modules
    const modules = await loadPDFModules();
    if (!modules) {
      console.error("Failed to load jsPDF modules");
      return;
    }
    const { jsPDF, autoTable } = modules;
    
    const unit = "pt";
    const size = "A4";
    const orientation = "portrait";
    const marginLeft = 40;
    const doc = new jsPDF(orientation, unit, size);

    doc.setFontSize(15);
    const title = "Route and Product wise Delivery Challan Report";

    const headers = [
      [
        "#",
        "DC No",
        "DC Date",
        "Company",
        "Branch",
        "Contact",
        "Product Name",
        "Qty",
        "Unit",
        "Secondary Qty",
        "Secondary Unit",
        "Pending Amount",
        "Cumulative Distance (km)",
      ],
    ];

    const data = filteredDcDispatchData
      ?.filter((item) => item.id !== "total")
      ?.map((elt, index) => {
        const qtyText =
          typeof elt.qty === "object" && elt.qty?.props?.children
            ? elt.qty.props.children[0]
            : elt.qty;
        const unitText =
          typeof elt.qty === "object" &&
          elt.qty?.props?.children?.[2]?.props?.children?.[1]
            ? elt.qty.props.children[2].props.children[1]
            : "";
        const secQtyText =
          typeof elt.sec_qty === "object" && elt.sec_qty?.props?.children
            ? elt.sec_qty.props.children[0]
            : elt.sec_qty;
        const secUnitText =
          typeof elt.sec_qty === "object" &&
          elt.sec_qty?.props?.children?.[2]?.props?.children?.[1]
            ? elt.sec_qty.props.children[2].props.children[1]
            : "";

        return [
          index + 1,
          elt.dcno,
          elt.dcdate,
          elt.company_name,
          elt.branch_name,
          elt.contact_name,
          elt.prodname,
          qtyText,
          unitText,
          secQtyText,
          secUnitText,
          elt.pending_amount,
          elt.cumulativeDistance,
        ];
      });

    let totalQty = 0;
    let totalSecQty = 0;
    let totalAmount = 0;

    filteredDcDispatchData
      ?.filter((item) => item.id !== "total")
      ?.forEach((elt_rec) => {
        const qtyText =
          typeof elt_rec.qty === "object" && elt_rec.qty?.props?.children
            ? elt_rec.qty.props.children[0]
            : elt_rec.qty;
        const secQtyText =
          typeof elt_rec.sec_qty === "object" &&
          elt_rec.sec_qty?.props?.children
            ? elt_rec.sec_qty.props.children[0]
            : elt_rec.sec_qty;

        totalQty += parseFloat(qtyText) || 0;
        totalSecQty += parseFloat(secQtyText) || 0;
        totalAmount += parseFloat(elt_rec.pending_amount) || 0;
      });

    const footer = [
      [
        "Total",
        "",
        "",
        "",
        "",
        "",
        "",
        totalQty,
        "",
        totalSecQty,
        "",
        Math.round(totalAmount * 100) / 100,
        "",
      ],
    ];

    const styles = { font: "times", fontSize: 8 };
    let content = {
      styles: styles,
      startY: 60,
      head: headers,
      body: data,
      foot: footer,
      theme: "striped",
    };

    doc.text(title, marginLeft, 40);
    autoTable(doc, content);
    doc.save("Route_productwise_dc_report.pdf");
  };

  const exportRouteWisePDF = async () => {
    // Load modules
    const modules = await loadPDFModules();
    if (!modules) {
      console.error("Failed to load jsPDF modules");
      return;
    }
    const { jsPDF, autoTable } = modules;
    
    const unit = "pt";
    const size = "A4";
    const orientation = "portrait";
    const marginLeft = 40;
    const doc = new jsPDF(orientation, unit, size);

    doc.setFontSize(15);
    const title = "Route wise Delivery Challan Report";

    const headers = [
      [
        "#",
        "Contact",
        "DC No",
        "Invoice No",
        "DC Date",
        "Pending Amount",
        "Delivery Status",
        "Payment Status",
      ],
    ];

    const data = filteredDcDispatchSummaryData?.map((elt, index) => {
      const statusText =
        typeof elt.status === "object" && elt.status?.props?.children
          ? elt.status.props.children
          : elt.status;

      return [
        index + 1,
        elt.contact_name,
        elt.dc_fullno_text || elt.dc_fullno,
        elt.invoice_no || "-",
        elt.dc_date,
        elt.pending_amount,
        statusText || "-",
        "",
      ];
    });

    const styles = { font: "times", fontSize: 8 };
    let content = {
      styles: styles,
      startY: 60,
      head: headers,
      body: data,
      theme: "striped",
    };

    doc.text(title, marginLeft, 40);
    autoTable(doc, content);
    doc.save("Route_wise_dc_report.pdf");
  };

  const exportPDFAreaWise = async () => {
    // Load modules
    const modules = await loadPDFModules();
    if (!modules) {
      console.error("Failed to load jsPDF modules");
      return;
    }
    const { jsPDF, autoTable } = modules;
    
    const unit = "pt";
    const size = "A4";
    const orientation = "portrait";
    const marginLeft = 40;
    const doc = new jsPDF(orientation, unit, size);

    const title = "Delivery History Report (Product Loading Unloading Summary)";
    doc.setFontSize(15);
    doc.setFont("times", "normal");
    doc.text(title, marginLeft, 30);

    let routeSequence = "";
    if (selectedRoute?.name && selectedRoute?.area) {
      routeSequence = `Route:- ${selectedRoute.name}\nArea: ${selectedRoute.area
        .split(",")
        .reverse()
        .join(" -> ")}`;
    } else if (
      Array.isArray(filteredDcDispatchData) &&
      filteredDcDispatchData.length > 0
    ) {
      const uniqueRoutes = [
        ...new Set(
          filteredDcDispatchData
            .map((elt) => elt.route_name?.trim())
            .filter(Boolean)
        ),
      ];
      const uniqueRouteName = uniqueRoutes.length === 1 ? uniqueRoutes[0] : "";

      const areaOrder = [];
      const seenAreas = new Set();
      filteredDcDispatchData.forEach((elt) => {
        const area = elt.area?.trim() || "N/A";
        if (!seenAreas.has(area) && area !== "N/A") {
          seenAreas.add(area);
          areaOrder.push(area);
        }
      });

      const areaSequence = areaOrder.reverse().join(" -> ");

      if (uniqueRouteName) {
        routeSequence = `Route:- ${uniqueRouteName}\nArea: ${areaSequence}`;
      } else if (areaSequence) {
        routeSequence = `Route: ${areaSequence}`;
      }
    }

    doc.setFontSize(12);
    doc.setFont("times", "normal");
    const routeLines = doc.splitTextToSize(
      routeSequence,
      doc.internal.pageSize.width - marginLeft * 2
    );
    const lineHeight = 12;
    const routeHeight = routeLines.length * lineHeight;
    const routeStartY = 50;
    doc.text(routeLines, marginLeft, routeStartY);

    const marginBelowRoute = 20;
    let startY = routeStartY + routeHeight + marginBelowRoute;

    const groupedData = filteredDcDispatchData
      ?.filter((item) => item.id !== "total")
      ?.reduce((acc, elt) => {
        const area = elt.area || "N/A";
        if (!acc[area]) acc[area] = [];
        acc[area].push(elt);
        return acc;
      }, {});

    const areaOrder = [];
    const seenAreas = new Set();
    filteredDcDispatchData
      ?.filter((item) => item.id !== "total")
      ?.forEach((elt) => {
        const area = elt.area || "N/A";
        if (!seenAreas.has(area)) {
          seenAreas.add(area);
          areaOrder.push(area);
        }
      });

    const reversedAreaOrder = areaOrder.reverse();

    doc.setFontSize(10);
    doc.setFont("times", "normal");

    reversedAreaOrder.forEach((area, index) => {
      const dataForArea = groupedData[area] || [];
      const areaTitle = `(${index + 1}) Route: ${area}`;

      const groupedByProduct = dataForArea.reduce((acc, elt) => {
        const productName = elt.prodname;
        const qtyText =
          typeof elt.qty === "object" && elt.qty?.props?.children
            ? elt.qty.props.children[0]
            : elt.qty;
        const secQtyText =
          typeof elt.sec_qty === "object" && elt.sec_qty?.props?.children
            ? elt.sec_qty.props.children[0]
            : elt.sec_qty;

        const qty = parseFloat(qtyText) || 0;
        const sec_qty = parseFloat(secQtyText) || 0;

        if (productName && qty > 0 && sec_qty > 0) {
          if (!acc[productName]) {
            acc[productName] = {
              qty: 0,
              sec_qty: 0,
            };
          }
          acc[productName].qty += qty;
          acc[productName].sec_qty += sec_qty;
        }
        return acc;
      }, {});

      const headers = [["Product Name", "Qty", "Secondary Qty"]];
      const data = Object.keys(groupedByProduct).map((prodName) => [
        prodName,
        groupedByProduct[prodName].qty,
        groupedByProduct[prodName].sec_qty,
      ]);

      let totalQty = 0;
      let totalSecQty = 0;
      data.forEach((row) => {
        totalQty += row[1];
        totalSecQty += row[2];
      });

      const footer = [["Total", totalQty, totalSecQty]];

      const styles = { font: "times", fontSize: 8 };

      doc.setFontSize(10);
      doc.setFont("times", "bold");
      if (index > 0) startY += 10;
      doc.text(areaTitle, marginLeft, startY);
      doc.setFontSize(10);
      doc.setFont("times", "normal");

      let content = {
        styles: styles,
        startY: startY + 10,
        head: headers,
        body: data,
        foot: footer,
        theme: "striped",
        didDrawPage: (data) => {
          startY = data.cursor.y;
        },
        showFoot: "lastPage",
      };

      autoTable(doc, content);
      startY += 20;
    });

    doc.save("delivery_history_report_product_summary.pdf");
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={exportRouteWisePDF}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-gray-700 hover:text-gray-900"
      >
        <div className="flex items-center justify-center w-6 h-6 bg-red-600 rounded">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          Route Wise Delivery Challan Report
        </span>
      </button>
      <button
        onClick={exportPDF}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-gray-700 hover:text-gray-900"
      >
        <div className="flex items-center justify-center w-6 h-6 bg-red-600 rounded">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          Route and Product wise Delivery Challan Report
        </span>
      </button>
      <button
        onClick={exportPDFAreaWise}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-gray-700 hover:text-gray-900"
      >
        <div className="flex items-center justify-center w-6 h-6 bg-red-600 rounded">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          Product Loading Unloading Report
        </span>
      </button>
    </div>
  );
};

export default DeliveryDispatchPDFReports;

