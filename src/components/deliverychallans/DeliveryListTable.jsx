"use client";

import React, {
  Fragment,
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import { useSharedDataStore } from "@/stores/sharedData.store";
import OrderProcessingService from "@/lib/OrderProcessingService";
import SalesorderList from "./SalesorderList";
import { summaryTableColumns, tableColumns } from "./DeliveryListTableColumns";
import DeliveryChallanDetailDialog from "@/components/shared/DeliveryChallanDetailDialog";
import DispatchDialog from "@/components/shared/DispatchDialog";
import { format } from "date-fns";
import { useCompanyDetails } from "@/hooks/useCompanyDetails";
import { HashLoader } from "react-spinners";

const ShippingAreasComponent = ({ shippingAreas, setVirtualRoute }) => {
  const areas = shippingAreas.map((area) => area.shipping_area);
  const uniqueArray = [...new Set(areas.filter((area) => area != null))];
  const formattedAreas = uniqueArray.slice().reverse().join("->");

  return (
    <div>
      <p className="text-sm mt-2">{formattedAreas}</p>
    </div>
  );
};

const DeliveryListTable = () => {
  const { user, token, appConfig } = useLoginStore();
  const { companyBranchDivisionData, routeList } = useSharedDataStore();
  const { companyDetails } = useCompanyDetails();

  const [employee_arr, setEmployee] = useState([]);
  const [sodata, setSoData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [filteredSummaryData, setFilteredSummaryData] = useState([]);
  const [filteredSoData, setFilteredSoData] = useState([]);
  const [pending, setPending] = useState(true);
  const [tot_dc_capacity, setDCCapacity] = useState(0);
  const [totcapacity, setCapacity] = useState(0);
  const [totextracapacity, setExtraCapacity] = useState(0);
  const [seltype, setSelectType] = useState("G");
  const [dynamiccolumn, setDynamicColumn] = useState([]);
  const [columnproddata, setColumnProdData] = useState([]);
  const [sel_soid, setSoID] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [toggleDelet, setToggleDelet] = useState(false);
  const [selshipthrough, setSelShipThrough] = useState("");
  const [selroute, setSelRoute] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState("");
  const [selshipthroughname, setSelShipThroughName] = useState("");
  const [seltransporter, setSelectedTransporter] = useState("");
  const [routename, setRouteName] = useState("");
  const [routeareaname, setRouteAreaName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lr_no, setLrNo] = useState("");
  const [lr_attach, setLrAttach] = useState(null);
  const [vehicle_no, setVehicleNo] = useState("");
  const [lr_date, setLRDate] = useState("");
  const [startDate, setstartDate] = useState(new Date());
  const [endDate, setendDate] = useState(new Date());
  const [virtualroute, setVirtualRoute] = useState([]);
  const [typetransporter, setTypeTransporter] = useState();
  const [shipthrough_arr, setShipthrougharr] = useState([]);
  const [matchingRoutes, setMatchingRoutes] = useState([]);
  const [selectedSummaryItem, setSelectedSummaryItem] = useState(null);
  const [showDcModal, setShowDcModal] = useState(false);
  const [dcDetails, setDcDetails] = useState({});
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [transporterList, setTransporterList] = useState([]);
  const [isDcDetailsLoading, setIsDcDetailsLoading] = useState(false);

  const companies = companyBranchDivisionData?.companies || [];
  const branches = companyBranchDivisionData?.branches || [];
  const route_arr = routeList || [];

  // Fetch employee list
  const { data: employeeListData } = useQuery({
    queryKey: ["employeeList", token],
    queryFn: () => OrderProcessingService.getEmployeeList({ token }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (employeeListData) {
      const responseData = Array.isArray(employeeListData)
        ? employeeListData[0]
        : employeeListData;
      if (responseData?.STATUS === "SUCCESS") {
        setEmployee(responseData.DATA || []);
      } else {
        setEmployee([]);
      }
    }
  }, [employeeListData]);

  // Fetch transporter list
  const { data: transporterData } = useQuery({
    queryKey: ["transporterList", token],
    queryFn: () => OrderProcessingService.getTransporterList({ token }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (transporterData) {
      const responseData = Array.isArray(transporterData)
        ? transporterData[0]
        : transporterData;
      if (responseData?.STATUS === "SUCCESS") {
        const transporterDataValue =
          responseData.DATA || responseData.data || [];
        setTransporterList(transporterDataValue);
      }
    }
  }, [transporterData]);

  // Set default company and branch
  useEffect(() => {
    const hasRequiredData =
      companies?.length > 0 &&
      branches?.length > 0 &&
      user?.id &&
      companyDetails?.so_listing_transaction_config;

    if (hasRequiredData && !selectedCompany && !selectedBranch) {
      const defaultCompany = companies[0]?.company_id || "";
      const defaultBranch = branches[0]?.branch_id || "";
      const defaultEmp = "";

      setSelectedCompany(defaultCompany);
      setSelectedBranch(defaultBranch);
      setSelectedEmp(defaultEmp);
    }
  }, [
    companies,
    branches,
    user?.id,
    companyDetails?.so_listing_transaction_config,
    selectedCompany,
    selectedBranch,
  ]);

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
        setDcDetails(responseData.Data || responseData.DATA || {});
      } else {
        console.error(
          "API returned non-success status:",
          responseData?.STATUS
        );
        toast.error(responseData?.MSG || "Failed to fetch delivery challan details");
        setShowDcModal(false);
      }
    } catch (error) {
      console.error("Error fetching delivery challan details:", error);
      toast.error("Error fetching delivery challan details");
      setShowDcModal(false);
    } finally {
      setIsDcDetailsLoading(false);
    }
  };

  // Create summary data
  const createSummaryData = (dclist) => {
    const summaryMap = new Map();

    dclist.forEach((item) => {
      if (!summaryMap.has(item.dc_id)) {
        summaryMap.set(item.dc_id, {
          dc_id: item.dc_id,
          dc_fullno: item.dc_fullno,
          dc_date: item.dc_date,
          dcp_id: item.dcp_id,
          dc_fullno_text: item.dc_fullno,
          invoice_id: item.invoice_id,
          invoice_no: item.invoice_no,
          contact_name: item.contact_name,
          contact_id: item.contact_id,
          branch_name: item.branch_name,
          branch_id: item.branch_id,
          company_name: item.company_name,
          company_id: item.company_id,
          assigned_to_employee_id: item.assigned_to_employee_id,
          assigned_to_employee_name: item.assigned_to_employee_name,
          shipping_area: item.shipping_area || "",
          route_id: item.route_id,
          route_id1: item.route_id1,
          shipping_pincode: item.shipping_pincode,
          remark: item.remarks || "",
          products: [],
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
      const totalQty = dc.products.reduce(
        (sum, product) => sum + parseFloat(product.formatted_quantity),
        0
      );
      const totalSecQty = dc.products.reduce(
        (sum, product) => sum + parseFloat(product.formatted_sec_quantity),
        0
      );

      const qtyDecimals =
        dc.products[0]?.allow_product_decimals_point != "" &&
          !isNaN(parseInt(dc.products[0]?.allow_product_decimals_point, 10))
          ? parseInt(dc.products[0]?.allow_product_decimals_point, 10)
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

      const summaryItem = {
        ...dc,
        totalQty,
        totalSecQty,
        qtyDisplay: `${formattedTotalQty} ${dc.products[0]?.unit || ""}`,
        secQtyDisplay: `${formattedTotalSecQty} ${dc.products[0]?.sec_unit || ""}`,
        dc_fullno_text: dc.dc_fullno, // Keep original text
      };

      // Store the button component separately, but keep dc_fullno as text for display
      summaryItem.dc_fullno_button = (
        <button
          className="font-bold text-[#287F71] hover:underline"
          title="Click to view delivery challan"
          onClick={async () => {
            await fetchDcdetails(dc.dc_id, summaryItem);
          }}
        >
          {dc.dc_fullno}
        </button>
      );

      // Set dc_fullno to the button for rendering in table
      summaryItem.dc_fullno = summaryItem.dc_fullno_button;

      return summaryItem;
    });

    return summaryData;
  };

  // Process detailed data
  const processDetailedData = (dclist_arr) => {
    const processedOrderIds = new Set();
    const convertedTableData = dclist_arr?.map((item, i) => {
      const isDuplicate = processedOrderIds.has(item.dc_id);
      processedOrderIds.add(item.dc_id);

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
        dcp_id: item.dcp_id,
        invoice_id: item.invoice_id,
        invoice_no: item.invoice_no,
        shipping_area: item.shipping_area || "",
        shipping_pincode: item.shipping_pincode,
        shipp_through: item.shipp_through,
        capacity: item.capacity,
        contact: item.contact_name,
        route_id: item.route_id,
        route_id1: item.route_id1,
        prodname: item.name + "(" + item.code + ")",
        qty: formattedQty + " " + (item.unit != "" ? item.unit : ""),
        sec_qty:
          conversionFactor > 0
            ? formattedSecQty + " " + (item.sec_unit != "" ? item.sec_unit : "")
            : "",
        shipaddress: item.shipping_address,
        branch_name: item.branch_name,
        branch_id: item.branch_id,
        company_name: item.company_name,
        company_id: item.company_id,
        assigned_to_employee_id: item.assigned_to_employee_id,
        assigned_to_employee_name: item.assigned_to_employee_name,
        remark: item.remarks,
        isDuplicate: isDuplicate,
      };
    });

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
        qty: formattedTotalQty,
        sec_qty: formattedTotalSecQty,
      });
    }

    return convertedTableData;
  };

  // Get delivery challan list
  const getDeliveryChallanList = useCallback(
    async (selectedCompany, selectedBranch, selectedEmp) => {
      setPending(true);
      try {
        const employeeId = user?.id;
        const response = await OrderProcessingService.getDeliveryChallanList({
          token,
          employeeId,
          companyId: selectedCompany,
          branchId: selectedBranch,
          assignedTo: selectedEmp,
        });

        const responseData = Array.isArray(response) ? response[0] : response;
        if (responseData?.STATUS === "SUCCESS") {
          if (responseData.DATA?.dclist?.length > 0) {
            const dclist_arr = responseData.DATA.dclist;
            const convertedTableData = processDetailedData(dclist_arr);
            const summaryData = createSummaryData(dclist_arr);

            setSoData(convertedTableData);
            setSummaryData(summaryData);
            setFilteredSoData(convertedTableData);
            setFilteredSummaryData(summaryData);
            setColumnProdData(responseData.DATA?.product_arr || []);
          } else {
            setSoData([]);
            setSummaryData([]);
            setFilteredSoData([]);
            setFilteredSummaryData([]);
          }
        } else {
          setSoData([]);
          setSummaryData([]);
          setFilteredSoData([]);
          setFilteredSummaryData([]);
        }
      } catch (error) {
        console.error("Error fetching delivery challan list:", error);
        setSoData([]);
        setSummaryData([]);
        setFilteredSoData([]);
        setFilteredSummaryData([]);
        setColumnProdData([]);
        toast.error("Failed to load delivery challans");
      } finally {
        setPending(false);
      }
    },
    [token, user?.id]
  );

  useEffect(() => {
    if (
      selectedCompany &&
      selectedBranch &&
      companyDetails?.so_listing_transaction_config
    ) {
      getDeliveryChallanList(selectedCompany, selectedBranch, selectedEmp);
    }
  }, [
    selectedCompany,
    selectedBranch,
    selectedEmp,
    companyDetails?.so_listing_transaction_config,
    getDeliveryChallanList,
  ]);

  // Handle route change - don't reset route when rows change, only when explicitly needed
  // Removed the useEffect that was resetting selroute on row selection change

  // Handle row selection
  const handleRowSelected = useCallback(
    (state) => {
      setSelectedRows(state.selectedRows);

      if (companyDetails?.so_listing_transaction_config == "0") {
        const selectedDcIds = state.selectedRows.map((row) => row.dc_id);
        const filteredSummaryData = summaryData.filter((item) =>
          selectedDcIds.includes(item.dc_id)
        );

        const totalCapacity = filteredSummaryData.reduce((acc, item) => {
          return acc + item.totalQty;
        }, 0);

        setDCCapacity(totalCapacity || 0);
      } else {
        const totalCapacity = state.selectedRows.reduce((accumulator, item) => {
          const qtySum = sodata
            .filter((itemdc) => itemdc.dcp_id == item.dcp_id)
            .reduce((accumulatordc, itemdc) => {
              const qtyValue = parseFloat(
                typeof itemdc.qty === "string"
                  ? itemdc.qty.split(" ")[0]
                  : itemdc.qty
              ) || 0;
              return accumulatordc + qtyValue;
            }, 0);
          return accumulator + qtySum;
        }, 0);
        setDCCapacity(totalCapacity || 0);
      }
    },
    [sodata, companyDetails?.so_listing_transaction_config, summaryData]
  );

  // Handle dispatch
  const handleDispatch = () => {
    setSelectedTransporter("");

    if (selectedRows.length == 0) {
      toast.error("Please select at least one delivery challan for dispatch.");
      return false;
    }

    let filteredRows = selectedRows;
    if (companyDetails?.so_listing_transaction_config == "0") {
      filteredRows = selectedRows.filter((row) =>
        filteredSummaryData.some((summary) => summary.dc_id == row.dc_id)
      );
    } else if (companyDetails?.so_listing_transaction_config == "1") {
      filteredRows = selectedRows.filter((row) =>
        filteredSoData.some((so) => so.dc_id == row.dc_id)
      );
    }

    if (filteredRows.length == 0) {
      toast.error("No valid delivery challans found in the filtered data.");
      return false;
    }

    if (companyDetails?.so_listing_transaction_config == "0") {
      const zeroQuantityDCs = filteredRows.filter((row) =>
        row?.products?.every(
          (product) => parseFloat(product.formatted_quantity) == 0
        )
      );

      if (zeroQuantityDCs.length > 0) {
        const dcNumbers = zeroQuantityDCs
          .map((row) => row.dc_fullno_text)
          .join(", ");
        const challanText = zeroQuantityDCs.length > 1 ? "challans" : "challan";
        toast.error(
          `The following delivery ${challanText} have zero quantity and cannot be dispatched: ${dcNumbers}`
        );
        return false;
      }

      const hasValidQuantity = filteredRows.some((row) =>
        row?.products?.some(
          (product) => parseFloat(product?.formatted_quantity) > 0
        )
      );

      if (!hasValidQuantity) {
        toast.error(
          "Please select at least one delivery challan with products having quantity greater than 0."
        );
        return false;
      }
    } else if (companyDetails?.so_listing_transaction_config == "1") {
      const zeroQuantityDCs = filteredRows.filter((row) => {
        const qtyStr = typeof row.qty === "string" ? row.qty.split(" ")[0] : "0";
        return parseFloat(qtyStr) == 0;
      });

      if (zeroQuantityDCs.length > 0) {
        const dcNumbers = zeroQuantityDCs.map((row) => row.dcno).join(", ");
        const challanText = zeroQuantityDCs.length > 1 ? "challans" : "challan";
        toast.error(
          `The following delivery ${challanText} have zero quantity and cannot be dispatched: ${dcNumbers}`
        );
        return false;
      }

      const hasValidQuantity = filteredRows.some((row) => {
        const qtyStr = typeof row.qty === "string" ? row.qty.split(" ")[0] : "0";
        return parseFloat(qtyStr) > 0;
      });

      if (!hasValidQuantity) {
        toast.error(
          "Please select at least one delivery challan with quantity greater than 0."
        );
        return false;
      }
    }

    const remaining_qty =
      parseFloat(totcapacity) +
      parseFloat(totextracapacity) -
      parseFloat(tot_dc_capacity);

    if (tot_dc_capacity <= 0) {
      toast.error("Total delivery challan capacity must be greater than 0.");
      return false;
    }

    if (!selshipthrough) {
      toast.error("Please select mode of delivery.");
      return false;
    }

    if (remaining_qty < 0) {
      toast.error("The capacity is overloaded, please select delivery again.");
      return false;
    }

    setIsDispatchModalOpen(true);
  };

  // Handle ship through change
  const handleChangeShipThrue = (eOrValue) => {
    // Handle both event object and direct value
    const id = typeof eOrValue === 'string'
      ? (eOrValue === "none" ? "" : eOrValue)
      : (eOrValue?.target?.value === "none" ? "" : eOrValue?.target?.value || "");

    setSelShipThrough(id);
    const shipThrough = shipthrough_arr?.find(
      (item) => item.ShipThrough.id == id
    );
    const capacity = shipThrough?.ShipThrough?.capacity ?? 0;
    const extraCapacity = shipThrough?.ShipThrough?.over_limit_capacity ?? 0;
    setCapacity(capacity > 0 ? capacity : 0);
    setExtraCapacity(extraCapacity > 0 ? extraCapacity : 0);
    setSelShipThroughName(shipThrough?.ShipThrough?.name ?? "");
  };

  // Handle route change
  const handleChangeRoute = (eOrValue) => {
    // Handle both event object and direct value
    const selectedRouteId = typeof eOrValue === 'string'
      ? (eOrValue === "none" ? "" : eOrValue)
      : (eOrValue?.target?.value === "none" ? "" : eOrValue?.target?.value || "");

    // Convert to string for consistent comparison
    const routeIdStr = String(selectedRouteId);
    setSelRoute(routeIdStr);

    const routelist = route_arr.find((item) => String(item.route_id) === routeIdStr);
    setRouteName(routelist?.name ?? "");
    setRouteAreaName(routelist?.area ?? "");

    if (selectedRouteId == "" || selectedRouteId === "none") {
      setFilteredSummaryData(summaryData);
      setFilteredSoData(sodata);
    } else {
      const filteredSummary = summaryData.filter((item) =>
        item.route_id1
          ?.split(",")
          .map((id) => id.trim())
          .includes(routeIdStr)
      );
      const filteredSo = sodata.filter((item) =>
        item.route_id1
          ?.split(",")
          .map((id) => id.trim())
          .includes(routeIdStr)
      );

      setFilteredSummaryData(filteredSummary);
      setFilteredSoData(filteredSo);
    }
  };

  // Handle type transporter
  const handleTypeTransporter = (ttID) => {
    setTypeTransporter(ttID);
    setSelRoute("");
    setCapacity(0);
    setExtraCapacity(0);
    setSelShipThrough("");
    getShipThroughList(ttID);
  };

  // Get ship through list
  const getShipThroughList = async (id) => {
    try {
      const response = await OrderProcessingService.getShipThroughList({
        token,
        flg: id,
      });

      const responseData = Array.isArray(response) ? response[0] : response;
      if (responseData?.STATUS === "SUCCESS") {
        const list = responseData.DATA || [];
        setShipthrougharr(list);
      } else {
        setShipthrougharr([]);
      }
    } catch (error) {
      console.error("Error fetching ship through list:", error);
      setShipthrougharr([]);
    }
  };

  // Handle dispatch success
  const handleDispatchSuccess = () => {
    setSelectedRows([]);
    setToggleDelet((prev) => !prev);
    setDCCapacity(0);
    setCapacity(0);
    setExtraCapacity(0);
    setSelShipThrough("");
    setSelRoute("");
    setLrNo("");
    setLrAttach(null);
    setRemarks("");
    setstartDate(new Date());
    setFilteredSummaryData([]);
    setFilteredSoData([]);
    setSoData([]);
    setSummaryData([]);
    setIsDispatchModalOpen(false);

    if (selectedCompany && selectedBranch) {
      getDeliveryChallanList(selectedCompany, selectedBranch, selectedEmp);
    }
  };

  const enablecheckbox = true;

  // Memoized columns with checkbox
  const memoizedTableColumns = useMemo(() => {
    const baseColumns = companyDetails?.so_listing_transaction_config == "0"
      ? summaryTableColumns
      : tableColumns;

    if (!enablecheckbox) {
      return baseColumns;
    }

    return [
      {
        id: "select",
        header: ({ table }) => {
          const isAllSelected = table.getIsAllRowsSelected();
          const isSomeSelected = table.getIsSomeRowsSelected();

          return (
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={(checked) => {
                table.toggleAllRowsSelected(!!checked);
              }}
              className={`text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71] ${isSomeSelected && !isAllSelected
                ? "data-[state=checked]:bg-primary/50"
                : ""
                }`}
            />
          );
        },
        cell: ({ row }) => (
          <div className="w-4">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(checked) => {
                row.toggleSelected(checked);
              }}
              className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      ...baseColumns,
    ];
  }, [companyDetails?.so_listing_transaction_config, enablecheckbox]);

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
      <div className="space-y-4 mb-4 bg-blue-50 p-4 rounded-lg">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="companySelect">Company</Label>
            <Select
              value={selectedCompany || undefined}
              onValueChange={(value) => setSelectedCompany(value)}
            >
              <SelectTrigger id="companySelect" className="w-full bg-white">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => {
                  const companyId = company.company_id?.toString();
                  if (!companyId) return null;
                  return (
                    <SelectItem key={company.company_id} value={companyId}>
                      {company.company_name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="branchSelect">Branch</Label>
            <Select
              value={selectedBranch || undefined}
              onValueChange={(value) => setSelectedBranch(value)}
            >
              <SelectTrigger id="branchSelect" className="w-full bg-white">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => {
                  const branchId = branch.branch_id?.toString();
                  if (!branchId) return null;
                  return (
                    <SelectItem key={branch.branch_id} value={branchId}>
                      {branch.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="employeeSelect">Employee</Label>
            <Select
              value={selectedEmp || "all"}
              onValueChange={(value) => setSelectedEmp(value === "all" ? "" : value)}
            >
              <SelectTrigger id="employeeSelect" className="w-full bg-white">
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employee_arr.map((item, index) => {
                  const empId = item.Employee?.employee_id?.toString();
                  if (!empId) return null;
                  return (
                    <SelectItem key={index} value={empId}>
                      {item.Employee?.name || ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <Label className="text-sm font-medium">Select Type</Label>
            <RadioGroup
              value={typetransporter?.toString()}
              onValueChange={(value) => handleTypeTransporter(value)}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="route" className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71] disabled:opacity-50 disabled:cursor-not-allowed" />
                <Label htmlFor="route" className="cursor-pointer">Route</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="transporter" className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71] disabled:opacity-50 disabled:cursor-not-allowed" />
                <Label htmlFor="transporter" className="cursor-pointer">Transporter</Label>
              </div>
            </RadioGroup>
          </div>

          {typetransporter == 1 && (
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                Select Route
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Info
                        className="h-4 w-4 text-red-500 cursor-pointer"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>If the route is not selected, a virtual route will be created and applied.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Select
                value={selroute ? String(selroute) : "none"}
                onValueChange={(value) => handleChangeRoute(value)}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select</SelectItem>
                  {route_arr
                    ?.filter((route) => {
                      const data =
                        companyDetails?.so_listing_transaction_config == "0"
                          ? summaryData
                          : sodata;
                      const routeIds = data
                        .flatMap((item) =>
                          item.route_id1
                            ? item.route_id1.split(",").map((id) => id.trim())
                            : []
                        )
                        .filter((id) => id);
                      return routeIds.includes(String(route.route_id));
                    })
                    .map((route, r) => {
                      const routeIdStr = String(route.route_id);
                      return (
                        <SelectItem
                          key={r}
                          value={routeIdStr}
                        >
                          {route.name}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              {selroute ? (
                <p className="text-sm mt-2 font-semibold">
                  {routeareaname.replace(/,/g, " -> ")}
                </p>
              ) : (
                <ShippingAreasComponent
                  shippingAreas={selectedRows}
                  setVirtualRoute={setVirtualRoute}
                />
              )}
            </div>
          )}

          {(typetransporter == 1 || typetransporter == 2) && (
            <>
              <div>
                <Label className="text-sm font-medium">Mode Of Delivery</Label>
                <Select
                  value={selshipthrough || "none"}
                  onValueChange={(value) => handleChangeShipThrue(value)}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select</SelectItem>
                    {shipthrough_arr?.map((err, i) => {
                      const shipThroughId = err.ShipThrough?.id?.toString();
                      if (!shipThroughId) return null;
                      return (
                        <SelectItem key={i} value={shipThroughId}>
                          {err.ShipThrough?.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  Capacity + Extra (KG)
                </Label>
                <div className="text-sm mt-2">
                  {totcapacity} + {totextracapacity} ={" "}
                  {parseFloat(totcapacity) + parseFloat(totextracapacity)}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">DC Qty</Label>
                <div className="text-sm mt-2">{tot_dc_capacity}</div>
              </div>

              <div>
                <Label className="text-sm font-medium">Remaining</Label>
                <div className="text-sm mt-2">
                  {parseFloat(totcapacity) !== 0 || parseFloat(totextracapacity) !== 0
                    ? parseFloat(totcapacity) +
                    parseFloat(totextracapacity) -
                    parseFloat(tot_dc_capacity)
                    : 0}
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleDispatch}
                  className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
                >
                  Dispatch
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        {companyDetails?.so_listing_transaction_config == "0"
          ? filteredSummaryData && filteredSummaryData.length > 0 && (
            <SalesorderList
              sodata={filteredSummaryData}
              tableColumns={memoizedTableColumns}
              pending={pending}
              enablecheckbox={enablecheckbox}
              handleRowSelected={handleRowSelected}
              toggleDelet={toggleDelet}
            />
          )
          : filteredSoData && filteredSoData.length > 0 && (
            <SalesorderList
              sodata={filteredSoData}
              tableColumns={memoizedTableColumns}
              pending={pending}
              enablecheckbox={enablecheckbox}
              handleRowSelected={handleRowSelected}
              toggleDelet={toggleDelet}
            />
          )}
      </div>

      {!pending &&
        ((companyDetails?.so_listing_transaction_config == "0" && (!filteredSummaryData || filteredSummaryData.length === 0)) ||
          (companyDetails?.so_listing_transaction_config == "1" && (!filteredSoData || filteredSoData.length === 0))) && (
          <div className="text-center py-10 text-gray-500">
            No delivery challans found
          </div>
        )}

      <DispatchDialog
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        selectedRows={selectedRows}
        typeTransporter={typetransporter}
        selectedRoute={selroute}
        routeName={routename}
        selectedShipThrough={selshipthrough}
        shipThroughName={selshipthroughname}
        onDispatchSuccess={handleDispatchSuccess}
        companyDetails={companyDetails}
        sodata={sodata}
        filteredSummaryData={filteredSummaryData}
        filteredSoData={filteredSoData}
      />

      <DeliveryChallanDetailDialog
        open={showDcModal}
        onOpenChange={setShowDcModal}
        challan={null}
        dcDetails={dcDetails}
        selectedSummaryItem={selectedSummaryItem}
        isLoading={isDcDetailsLoading}
      />
    </Fragment>
  );
};

export default DeliveryListTable;

