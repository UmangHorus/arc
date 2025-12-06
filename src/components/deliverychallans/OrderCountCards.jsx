"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLoginStore } from "@/stores/auth.store";
import OrderProcessingService from "@/lib/OrderProcessingService";
import {
  Package,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

const OrderCountCards = () => {
  const { isAuthenticated, token, user } = useLoginStore();  

  // Fetch delivery challan count data using useQuery
  // API: /expo_access_api/deliverychallan_count/
  const employeeId = user?.id;
  const { data, error, isLoading } = useQuery({
    queryKey: ["deliveryChallanCount", token, employeeId],
    queryFn: () => OrderProcessingService.getDeliveryChallanCount({ 
      token, 
      employeeId: employeeId
    }),
    enabled: !!isAuthenticated && !!token && !!employeeId,
    refetchOnMount: "always",
    staleTime: 0,
    cacheTime: 0,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg h-24"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg mb-6">
        Error loading order counts: {error?.message}
      </div>
    );
  }

  // Handle both array and object response structures
  const responseData = Array.isArray(data) ? data[0] : data;
  const orderData = responseData?.DATA || responseData?.data || {};
  
  
  // Color classes configuration - different colors for each card icon
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      lightBg: "bg-blue-50",
      border: "border-blue-400",
      iconBg: "bg-blue-500",
      textColor: "text-blue-600",
    },
    green: {
      bg: "bg-green-50",
      lightBg: "bg-green-50",
      border: "border-green-400",
      iconBg: "bg-green-500",
      textColor: "text-green-600",
    },
    orange: {
      bg: "bg-orange-50",
      lightBg: "bg-orange-50",
      border: "border-orange-400",
      iconBg: "bg-orange-500",
      textColor: "text-orange-600",
    },
    red: {
      bg: "bg-red-50",
      lightBg: "bg-red-50",
      border: "border-red-400",
      iconBg: "bg-red-500",
      textColor: "text-red-600",
    },
  };

  // Counter card component
  const CounterCard = ({
    title,
    value,
    icon: Icon,
    color = "blue",
  }) => (
    <div className="relative flex h-full flex-col justify-between rounded-[12px] border border-[#DBE0E5] bg-white p-4 shadow-[0_8px_24px_0_rgba(27,46,94,0.12)]">
      <div className="mb-2 flex items-center">
        <div
          className={`mr-2 rounded-full border border-opacity-10 p-2 ${colorClasses[color].border} ${colorClasses[color].bg}`}
        >
          <div
            className={`${colorClasses[color].iconBg} flex h-10 w-10 items-center justify-center rounded-full`}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className={`text-2xl font-bold ${colorClasses[color].textColor}`}>
          {value || 0}
        </p>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <CounterCard
        title="Total Orders"
        value={orderData.total_so}
        icon={Package}
        color="blue"
      />
      <CounterCard
        title="Completed Orders"
        value={orderData.total_so_completed}
        icon={CheckCircle}
        color="green"
      />
      <CounterCard
        title="Pending Orders"
        value={orderData.total_so_pending}
        icon={Clock}
        color="orange"
      />
      <CounterCard
        title="Cancelled Orders"
        value={orderData.total_so_cancel}
        icon={XCircle}
        color="red"
      />
    </div>
  );
};

export default OrderCountCards;