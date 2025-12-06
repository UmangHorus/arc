"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLoginStore } from "@/stores/auth.store";
import { useQuery } from "@tanstack/react-query";
import OrderProcessingService from "@/lib/OrderProcessingService";
import SalesorderList from "@/components/deliverychallans/SalesorderList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { HashLoader } from "react-spinners";

const ReceiptsTable = () => {
  const { user, token, appConfig } = useLoginStore();
  const [sodata, setSoData] = useState([]);
  const [pending, setPending] = useState(true);
  const [filteredprojectdata, setFilteredProjectdata] = useState([]);
  const [searchtext, setSearchtext] = useState("");
  const [paymentmode, setPaymentMode] = useState("none");
  const [selectemployee, setSelectemployee] = useState("none");
  const [from_date, setFromdate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [to_date, setTodate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isDownloading, setIsDownloading] = useState(false);

  // Get employee list
  const {
    data: employeeListData,
    isLoading: employeeLoading,
  } = useQuery({
    queryKey: ["employeeList", token],
    queryFn: () => OrderProcessingService.getMedicalEmployeeList({ token }),
    enabled: !!token,
  });

  const responseData = Array.isArray(employeeListData) ? employeeListData[0] : employeeListData;
  const employeelist = responseData?.STATUS === "SUCCESS" ? (responseData?.DATA || []) : [];

  const filteredEmployeelist = useMemo(() => {
    if (!employeelist.length) return [];

    // Filter employees based on user type
    if (String(appConfig?.medbot_user_type) === "3" && user?.id) {
      return employeelist.filter(
        (item) =>
          String(item.Employee?.employee_id) === String(user.id)
      );
    }
    return employeelist;
  }, [employeelist, user, appConfig]);

  // Download image helper
  const downloadImage = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const dataUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(dataUrl);
    } catch (error) {
      console.error("Error downloading image:", error);
      throw error;
    }
  };

  // Handle download receipt image
  const handleDownloadImage = async (receipt_id) => {
    setIsDownloading(true);
    try {
      const response = await OrderProcessingService.downloadReceiptImage({
        token,
        employeeId: user?.id,
        receiptId: receipt_id,
      });

      const responseData = Array.isArray(response) ? response[0] : response;

      if (responseData?.STATUS === "SUCCESS") {
        const file_path = responseData?.DATA;
        const file_name = responseData?.FILE_NAME;

        if (file_name && file_path) {
          await downloadImage(file_path, file_name);
          toast.success("Receipt downloaded successfully");
        } else {
          toast.error("Attachment is not available for this receipt.");
        }
      } else {
        toast.error(responseData?.MSG || "Failed to retrieve attachment.");
      }
    } catch (error) {
      console.error("Error downloading receipt image:", error);
      toast.error("Failed to retrieve attachment.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Get sales order list (payment report)
  const getSalesorderList = async (
    dc_status = "",
    payment_type = "",
    delivery_id = "",
    startdate = "",
    enddate = ""
  ) => {
    setPending(true);

    if (!token) {
      console.error("No token found");
      setSoData([]);
      setFilteredProjectdata([]);
      setPending(false);
      return;
    }

    const effectiveEmployeeId = delivery_id || user?.id || "";

    try {
      const response = await OrderProcessingService.getPaymentReport({
        token,
        employeeId: effectiveEmployeeId,
        status: dc_status,
        paymentType: payment_type || "",
        deliveryId: effectiveEmployeeId,
        startDate: startdate,
        endDate: enddate,
      });

      const responseData = Array.isArray(response) ? response[0] : response;

      if (responseData?.STATUS === "SUCCESS") {
        if (responseData?.DATA?.solist?.length > 0) {
          const dclist_arr = responseData.DATA.solist;

          const convertedTableData = dclist_arr
            .filter((item) => item?.fullreceiptno)
            .map((item, i) => ({
              id: i,
              orderno: item?.fullsalesorderno || "",
              orderdate: item?.salesorder_dt || "",
              contact: item?.contact_name || "",
              amount: item?.sales_amount || "",
              receiptno: item?.fullreceiptno || "",
              receiptdate: item?.receipt_dt || "",
              receipt_amount: item?.receipt_amount || "",
              advance_amount: item?.advance_received || "",
              pending_amount: item?.pending_amount || "",
              receipt_created_by: item?.receipt_created_by || "",
              paymenttype: item?.paymenttype || "",
              attachment:
                item?.fullreceiptno && item?.attachment ? (
                  <Button
                    variant="link"
                    onClick={() => handleDownloadImage(item.receipt_id)}
                    disabled={isDownloading}
                    className="p-0 text-[#287F71] hover:text-[#1a5c4d]"
                    style={{
                      opacity: isDownloading ? 0.5 : 1,
                    }}
                  >
                    <Download size={22} className="ml-1" />
                  </Button>
                ) : (
                  ""
                ),
            }));

          setSoData(convertedTableData);
          setFilteredProjectdata(convertedTableData);
        } else {
          setSoData([]);
          setFilteredProjectdata([]);
        }
      } else {
        // Only show error toast if it's not a "Data Not Found" message
        const errorMsg = responseData?.MSG || responseData?.MESSAGE;
        if (errorMsg && errorMsg !== "Data Not Found") {
          console.error("API STATUS not SUCCESS:", errorMsg);
          toast.error(errorMsg || "Failed to fetch payment report data.");
        }
        setSoData([]);
        setFilteredProjectdata([]);
      }
    } catch (error) {
      console.error("Error fetching sales order list:", error);
      // Only show error toast if it's not a "Data Not Found" message
      const errorMessage = error?.message || error?.toString() || "";
      if (!errorMessage.includes("Data Not Found")) {
        toast.error("Failed to fetch payment report data.");
      }
      setSoData([]);
      setFilteredProjectdata([]);
    } finally {
      setPending(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    const searchValue = e.target.value.toLowerCase();
    setSearchtext(searchValue);

    const filteredItems = sodata.filter((item) =>
      Object.values(item).some(
        (value) =>
          value &&
          typeof value === "string" &&
          value.toLowerCase().includes(searchValue)
      )
    );

    setFilteredProjectdata(filteredItems);
  };

  // Handle search result
  const handleSearchResult = () => {
    const formattedFromDate = from_date
      ? format(new Date(from_date), "MM/dd/yyyy")
      : "";
    const formattedToDate = to_date ? format(new Date(to_date), "MM/dd/yyyy") : "";

    const effectiveEmployeeId =
      String(appConfig?.medbot_user_type) === "1" ||
        String(appConfig?.medbot_user_type) === "2"
        ? (selectemployee === "none" ? "" : selectemployee)
        : user?.id || "";

    const paymentTypeValue = paymentmode === "none" ? "" : paymentmode;

    getSalesorderList(
      "",
      paymentTypeValue,
      effectiveEmployeeId,
      formattedFromDate,
      formattedToDate
    );
  };

  // Handle reset
  const handleReset = () => {
    setFromdate(format(new Date(), "yyyy-MM-dd"));
    setTodate(format(new Date(), "yyyy-MM-dd"));
    setPaymentMode("none");
    setSelectemployee("none");
    setSearchtext("");
    setSoData([]);
    setFilteredProjectdata([]);

    const formattedFromDate = format(new Date(), "MM/dd/yyyy");
    const formattedToDate = format(new Date(), "MM/dd/yyyy");

    const effectiveEmployeeId =
      String(appConfig?.medbot_user_type) === "1" ||
        String(appConfig?.medbot_user_type) === "2"
        ? ""
        : user?.id || "";

    getSalesorderList(
      "",
      "",
      effectiveEmployeeId,
      formattedFromDate,
      formattedToDate
    );
  };

  // CSV Export function
  const handleExportCSV = () => {
    // Excel-compatible CSV format with BOM for UTF-8
    const BOM = "\uFEFF";
    const headers = [
      "Receipt No",
      "Receipt Date",
      "Payment Type",
      "Order No",
      "Order Date",
      "Contact",
      "Sales Order Total Amount",
      "Receipt Amount",
      "Created By",
    ];

    const csvData = filteredprojectdata
      .filter((item) => item.receiptno) // Only export rows with receipt numbers
      .map((item) => {
        const escapeCsv = (str) => {
          if (!str) return "";
          // Handle React elements (like attachment button)
          if (typeof str === "object" && str !== null) return "";
          return `"${String(str).replace(/"/g, '""')}"`;
        };

        const contactName = item.contact?.split("_")[0] || item.contact || "";
        const amount = isNaN(parseFloat(item.amount))
          ? item.amount
          : parseFloat(item.amount).toFixed(2);
        const receiptAmount = isNaN(parseFloat(item.receipt_amount))
          ? item.receipt_amount
          : parseFloat(item.receipt_amount).toFixed(2);

        return [
          escapeCsv(item.receiptno),
          escapeCsv(item.receiptdate),
          escapeCsv(item.paymenttype),
          escapeCsv(item.orderno),
          escapeCsv(item.orderdate),
          escapeCsv(contactName),
          escapeCsv(amount),
          escapeCsv(receiptAmount),
          escapeCsv(item.receipt_created_by),
        ];
      });

    const csvContent =
      BOM +
      [headers.join(","), ...csvData.map((row) => row.join(","))].join("\r\n");

    // Download with current date in filename
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `payment_summary_data_${dateStr}.csv`);
  };

  // Helper function for download
  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Table columns
  const tableColumns = useMemo(
    () => [
      {
        accessorKey: "receiptno",
        header: "Receipt No",
        cell: ({ row }) => (
          <div className="whitespace-normal text-left">{row.original.receiptno}</div>
        ),
      },
      {
        accessorKey: "receiptdate",
        header: "Receipt Date",
        cell: ({ row }) => (
          <div className="whitespace-normal">{row.original.receiptdate}</div>
        ),
      },
      {
        accessorKey: "paymenttype",
        header: "Payment Type",
        cell: ({ row }) => (
          <div className="whitespace-normal text-left">{row.original.paymenttype}</div>
        ),
      },
      {
        accessorKey: "orderno",
        header: "Order No",
        cell: ({ row }) => (
          <div className="whitespace-normal text-left">{row.original.orderno}</div>
        ),
      },
      {
        accessorKey: "orderdate",
        header: "Order Date",
        cell: ({ row }) => (
          <div className="whitespace-normal">{row.original.orderdate}</div>
        ),
      },
      {
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <div className="whitespace-normal text-left">
            {row.original.receiptno ? (row.original.contact?.split("_")[0] || row.original.contact) : "Total"}
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: (
          <div className="whitespace-normal text-left">
            <div>Sales Order</div>
            <div>Total Amount</div>
          </div>
        ),
        cell: ({ row }) => (
          <div className="whitespace-normal text-left">
            {row.original.receiptno ? (
              isNaN(parseFloat(row.original.amount))
                ? row.original.amount
                : parseFloat(row.original.amount).toFixed(2)
            ) : ""}
          </div>
        ),
      },
      {
        accessorKey: "receipt_amount",
        header: "Receipt Amount",
        cell: ({ row }) => (
          <div className="whitespace-normal text-left">
            {row.original.receiptno ? (
              isNaN(parseFloat(row.original.receipt_amount))
                ? row.original.receipt_amount
                : parseFloat(row.original.receipt_amount).toFixed(2)
            ) : ""}
          </div>
        ),
      },
      {
        accessorKey: "receipt_created_by",
        header: "Created By",
        cell: ({ row }) => (
          <div className="whitespace-normal text-left">
            {row.original.receipt_created_by}
          </div>
        ),
      },
      {
        accessorKey: "attachment",
        header: "Attachment",
        cell: ({ row }) => (
          <div className="whitespace-normal text-left">
            {row.original.attachment}
          </div>
        ),
      },
    ],
    []
  );

  // Initial load - call API on page load
  useEffect(() => {
    if (!token || !user) return;

    const formattedFromDate = from_date
      ? format(new Date(from_date), "MM/dd/yyyy")
      : "";
    const formattedToDate = to_date ? format(new Date(to_date), "MM/dd/yyyy") : "";

    const effectiveEmployeeId =
      String(appConfig?.medbot_user_type) === "1" ||
        String(appConfig?.medbot_user_type) === "2"
        ? (selectemployee === "none" ? "" : selectemployee)
        : user?.id || "";

    const paymentTypeValue = paymentmode === "none" ? "" : paymentmode;

    getSalesorderList(
      "",
      paymentTypeValue,
      effectiveEmployeeId,
      formattedFromDate,
      formattedToDate
    );
  }, [user, token]);

  // Show loading spinner while API is being called
  if (pending) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium block mb-1">Receipt From Date</label>
            <Input
              type="date"
              value={from_date}
              onChange={(e) => setFromdate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Receipt To Date</label>
            <Input
              type="date"
              value={to_date}
              onChange={(e) => setTodate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Select Mode</label>
            <Select value={paymentmode || "none"} onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select Mode</SelectItem>
                <SelectItem value="CH">Cheque</SelectItem>
                <SelectItem value="CA">Cash</SelectItem>
                <SelectItem value="BT">Bank Transfer</SelectItem>
                <SelectItem value="ON">Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Select Employee</label>
            <Select
              value={selectemployee || "none"}
              onValueChange={(value) => {
                setSelectemployee(value);
              }}
              disabled={filteredEmployeelist.length === 0 || employeeLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select Employee</SelectItem>
                {filteredEmployeelist.map((item, index) => (
                  <SelectItem
                    key={index}
                    value={String(item.Employee?.employee_id || "")}
                  >
                    {item.Employee?.name || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSearchResult} className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white">Search</Button>
          <Button variant="outline" onClick={handleReset}>Reset</Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <Input
          placeholder="Search all fields..."
          value={searchtext}
          onChange={handleSearch}
          className="w-full sm:max-w-sm bg-[#fff]"
        />
        <div className="flex gap-3 ml-auto">
          <Button
            onClick={handleExportCSV}
            className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            disabled={filteredprojectdata.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        <SalesorderList
          sodata={filteredprojectdata}
          tableColumns={tableColumns}
          pending={pending}
        />
      </div>
    </div>
  );
};

export default ReceiptsTable;

