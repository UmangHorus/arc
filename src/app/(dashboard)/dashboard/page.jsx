"use client";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLoginStore } from "@/stores/auth.store";
import SalesOrderGraph from "@/components/dashboard/SalesOrderGraph";
import DonutChartProduct from "@/components/dashboard/DonutChartProduct";
import CountReports from "@/components/dashboard/CountReports";
import DonutChartSales from "@/components/dashboard/DonutChartSales";
import DashboardService from "@/lib/DashboardService";
import RecentOrders from "@/components/dashboard/RecentOrders";
import RecentLeads from "@/components/dashboard/RecentLeads";
import RecentQuotations from "@/components/dashboard/RecentQuotations";
import RecentDeliveryChallans from "@/components/dashboard/RecentDeliveryChallans";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import TimelineLayout from "@/components/timeline-layout";
import { HashLoader } from "react-spinners";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardPage() {
  const { isAuthenticated, token, user, navConfig } = useLoginStore();

  const leadLabel = navConfig?.labels?.leads || "Lead";
  const orderLabel = navConfig?.labels?.orders || "Order";
  const quotationLabel = navConfig?.labels?.Quotation_config_name || "Quotation";
  const deliveryChallanLabel = navConfig?.labels?.delivery_challan || "Delivery Challan";
  const invoiceLabel = navConfig?.labels?.invoice || "Invoice";

  // Available dashboards based on permissions
  const availableDashboards = [];
  if (navConfig?.permissions?.showLeads) {
    availableDashboards.push({ value: "lead", label: `${leadLabel} Dashboard` });
  }
  if (navConfig?.permissions?.showQuotations) {
    availableDashboards.push({ value: "quotation", label: `${quotationLabel} Dashboard` });
  }
  if (navConfig?.permissions?.showOrders) {
    availableDashboards.push({ value: "sales", label: `${orderLabel} Dashboard` });
  }

  availableDashboards.push({ value: "delivery_challan", label: `${deliveryChallanLabel} Dashboard` });

  if (navConfig?.permissions?.showInvoices) {
    availableDashboards.push({ value: "invoice", label: `${invoiceLabel} Dashboard` });
  }

  // Set initial selectedDashboard to first available dashboard
  const [selectedDashboard, setSelectedDashboard] = useState("");

  // Initialize selectedDashboard when availableDashboards is ready
  useEffect(() => {
    if (availableDashboards.length > 0 && !selectedDashboard) {
      setSelectedDashboard(availableDashboards[0].value);
    }
  }, [availableDashboards, selectedDashboard]);

  const handleDashboardChange = (value) => {
    setSelectedDashboard(value);
  };

  const showSelector = availableDashboards.length > 1;
  const dashboardType = selectedDashboard || availableDashboards[0]?.value || "";
  const dashboardTitle = availableDashboards.find((d) => d.value == dashboardType)?.label || "Dashboard";

  const pluralize = (word) => {
    if (word.toLowerCase() == "inquiry") return "Inquiries";
    if (word.toLowerCase().endsWith("y") && !/[aeiou]y$/i.test(word)) {
      return word.slice(0, -1) + "ies";
    }
    return word + "s";
  };

  const { data, error, isLoading } = useQuery({
    queryKey: ["dashboardData", token, user?.id],
    queryFn: () => DashboardService.getDashboardData(token, user?.id),
    enabled: !!isAuthenticated && !!token && !!user?.id,
    refetchOnMount: "always",
    staleTime: 0,
    cacheTime: 0,
  });

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <div className="p-4 text-red-500">
          Error loading dashboard data: {error?.message}
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <TimelineLayout />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
      </div>
    );
  }

  // Map dashboardType to data key
  const typeKeyMap = {
    lead: "7",
    quotation: "17",
    sales: "21",
    invoice: "22",
    delivery_challan: "25",
  };
  const typeKey = typeKeyMap[dashboardType];

  const dashboardData = {
    ...data?.DATA?.[typeKey],
    years: data?.DATA?.years,
    contact: data?.DATA?.contact,
    timestamp: data?.DATA?.timestamp,
  };

  return (
    <div className="space-y-4 p-4">
      {/* Only show dashboard content if dashboards are available */}
      {availableDashboards.length > 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className=" text-[#373838] text-[22px] font-medium leading-[32px] mb-4">{dashboardTitle}</h1>
            {showSelector && (
              <div className="flex items-center gap-2">
                <Select value={selectedDashboard} onValueChange={handleDashboardChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select dashboard..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDashboards.map((db) => (
                      <SelectItem key={db.value} value={db.value}>
                        {db.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SalesOrderGraph dashboardData={dashboardData} dashboardType={dashboardType} />
            <CountReports dashboardData={dashboardData} dashboardType={dashboardType} />
            <DonutChartProduct dashboardData={dashboardData} dashboardType={dashboardType} />
            <DonutChartSales dashboardData={dashboardData} dashboardType={dashboardType} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {dashboardType == "lead" ? (
              <RecentLeads />
            ) : dashboardType == "quotation" ? (
              <RecentQuotations />
            ) : dashboardType == "sales" ? (
              <RecentOrders />
            ) : dashboardType == "delivery_challan" ? (
              null
            ) : dashboardType == "invoice" ? (
              null
            ) : null}
          </div>
        </>
      )}

      {/* Always show timeline regardless of dashboard availability */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <TimelineLayout />
        </div>
      </div>
    </div>
  );
}