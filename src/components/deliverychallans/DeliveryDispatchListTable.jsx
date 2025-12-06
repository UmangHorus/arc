"use client";

import React, {
  Fragment,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLoginStore } from "@/stores/auth.store";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { useCompanyDetails } from "@/hooks/useCompanyDetails";
import OrderProcessingService from "@/lib/OrderProcessingService";
import SalesorderList from "./SalesorderList";
import {
  tableColumns,
  dispatchSummaryTableColumns,
} from "./DeliveryDispatchListTableColumns";
import DeliveryChallanDetailDialog from "@/components/shared/DeliveryChallanDetailDialog";
import DeliveryStatusDialog from "@/components/shared/DeliveryStatusDialog";
import ShareWhatsappModal from "@/components/shared/ShareWhatsappModal";
import PaymentReceiptDialog from "@/components/shared/PaymentReceiptDialog";
import DeliveryDispatchPDFReports from "./DeliveryDispatchPDFReports";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HashLoader } from "react-spinners";

const DeliveryDispatchListTable = () => {
  const { user, token, appConfig } = useLoginStore();
  const { companyBranchDivisionData, routeList } = useSharedDataStore();
  const { companyDetails } = useCompanyDetails();

  const companies = companyBranchDivisionData?.companies || [];
  const branches = companyBranchDivisionData?.branches || [];
  const route_arr = routeList || [];

  // Helper function for Payment Status Badge
  const getPaymentStatusBadge = (status) => {
    let backgroundColor = "";
    let textColor = "";
    let displayText = status || "-";

    if (status === "Paid") {
      backgroundColor = "rgba(40, 127, 113, 0.1)";
      textColor = "#287F71";
    } else if (status === "Un Paid") {
      backgroundColor = "rgba(236, 52, 76, 0.1)";
      textColor = "#EC344C";
    } else {
      backgroundColor = "rgba(245, 148, 64, 0.1)";
      textColor = "#F59440";
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

  // Helper function for Delivery Status Badge
  const getDeliveryStatusBadge = (status) => {
    let backgroundColor = "";
    let textColor = "";
    let displayText = status || "-";

    if (status === "Delivered") {
      backgroundColor = "rgba(40, 127, 113, 0.1)";
      textColor = "#287F71";
    } else if (status === "Dispatched") {
      backgroundColor = "rgba(40, 127, 113, 0.1)";
      textColor = "#287F71";
    } else if (status === "Returned") {
      backgroundColor = "rgba(236, 52, 76, 0.1)";
      textColor = "#EC344C";
    } else if (status === "Pending") {
      backgroundColor = "rgba(245, 148, 64, 0.1)";
      textColor = "#F59440";
    } else {
      backgroundColor = "rgba(156, 163, 175, 0.1)";
      textColor = "#6B7280";
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

  // State declarations
  const [pending, setPending] = useState(true);
  const [dcdispatchdata, setDCDispatchdata] = useState([]);
  const [dcdispatchsummarydata, setDCDispatchSummaryData] = useState([]);
  const [filteredDcDispatchData, setFilteredDcDispatchData] = useState([]);
  const [filteredDcDispatchSummaryData, setFilteredDcDispatchSummaryData] =
    useState([]);
  const [status, setStatus] = useState("1");
  const [route_id, setRouteID] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [dcDate, setDcDate] = useState("");
  const [deliveryType, setDeliveryType] = useState("2");
  const [viewType, setViewType] = useState("route");
  const [seltransporter, setSeltransporter] = useState("");
  const [transporterList, setTransporterList] = useState([]);
  const [selectedSummaryItem, setSelectedSummaryItem] = useState(null);
  const [showDcModal, setShowDcModal] = useState(false);
  const [dcDetails, setDcDetails] = useState({});
  const [isDeliveryStatusModalOpen, setIsDeliveryStatusModalOpen] =
    useState(false);
  const [selectedDc, setSelectedDc] = useState(null);
  const [dcpId, setDcpId] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentOrderData, setPaymentOrderData] = useState(null);
  const [paymentPendingAmount, setPaymentPendingAmount] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareParams, setShareParams] = useState(null);
  const [templateList, setTemplateList] = useState({});
  const [dcTemplateId, setDcTemplateId] = useState("");
  const [invoiceTemplateId, setInvoiceTemplateId] = useState("");
  const [isDownloading, setIsDownloading] = useState({});
  const [isSharing, setIsSharing] = useState({});
  const [sortedDCs, setSortedDCs] = useState([]);
  const [isDcDetailsLoading, setIsDcDetailsLoading] = useState(false);

  // Fetch transporter list
  const { data: transporterData } = useQuery({
    queryKey: ["transporterList", token],
    queryFn: async () => {
      const response = await OrderProcessingService.getTransporterList({
        token,
      });
      const responseData = Array.isArray(response) ? response[0] : response;
      if (responseData?.STATUS === "SUCCESS") {
        return responseData.DATA || [];
      }
      return [];
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (transporterData?.transporter_list?.length > 0) {
      setTransporterList(transporterData.transporter_list);
      if (!seltransporter && transporterData.transporter_list[0]?.contact_id) {
        setSeltransporter(transporterData.transporter_list[0].contact_id);
      }
    }
  }, [transporterData, seltransporter]);

  // Fetch template list
  const { data: templateData } = useQuery({
    queryKey: ["templateList", token],
    queryFn: async () => {
      const response = await OrderProcessingService.getTemplateList({ token });
      if (response?.STATUS === "SUCCESS") {
        return response.DATA || {};
      }
      return {};
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (templateData) {
      setTemplateList(templateData);
      if (templateData["25"]?.length > 0 && !dcTemplateId) {
        setDcTemplateId(templateData["25"][0].id);
      }
      if (templateData["22"]?.length > 0 && !invoiceTemplateId) {
        setInvoiceTemplateId(templateData["22"][0].id);
      }
    }
  }, [templateData, dcTemplateId, invoiceTemplateId]);

  // Set default company and branch
  useEffect(() => {
    if (companies?.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0].company_id);
    }
    if (branches?.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].branch_id);
    }
  }, [companies, branches, selectedCompany, selectedBranch]);

  // Fetch dispatch delivery challan list
  const fetchDispatchList = useCallback(
    async (
      dc_status,
      dc_route_id,
      company_id,
      branch_id,
      transport_id = null,
      delivery_type = null
    ) => {
      setPending(true);
      try {
        const response =
          await OrderProcessingService.getDispatchDeliveryChallanList({
            token,
            employeeId: user?.id,
            status: dc_status || "",
            companyId: company_id,
            branchId: branch_id,
            routeId: viewType === "route" ? dc_route_id : null,
            transportId: viewType === "transport" ? transport_id : null,
            deliveryType: delivery_type,
          });

        const responseData = Array.isArray(response) ? response[0] : response;

        if (
          responseData?.STATUS === "SUCCESS" &&
          responseData.DATA?.dclist?.length > 0
        ) {
          const dclist_arr = responseData.DATA.dclist;

          // Process data based on view type
          if (viewType === "route" && dc_route_id) {
            // TODO: Implement route sorting logic if needed
            // For now, use data as-is
          }

          const detailedData = processDetailedDispatchData(dclist_arr);
          const summaryData = createDispatchSummaryData(dclist_arr);

          setDCDispatchdata(detailedData);
          setDCDispatchSummaryData(summaryData);
          setFilteredDcDispatchSummaryData(summaryData);
          setFilteredDcDispatchData(detailedData);
        } else {
          setDCDispatchdata([]);
          setDCDispatchSummaryData([]);
          setSortedDCs([]);
          setFilteredDcDispatchSummaryData([]);
          setFilteredDcDispatchData([]);
        }
      } catch (error) {
        console.error("Error fetching DC list:", error);
        toast.error("Failed to fetch delivery challan list");
        setDCDispatchdata([]);
        setDCDispatchSummaryData([]);
        setSortedDCs([]);
        setFilteredDcDispatchSummaryData([]);
        setFilteredDcDispatchData([]);
      } finally {
        setPending(false);
      }
    },
    [token, user?.id, viewType]
  );

  // Fetch data when filters change
  useEffect(() => {
    if (status && selectedCompany && selectedBranch) {
      if (deliveryType == "1") {
        fetchDispatchList(null, null, selectedCompany, selectedBranch, null, deliveryType);
      } else if (deliveryType == "2") {
        if (viewType == "route") {
          fetchDispatchList(status, route_id, selectedCompany, selectedBranch, null, deliveryType);
        } else if (viewType == "transport" && seltransporter) {
          fetchDispatchList(status, null, selectedCompany, selectedBranch, seltransporter, deliveryType);
        }
      }
    }
  }, [
    status,
    route_id,
    selectedCompany,
    selectedBranch,
    viewType,
    seltransporter,
    deliveryType,
    fetchDispatchList,
  ]);

  // Process detailed dispatch data
  const processDetailedDispatchData = (dclist_arr) => {
    const processedOrderIds = new Set();
    const convertedTableData = dclist_arr?.map((item, i) => {
      const isDuplicate = processedOrderIds.has(item.dc_id);
      processedOrderIds.add(item.dc_id);

      const displayAction =
        item.status != "Returned" &&
        (item.status != "Delivered" ||
          (item.status == "Delivered" &&
            (item.payment_status == "Un Paid" ||
              item.payment_status == "Partially Paid")));


      const qtyValue = parseFloat(item.quantity) || 0;
      const qtyDecimals =
        item.allow_product_decimals_point != "" &&
          !isNaN(parseInt(item.allow_product_decimals_point, 10))
          ? parseInt(item.allow_product_decimals_point, 10)
          : 2;
      const qtyIsInteger = Number.isInteger(qtyValue);
      const formattedQty =
        qtyValue === 0
          ? "0"
          : qtyIsInteger
            ? qtyValue.toString()
            : qtyValue.toFixed(qtyDecimals);

      const conversionFactor = parseFloat(item.conversion_factor) || 1;
      const secQtyValue = conversionFactor > 0 ? qtyValue * conversionFactor : 0;
      const secQtyIsInteger = Number.isInteger(secQtyValue);
      const formattedSecQty =
        secQtyValue === 0
          ? "0"
          : secQtyIsInteger
            ? secQtyValue.toString()
            : secQtyValue.toFixed(qtyDecimals);

      return {
        id: i,
        dc_id: item.dc_id,
        dcno: item.dc_fullno,
        dcdate: item.dc_date,
        invoice_id: item.invoice_id,
        invoice_no: item.invoice_no,
        shipp_through: item.shipp_through || "N/A",
        contact_name: item.contact_name,
        contact_id: item.contact_id,
        contact_type: item.contact_type || "",
        mobile_no: item.mobile_no || "",
        area: item.area || "N/A",
        pincode: item.pincode || "N/A",
        prodname: `${item.name} (${item.code})`,
        qty: (
          <span>
            {formattedQty}{" "}
            {item.unit !== "" ? (
              <>
                <br />
                {item.unit}
              </>
            ) : (
              ""
            )}
          </span>
        ),
        sec_qty: (
          <span>
            {conversionFactor > 0 ? formattedSecQty : ""}{" "}
            {item.sec_unit !== "" ? (
              <>
                <br />
                {item.sec_unit}
              </>
            ) : (
              ""
            )}
          </span>
        ),
        full_address: item.full_address,
        branch_name: item.branch_name,
        branch_id: item.branch_id,
        company_name: item.company_name,
        company_id: item.company_id,
        isd: item.isd || "",
        route_name: item.route_name || "N/A",
        route_id: item.route_id || "",
        transporter: item.transporter_name || "N/A",
        transport_id: item.transport_id || "",
        vehicleno: item.vehicle_no || "N/A",
        delivery_type: item.delivery_type || "",
        lrno: item.lr_no || "N/A",
        lrdate: item.lr_date || "N/A",
        image_path:
          item.image_path && item.image_path.trim() !== ""
            ? item.image_path
            : "N/A",
        image_name: item.image_name || "N/A",
        status: getDeliveryStatusBadge(item.status),
        pending_amount: item.pending_amount,
        payment_status: getPaymentStatusBadge(item.payment_status),
        so_id: item.so_id,
        isDuplicate: isDuplicate,
        action: displayAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Action
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {item.status === "Dispatched" && (
                <DropdownMenuItem
                  onClick={() =>
                    updateDCDispatchStatus(item.dcp_id, 2, item.mobile_no, item)
                  }
                >
                  Delivered
                </DropdownMenuItem>
              )}
              {item.status == "Delivered" &&
                item.so_id > 0 &&
                (item.payment_status == "Un Paid" ||
                  item.payment_status == "Partially Paid") && (
                  <DropdownMenuItem
                    onClick={() =>
                      openPaymentOrder(item.so_id, item.pending_amount, item)
                    }
                  >
                    Create Receipt
                  </DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        cumulativeDistance: item.cumulativeDistance?.toFixed(2) || "N/A",
      };
    });

    // Add total row
    if (convertedTableData.length > 0) {
      let totalQty = 0;
      let totalSecQty = 0;
      dclist_arr.forEach((item) => {
        const qtyValue = parseFloat(item.quantity) || 0;
        const conversionFactor = parseFloat(item.conversion_factor) || 1;
        totalQty += qtyValue;
        totalSecQty += conversionFactor > 0 ? qtyValue * conversionFactor : 0;
      });

      const qtyDecimals =
        dclist_arr[0]?.allow_product_decimals_point != "" &&
          !isNaN(parseInt(dclist_arr[0]?.allow_product_decimals_point, 10))
          ? parseInt(dclist_arr[0]?.allow_product_decimals_point, 10)
          : 2;

      const totalQtyIsInteger = Number.isInteger(totalQty);
      const formattedTotalQty =
        totalQty === 0
          ? "0"
          : totalQtyIsInteger
            ? totalQty.toString()
            : totalQty.toFixed(qtyDecimals);

      const totalSecQtyIsInteger = Number.isInteger(totalSecQty);
      const formattedTotalSecQty =
        totalSecQty === 0
          ? "0"
          : totalSecQtyIsInteger
            ? totalSecQty.toString()
            : totalSecQty.toFixed(qtyDecimals);

      convertedTableData.push({
        id: "total",
        qty: <span className="font-bold">{formattedTotalQty}</span>,
        sec_qty: <span className="font-bold">{formattedTotalSecQty}</span>,
      });
    }

    return convertedTableData;
  };

  // Create dispatch summary data
  const createDispatchSummaryData = (dclist) => {
    const summaryMap = new Map();

    dclist.forEach((item) => {
      if (!summaryMap.has(item.dc_id)) {
        summaryMap.set(item.dc_id, {
          dc_id: item.dc_id,
          dc_fullno:
            companyDetails?.so_listing_transaction_config == "0"
              ? (summaryItem) => (
                <button
                  className="font-bold text-[#287F71] hover:underline"
                  title="Click to view delivery challan"
                  onClick={async () => {
                    await fetchDcdetails(item.dc_id, summaryItem);
                  }}
                >
                  {item.dc_fullno}
                </button>
              )
              : item.dc_fullno,
          dc_date: item.dc_date,
          dc_fullno_text: item.dc_fullno,
          invoice_id: item.invoice_id,
          invoice_no: item.invoice_no,
          shipp_through: item.shipp_through || "N/A",
          contact_name: item.contact_name,
          contact_id: item.contact_id,
          contact_type: item.contact_type || "",
          mobile_no: item.mobile_no,
          branch_name: item.branch_name,
          branch_id: item.branch_id,
          company_name: item.company_name,
          company_id: item.company_id,
          isd: item.isd || "",
          area: item.area,
          route_name: item.route_name,
          route_id: item.route_id || "",
          pincode: item.pincode,
          full_address: item.full_address,
          transporter_name: item.transporter_name || "N/A",
          transport_id: item.transport_id || "",
          vehicle_no: item.vehicle_no || "N/A",
          delivery_type: item.delivery_type || "",
          lr_no: item.lr_no || "N/A",
          lr_date: item.lr_date || "N/A",
          status: item.status,
          statusDisplay: getDeliveryStatusBadge(item.status),
          pending_amount: item.pending_amount,
          payment_status: item.payment_status,
          payment_statusDisplay: getPaymentStatusBadge(item.payment_status),
          so_id: item.so_id,
          image_path: item.image_path,
          image_name: item.image_name,
          dcp_id: item.dcp_id,
          products: [],
          cumulativeDistance: item.cumulativeDistance?.toFixed(2) || "N/A",
        });
      }

      const dcEntry = summaryMap.get(item.dc_id);
      const qtyValue = parseFloat(item.quantity) || 0;
      const qtyDecimals =
        item.allow_product_decimals_point != "" &&
          !isNaN(parseInt(item.allow_product_decimals_point, 10))
          ? parseInt(item.allow_product_decimals_point, 10)
          : 2;
      const qtyIsInteger = Number.isInteger(qtyValue);
      const formattedQty =
        qtyValue === 0
          ? "0"
          : qtyIsInteger
            ? qtyValue.toString()
            : qtyValue.toFixed(qtyDecimals);

      const conversionFactor = parseFloat(item.conversion_factor) || 1;
      const secQtyValue = qtyValue * conversionFactor;
      const secQtyIsInteger = Number.isInteger(secQtyValue);
      const formattedSecQty =
        secQtyValue === 0
          ? "0"
          : secQtyIsInteger
            ? secQtyValue.toString()
            : secQtyValue.toFixed(qtyDecimals);

      dcEntry.products.push({
        dcp_id: item.dcp_id,
        name: item.name,
        code: item.code,
        quantity: qtyValue,
        unit: item.unit,
        sec_unit: item.sec_unit,
        conversion_factor: conversionFactor,
        sec_quantity: secQtyValue,
        allow_product_decimals_point: item.allow_product_decimals_point,
        formatted_quantity: formattedQty,
        formatted_sec_quantity: formattedSecQty,
      });
    });

    const summaryData = Array.from(summaryMap.values()).map((dc) => {
      const displayAction =
        dc.status != "Returned" &&
        (dc.status != "Delivered" ||
          (dc.status == "Delivered" &&
            (dc.payment_status == "Un Paid" ||
              dc.payment_status == "Partially Paid")));

      const summaryItem = {
        ...dc,
        action: displayAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Action
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {dc.status == "Dispatched" && (
                <DropdownMenuItem
                  onClick={() =>
                    updateDCDispatchStatus(dc.dcp_id, 2, dc.mobile_no, dc)
                  }
                >
                  Delivered
                </DropdownMenuItem>
              )}
              {dc.status == "Delivered" &&
                dc.so_id > 0 &&
                (dc.payment_status == "Un Paid" ||
                  dc.payment_status == "Partially Paid") && (
                  <DropdownMenuItem
                    onClick={() =>
                      openPaymentOrder(dc.so_id, dc.pending_amount, dc)
                    }
                  >
                    Create Receipt
                  </DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        status: dc.statusDisplay,
        payment_status: dc.payment_statusDisplay,
      };

      // Keep dc_fullno as a function if it is one - don't convert to element
      // The column cell renderer will handle calling it
      // if (typeof dc.dc_fullno == "function") {
      //   summaryItem.dc_fullno = dc.dc_fullno(summaryItem);
      // }

      return summaryItem;
    });

    return summaryData;
  };

  // Fetch DC details
  const fetchDcdetails = async (dc_id, summaryItem) => {
    try {
      setSelectedSummaryItem(summaryItem);
      setShowDcModal(true);
      setIsDcDetailsLoading(true);
      setDcDetails({});

      const response = await OrderProcessingService.getDCDetails({
        token,
        dcId: dc_id,
      });

      const responseData = Array.isArray(response) ? response[0] : response;

      if (responseData?.STATUS === "SUCCESS") {
        setDcDetails(responseData.Data);
      } else {
        toast.error("Failed to fetch delivery challan details");
        setShowDcModal(false);
      }
    } catch (error) {
      console.error("Error fetching delivery challan details:", error);
      toast.error("Failed to fetch delivery challan details");
      setShowDcModal(false);
    } finally {
      setIsDcDetailsLoading(false);
    }
  };

  // Update DC dispatch status
  const updateDCDispatchStatus = (dcp_id, status, mobile_no, dc) => {
    setDcpId(dcp_id);
    setSelectedDc(dc);
    setIsDeliveryStatusModalOpen(true);
  };

  // Open payment order
  const openPaymentOrder = (salesorderid, so_pending_amount, dc) => {
    setPaymentOrderData({ salesorder_id: salesorderid });
    setPaymentPendingAmount(so_pending_amount);
    setSelectedDc(dc);
    setIsPaymentModalOpen(true);
  };

  // Handle route change
  const handleChangeRoute = (value) => {
    setRouteID(value || "");
    if (!value) {
      setFilteredDcDispatchSummaryData(dcdispatchsummarydata);
      setFilteredDcDispatchData(dcdispatchdata);
    } else {
      const filteredSummary = dcdispatchsummarydata.filter((item) =>
        item.route_id?.split(",").map((id) => id.trim()).includes(value)
      );
      const filteredSo = dcdispatchdata.filter((item) =>
        item.route_id?.split(",").map((id) => id.trim()).includes(value)
      );
      setFilteredDcDispatchSummaryData(filteredSummary);
      setFilteredDcDispatchData(filteredSo);
    }
  };

  // Handle DC date change
  const handleChangeDcDate = (e) => {
    const selectedDcDate = e.target.value;
    setDcDate(selectedDcDate);
  };

  // Filter by DC date
  useEffect(() => {
    if (dcDate == "") {
      setFilteredDcDispatchSummaryData(dcdispatchsummarydata);
      setFilteredDcDispatchData(dcdispatchdata);
    } else {
      const formattedSelectedDate = format(new Date(dcDate), "dd/MM/yyyy");
      const filteredSummary = dcdispatchsummarydata.filter(
        (item) => item.dc_date == formattedSelectedDate
      );
      const filteredSo = dcdispatchdata.filter(
        (item) => item.dcdate == formattedSelectedDate
      );
      setFilteredDcDispatchSummaryData(filteredSummary);
      setFilteredDcDispatchData(filteredSo);
    }
  }, [dcDate, dcdispatchsummarydata, dcdispatchdata]);

  // Handle download template
  const handleDownloadTemplate = async (
    transaction_id,
    transaction_type,
    template_id,
    templateName,
    rowId
  ) => {
    setIsDownloading((prev) => ({
      ...prev,
      [rowId]: true,
    }));

    try {
      const response = await OrderProcessingService.downloadTemplate({
        token,
        transactionId: transaction_id,
        transactionType: transaction_type,
        templateId: template_id,
      });

      if (response?.STATUS === "SUCCESS") {
        const { path } = response.DATA;
        const fileName =
          path.split("/").pop() || `${templateName}_${transaction_id}.docx`;

        const fileResponse = await fetch(path);
        if (!fileResponse.ok) {
          throw new Error("Failed to fetch the file");
        }

        const blob = await fileResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Template downloaded successfully");
      } else {
        throw new Error("API response status is not SUCCESS");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to download template. Please try again.";
      toast.error(errorMessage);
      console.error(errorMessage);
    } finally {
      setIsDownloading((prev) => ({
        ...prev,
        [rowId]: false,
      }));
    }
  };

  // Handle share WhatsApp
  const handleShareWhatsapp = (
    transaction_id,
    transaction_type,
    template_id,
    templateName,
    rowId,
    contact_id,
    contact_type,
    mobile_no,
    mobile_isd_no,
    companydetails,
    contact_name
  ) => {
    setShareParams({
      transaction_id,
      transaction_type,
      template_id,
      templateName,
      rowId,
      contact_id,
      contact_type,
      mobile_no,
      mobile_isd_no,
      contact_name,
    });
    setShareModalOpen(true);
  };

  // Memoized columns
  const memoizedTableColumns = useMemo(() => {
    const baseColumns =
      companyDetails?.so_listing_transaction_config == "0"
        ? dispatchSummaryTableColumns
        : tableColumns;

    return baseColumns;
  }, [companyDetails?.so_listing_transaction_config]);

  // Column visibility based on deliveryType and viewType
  const columnVisibility = useMemo(() => {
    const visibility = {};

    // Helper function to check if column should be visible
    const shouldShowColumn = (column) => {
      if (typeof column.omit === "function") {
        return !column.omit(deliveryType, viewType);
      }
      return !column.omit;
    };

    const baseColumns =
      companyDetails?.so_listing_transaction_config == "0"
        ? dispatchSummaryTableColumns
        : tableColumns;

    baseColumns.forEach((column) => {
      visibility[column.id] = shouldShowColumn(column);
    });

    return visibility;
  }, [deliveryType, viewType, companyDetails?.so_listing_transaction_config]);

  // Memoized table meta
  const tableMeta = useMemo(
    () => ({
      templateList,
      dcTemplateId,
      invoiceTemplateId,
      userRole: appConfig?.user_role || {},
      isDownloading,
      isSharing,
      companyDetails,
      handleDownloadTemplate,
      handleShareWhatsapp,
    }),
    [
      templateList,
      dcTemplateId,
      invoiceTemplateId,
      appConfig?.user_role,
      isDownloading,
      isSharing,
      companyDetails,
      handleDownloadTemplate,
      handleShareWhatsapp,
    ]
  );

  // Get route name
  const selectedRoute = route_arr?.find((route) => route.route_id == route_id);
  const areaDisplay = selectedRoute?.area
    ? selectedRoute.area.split(",").join(" -> ")
    : "";

  // Show loading spinner while API is being called
  if (pending) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
      </div>
    );
  }

  return (
    <Fragment>
      {/* Delivery Type and View Type Selectors */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-3">
        <div className="flex-shrink-0" style={{ width: "220px" }}>
          <Label htmlFor="deliveryType">Delivery Type</Label>
          <Select
            value={deliveryType}
            onValueChange={(value) => {
              setDeliveryType(value);
              if (value == "1") {
                setViewType("");
              } else {
                setViewType("route");
              }
            }}
          >
            <SelectTrigger id="deliveryType" className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">Delivery</SelectItem>
              <SelectItem value="1">Pickup from Store</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {deliveryType == "2" && (
          <div className="flex-shrink-0" style={{ width: "220px" }}>
            <Label htmlFor="viewType">View Type</Label>
            <Select value={viewType} onValueChange={setViewType} >
              <SelectTrigger id="viewType" className="w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="route">Route wise DCs</SelectItem>
                <SelectItem value="transport">Transport wise DCs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* PDF Export Buttons */}
        {deliveryType == "2" && viewType == "route" && (
          <div className="flex-1 flex justify-end items-end">
            <DeliveryDispatchPDFReports
              filteredDcDispatchData={filteredDcDispatchData}
              filteredDcDispatchSummaryData={filteredDcDispatchSummaryData}
              route_id={route_id}
              selectedRoute={selectedRoute}
            />
          </div>
        )}
      </div>

      {/* Info Message */}
      <div className="text-sm font-bold text-gray-700 mb-4 text-center md:text-left px-2">
        *Please select a company, branch, and delivery mode, then choose a route
        and DC date
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-4 bg-blue-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Company */}
          <div>
            <Label htmlFor="companySelect">Company</Label>
            <Select
              value={selectedCompany || undefined}
              onValueChange={setSelectedCompany}
            >
              <SelectTrigger id="companySelect" className="w-full bg-white">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem
                    key={company.company_id}
                    value={company.company_id?.toString()}
                  >
                    {company.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch */}
          <div>
            <Label htmlFor="branchSelect">Branch</Label>
            <Select
              value={selectedBranch || undefined}
              onValueChange={setSelectedBranch}
            >
              <SelectTrigger id="branchSelect" className="w-full bg-white">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem
                    key={branch.branch_id}
                    value={branch.branch_id?.toString()}
                  >
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Status */}
          {deliveryType == "2" && (
            <div>
              <Label htmlFor="status">Delivery Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="w-full bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Dispatched</SelectItem>
                  <SelectItem value="2">Delivered</SelectItem>
                  <SelectItem value="3">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Route or Transporter */}
          {deliveryType == "2" && (
            <div>
              {viewType == "route" ? (
                <>
                  <Label htmlFor="route_id">Route</Label>
                  <Select
                    value={route_id || "none"}
                    onValueChange={(value) =>
                      handleChangeRoute(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger id="route_id" className="w-full bg-white">
                      <SelectValue placeholder="Select Route" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select</SelectItem>
                      {route_arr
                        ?.filter((route) => {
                          const data =
                            companyDetails?.so_listing_transaction_config == "0"
                              ? dcdispatchsummarydata
                              : dcdispatchdata;
                          const routeIds = data
                            .map((item) => item.route_id)
                            .filter((id) => id);
                          return routeIds.includes(route.route_id);
                        })
                        .map((route) => (
                          <SelectItem
                            key={route.route_id}
                            value={route.route_id?.toString()}
                          >
                            {route.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {areaDisplay && (
                    <div className="mt-2 text-sm text-gray-600">
                      {areaDisplay}
                    </div>
                  )}
                </>
              ) : viewType == "transport" ? (
                <>
                  <Label htmlFor="transporter_id">Transporter</Label>
                  <Select
                    value={seltransporter || "none"}
                    onValueChange={(value) =>
                      setSeltransporter(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger id="transporter_id" className="w-full bg-white">
                      <SelectValue placeholder="Select Transporter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select</SelectItem>
                      {transporterList.map((transporter) => (
                        <SelectItem
                          key={transporter.contact_id}
                          value={transporter.contact_id?.toString()}
                        >
                          {transporter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : null}
            </div>
          )}

          {/* DC Date */}
          <div>
            <Label htmlFor="dc_date">DC Date</Label>
            <Input
              id="dc_date"
              name="dc_date"
              type="date"
              value={dcDate}
              onChange={handleChangeDcDate}
              className="w-full bg-white"
            />
          </div>

          {/* DC Template */}
          {appConfig?.user_role?.dc?.canViewDConExpressPortal == 1 && (
            <div>
              <Label htmlFor="dc_template_id">DC Template</Label>
              <Select
                value={dcTemplateId || "none"}
                onValueChange={(value) =>
                  setDcTemplateId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger id="dc_template_id" className="w-full bg-white">
                  <SelectValue placeholder="Select DC Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select</SelectItem>
                  {templateList?.["25"]?.map((template) => (
                    <SelectItem key={template.id} value={template.id?.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Invoice Template */}
          {appConfig?.user_role?.invoice?.canViewInvoiceonExpressPortal == 1 && (
            <div>
              <Label htmlFor="invoice_template_id">Invoice Template</Label>
              <Select
                value={invoiceTemplateId || "none"}
                onValueChange={(value) =>
                  setInvoiceTemplateId(value === "none" ? "" : value)
                }
              >
                <SelectTrigger
                  id="invoice_template_id"
                  className="w-full bg-white"
                >
                  <SelectValue placeholder="Select Invoice Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select</SelectItem>
                  {templateList?.["22"]?.map((template) => (
                    <SelectItem key={template.id} value={template.id?.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="dctable-main-container">
          {companyDetails?.so_listing_transaction_config == "0"
            ? filteredDcDispatchSummaryData && (
              <SalesorderList
                sodata={filteredDcDispatchSummaryData}
                tableColumns={memoizedTableColumns}
                pending={pending}
                tableMeta={tableMeta}
                columnVisibility={columnVisibility}
              />
            )
            : filteredDcDispatchData && (
              <SalesorderList
                sodata={filteredDcDispatchData}
                tableColumns={memoizedTableColumns}
                pending={pending}
                tableMeta={tableMeta}
                columnVisibility={columnVisibility}
              />
            )}
        </div>
      </div>

      {/* Modals */}
      <DeliveryChallanDetailDialog
        open={showDcModal}
        onOpenChange={setShowDcModal}
        challan={null}
        dcDetails={dcDetails}
        selectedSummaryItem={selectedSummaryItem}
        isLoading={isDcDetailsLoading}
      />

      <DeliveryStatusDialog
        isOpen={isDeliveryStatusModalOpen}
        onClose={() => setIsDeliveryStatusModalOpen(false)}
        selectedDc={selectedDc}
        dcpId={dcpId}
        status={2}
        onSuccess={() => {
          fetchDispatchList(
            status,
            route_id,
            selectedCompany,
            selectedBranch,
            seltransporter,
            deliveryType
          );
        }}
        onOpenReceipt={(salesorderid, pendingAmount, dc) => {
          openPaymentOrder(salesorderid, pendingAmount, dc);
        }}
      />

      <PaymentReceiptDialog
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        orderData={paymentOrderData}
        pending_amount={paymentPendingAmount}
        onSuccess={() => {
          fetchDispatchList(
            status,
            route_id,
            selectedCompany,
            selectedBranch,
            seltransporter,
            deliveryType
          );
        }}
        getSalesorderList={fetchDispatchList}
        status={status}
        route_id={route_id}
        selectedCompany={selectedCompany}
        selectedBranch={selectedBranch}
        deliveryType={deliveryType}
      />

      <ShareWhatsappModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareParams={shareParams}
        setIsSharing={setIsSharing}
        companyDetails={companyDetails}
      />
    </Fragment>
  );
};

export default DeliveryDispatchListTable;

