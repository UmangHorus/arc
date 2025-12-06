"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLoginStore } from "@/stores/auth.store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function SalesOrderGraph({ dashboardData, dashboardType }) {
  const { navConfig } = useLoginStore();
  const leadLabel = navConfig?.labels?.leads || "Lead";
  const orderLabel = navConfig?.labels?.orders || "Order";
  const quotationLabel = navConfig?.labels?.Quotation_config_name || "Quotation";
  const deliveryChallanLabel = navConfig?.labels?.delivery_challan || "Delivery Challan";
  const invoiceLabel = navConfig?.labels?.invoice || "Invoice";

  const label = {
    lead: leadLabel,
    quotation: quotationLabel,
    sales: orderLabel,
    delivery_challan: deliveryChallanLabel,
    invoice: invoiceLabel,
  }[dashboardType];

  const pluralize = (word) => {
    if (word.toLowerCase() === "inquiry") return "Inquiries";
    if (word.toLowerCase().endsWith("y") && !/[aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
    return word + "s";
  };

  const [selectedYear, setSelectedYear] = useState("");
  const [chartData, setChartData] = useState({
    series: [{ name: "", data: [] }],
    options: {
      chart: { type: "bar", height: 350 },
      plotOptions: {
        bar: { horizontal: false, columnWidth: "55%", borderRadius: 5, borderRadiusApplication: "end" },
      },
      colors: ["#287F71"],
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ["transparent"] },
      xaxis: { categories: [] },
      yaxis: { title: { text: "" } },
      fill: { opacity: 1 },
      tooltip: { y: { formatter: (val) => val } },
    },
  });

  useEffect(() => {
    if (dashboardData?.years) {
      const years = dashboardData.years;
      const latestYear = years[years.length - 1];
      const currentYear = selectedYear || latestYear;
      if (!selectedYear) setSelectedYear(currentYear);

      const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
      const dataKeyMap = {
        lead: "data_lead",
        quotation: "data_quotation",
        sales: "data",
        invoice: "data_invoice",
        delivery_challan: "data_dc",
      };
      const dataKey = dataKeyMap[dashboardType];
      const rawData = dashboardData?.[dataKey]?.[currentYear] || {};

      const isCount = ["lead", "quotation", "delivery_challan", "invoice"].includes(dashboardType);
      const salesData = months.map((month) => {
        const val = Number(rawData[month] || 0);
        return isCount ? val : parseFloat(val.toFixed(2));
      });

      setChartData({
        series: [{
          name: isCount ? pluralize(label) : "Sales",
          data: salesData,
        }],
        options: {
          ...chartData.options,
          xaxis: { categories: months },
          yaxis: { title: { text: isCount ? `Number of ${pluralize(label)}` : "₹ (Rupees)" } },
          tooltip: {
            y: {
              formatter: (val) => isCount ? `${val} ${pluralize(label).toLowerCase()}` : `₹ ${val.toFixed(2)}`
            }
          }
        },
      });
    }
  }, [dashboardData, selectedYear, dashboardType, label]);

  if (!dashboardData) return <div className="p-4 text-red-500">No data available.</div>;

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-[#373838]">
          {dashboardType === "lead" ? `${leadLabel} Performance`
            : dashboardType === "quotation" ? `${quotationLabel} Performance`
            : dashboardType === "delivery_challan" ? `${deliveryChallanLabel} Performance`
            : dashboardType === "invoice" ? `${invoiceLabel} Performance`
            : "Sales Performance"}
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="financialYear" className="whitespace-nowrap font-bold text-[#373838]">Financial Year:</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger><SelectValue placeholder="Select year..." /></SelectTrigger>
            <SelectContent>
              {dashboardData?.years?.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div id="chart" className="sales-order-graph">
        <ReactApexChart options={chartData.options} series={chartData.series} type="bar" />
      </div>
    </div>
  );
}