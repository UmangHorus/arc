"use client";
import { useState, useEffect, useMemo } from "react";
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

export default function DonutChartSales({ dashboardData, dashboardType }) {
  const { navConfig } = useLoginStore();
  const leadLabel = navConfig?.labels?.leads || "Lead";
  const orderLabel = navConfig?.labels?.orders || "Order";
  const quotationLabel = navConfig?.labels?.Quotation_config_name || "Quotation";
  const deliveryChallanLabel = navConfig?.labels?.delivery_challan || "Delivery Challan";
  const invoiceLabel = navConfig?.labels?.invoice || "Invoice";

  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [chartData, setChartData] = useState({ series: [], options: { labels: [] } });

  const pluralize = (word) => {
    if (word.toLowerCase() === "inquiry") return "Inquiries";
    if (word.toLowerCase().endsWith("y") && !/[aeiou]y$/i.test(word)) return word.slice(0, -1) + "ies";
    return word + "s";
  };

  const periods = [
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_month", label: "Last Month" },
    { value: "last_3_months", label: "Last 3 Months" },
    { value: "last_6_months", label: "Last 6 Months" },
    { value: "last_year", label: "Last Year" },
  ];

  const dataKeyMap = {
    lead: "topSellersLead",
    quotation: "top_q_seller",
    sales: "top_seller",
    invoice: "top_i_seller",
    delivery_challan: "top_dc_seller",
  };

  // Reset period on dashboardType change
  useEffect(() => {
    setSelectedPeriod("");
  }, [dashboardType]);

  const firstValidPeriod = useMemo(() => {
    if (!dashboardData) return null;
    const key = dataKeyMap[dashboardType];
    if (!key || !dashboardData[key]) return null;

    for (const period of periods) {
      const data = dashboardData[key][period.value];
      if (
        Array.isArray(data) &&
        data.length > 0 &&
        data.some(s => s?.total_orders > 0)
      ) {
        return period.value;
      }
    }
    return null;
  }, [dashboardData, dashboardType]);

  const hasAnyData = firstValidPeriod !== null;

  useEffect(() => {
    if (!dashboardData || !hasAnyData) {
      setChartData({ series: [], options: { labels: [] } });
      return;
    }

    const key = dataKeyMap[dashboardType];
    const period = selectedPeriod || firstValidPeriod;
    const topSellers = dashboardData[key]?.[period] || [];

    const series = topSellers
      .map(s => s?.total_orders || 0)
      .filter(orders => orders > 0);

    const labels = topSellers
      .filter((_, i) => series[i] > 0)
      .map(s => s?.seller_name || "Unknown");

    const labelMap = {
      lead: pluralize(leadLabel).toLowerCase(),
      quotation: pluralize(quotationLabel).toLowerCase(),
      sales: pluralize(orderLabel).toLowerCase(),
      invoice: pluralize(invoiceLabel).toLowerCase(),
      delivery_challan: pluralize(deliveryChallanLabel).toLowerCase(),
    };

    setChartData({
      series,
      options: {
        chart: { type: "donut", width: "100%", height: 400 },
        labels,
        legend: { show: false },
        responsive: [
          { breakpoint: 480, options: { chart: { width: "100%", height: 300 } } }
        ],
        tooltip: {
          y: {
            formatter: val => `${val} ${labelMap[dashboardType]}`
          }
        },
        plotOptions: { donut: { size: "70%" } },
        noData: { text: "No seller data", align: "center", verticalAlign: "middle" },
      },
    });

    if (!selectedPeriod && firstValidPeriod) {
      setSelectedPeriod(firstValidPeriod);
    }
  }, [
    dashboardData,
    dashboardType,
    selectedPeriod,
    firstValidPeriod,
    hasAnyData,
    leadLabel,
    orderLabel,
    quotationLabel,
    deliveryChallanLabel,
    invoiceLabel,
  ]);

  const chartKey = `${dashboardType}-${selectedPeriod}-${chartData.series.join("-")}`;

  if (!dashboardData || !hasAnyData) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">
          {dashboardType === "quotation" ? "Most Active Executives" : "Most Active Sales Executives"}
        </h2>
        <div className="flex items-center justify-center h-[350px] text-gray-500 border border-dashed rounded-lg">
          No seller data available for any period.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-[#373838]">
          {dashboardType === "quotation" ? "Most Active Executives" : "Most Active Sales Executives"}
        </h2>
        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap font-bold text-[#373838]">Period:</label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => {
                const hasData = dashboardData?.[dataKeyMap[dashboardType]]?.[p.value]?.some(
                  item => item?.total_orders > 0
                );
                return (
                  <SelectItem key={p.value} value={p.value} disabled={!hasData}>
                    {p.label} {hasData ? "" : "(No data)"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div id="donut-chart" className="mt-2">
        {chartData.series.length > 0 ? (
          <ReactApexChart
            key={chartKey}
            options={chartData.options}
            series={chartData.series}
            type="donut"
            height={350}
          />
        ) : (
          <div className="flex items-center justify-center p-8 text-gray-500 h-[350px] border border-dashed rounded-lg">
            No data for selected period.
          </div>
        )}
      </div>
    </div>
  );
}