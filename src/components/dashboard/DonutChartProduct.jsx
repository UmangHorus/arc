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

export default function DonutChartProduct({ dashboardData, dashboardType }) {
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [chartData, setChartData] = useState({ series: [], options: { labels: [] } });

  const periods = [
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_month", label: "Last Month" },
    { value: "last_3_months", label: "Last 3 Months" },
    { value: "last_6_months", label: "Last 6 Months" },
    { value: "last_year", label: "Last Year" },
  ];

  const dataKeyMap = {
    lead: "topLeadProducts",
    quotation: "top_q_products",
    sales: "top_products",
    invoice: "top_i_products",
    delivery_challan: "top_dc_products",
  };

  // Reset selectedPeriod when dashboardType changes
  useEffect(() => {
    setSelectedPeriod("");
  }, [dashboardType]);

  // Find first period with valid data
  const firstValidPeriod = useMemo(() => {
    if (!dashboardData) return null;
    const key = dataKeyMap[dashboardType];
    if (!key || !dashboardData[key]) return null;

    for (const period of periods) {
      const data = dashboardData[key][period.value];
      if (
        Array.isArray(data) &&
        data.length > 0 &&
        data.some(p => p?.total_qty > 0)
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
    const topProducts = dashboardData[key]?.[period] || [];

    const series = topProducts
      .map(p => p?.total_qty || 0)
      .filter(qty => qty > 0);

    const labels = topProducts
      .filter((_, i) => series[i] > 0)
      .map(p => p?.product_name || "Unknown");

    setChartData({
      series,
      options: {
        chart: { type: "donut", width: "100%", height: 400 },
        labels,
        legend: { show: false },
        responsive: [
          { breakpoint: 480, options: { chart: { width: "100%", height: 300 } } }
        ],
        tooltip: { y: { formatter: val => `${val} units` } },
        plotOptions: { donut: { size: "70%" } },
        noData: { text: "No product data", align: "center", verticalAlign: "middle" },
      },
    });

    // Auto-select first valid period if none selected
    if (!selectedPeriod && firstValidPeriod) {
      setSelectedPeriod(firstValidPeriod);
    }
  }, [dashboardData, dashboardType, selectedPeriod, firstValidPeriod, hasAnyData]);

  const chartKey = `${dashboardType}-${selectedPeriod}-${chartData.series.join("-")}`;

  if (!dashboardData || !hasAnyData) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Top Products Distribution</h2>
        <div className="flex items-center justify-center h-[350px] text-gray-500 border border-dashed rounded-lg">
          No product data available for any period.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-[#373838]">Top Products Distribution</h2>
        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap font-bold text-[#373838]">Period:</label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => {
                const hasData = dashboardData?.[dataKeyMap[dashboardType]]?.[p.value]?.some(
                  item => item?.total_qty > 0
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

      <div id="donut-chart">
        {chartData.series.length > 0 ? (
          <ReactApexChart
            key={chartKey}
            options={chartData.options}
            series={chartData.series}
            type="donut"
            height={350}
          />
        ) : (
          <div className="flex items-center justify-center p-8 text-gray-500 h-[350px]">
            No data for selected period.
          </div>
        )}
      </div>
    </div>
  );
}