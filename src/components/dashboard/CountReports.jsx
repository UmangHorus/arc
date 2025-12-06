"use client";
import { useLoginStore } from "@/stores/auth.store";
import {
  Users,
  UserCheck,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle,
  CalendarCheck,
  CalendarClock,
  Calendar,
} from "lucide-react";

export default function CountReports({ dashboardData, dashboardType }) {
  const { navConfig } = useLoginStore();
  const leadLabel = navConfig?.labels?.leads || "Lead";
  const contactLabel = navConfig?.labels?.contacts || "Contact";
  const orderLabel = navConfig?.labels?.orders || "Order";
  const quotationLabel = navConfig?.labels?.Quotation_config_name || "Quotation";
  const deliveryChallanLabel = navConfig?.labels?.delivery_challan || "Delivery Challan";
  const invoiceLabel = navConfig?.labels?.invoice || "Invoice";

  // Helper function for proper pluralization based on count
  const pluralize = (word, count) => {
    // Show singular only when count is exactly 1, otherwise show plural
    if (count === 1) {
      return word; // Return singular form
    }

    // Check if word is already plural
    const lowerWord = word.toLowerCase();
    // Check for common plural endings
    const isAlreadyPlural =
      lowerWord.endsWith("es") ||
      lowerWord.endsWith("ies") ||
      lowerWord.endsWith("ches") ||
      lowerWord.endsWith("shes") ||
      (lowerWord.endsWith("s") && word.length > 3 && !lowerWord.endsWith("ss")); // Ends with 's' but not 'ss' (like 'class')

    if (isAlreadyPlural) {
      return word; // Return as-is if already plural
    }

    // Standard pluralization rules
    if (lowerWord.endsWith("y") && !/[aeiou]y$/i.test(word)) {
      return word.slice(0, -1) + "ies";
    }
    if (lowerWord.endsWith("s") || lowerWord.endsWith("x") ||
      lowerWord.endsWith("z") || lowerWord.endsWith("ch") ||
      lowerWord.endsWith("sh")) {
      return word + "es";
    }

    return word + "s";
  };

  // Get current financial year
  const getFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  if (!dashboardData) {
    return (
      <div className="p-4 text-red-500">
        No data available for the count reports.
      </div>
    );
  }

  // Color classes configuration
  const colorClasses = {
    blue: {
      bg: "bg-blue-100",
      lightBg: "bg-blue-50",
      border: "border-blue-500",
      iconBg: "bg-blue-500",
      textColor: "text-blue-500",
    },
    green: {
      bg: "bg-green-100",
      lightBg: "bg-green-50",
      border: "border-green-500",
      iconBg: "bg-green-500",
      textColor: "text-green-500",
    },
    teal: {
      bg: "bg-teal-100",
      lightBg: "bg-teal-50",
      border: "border-teal-500",
      iconBg: "bg-teal-500",
      textColor: "text-teal-500",
    },
    red: {
      bg: "bg-red-100",
      lightBg: "bg-red-50",
      border: "border-red-500",
      iconBg: "bg-red-500",
      textColor: "text-red-500",
    },
    orange: {
      bg: "bg-orange-100",
      lightBg: "bg-orange-50",
      border: "border-orange-500",
      iconBg: "bg-orange-500",
      textColor: "text-orange-500",
    },
    purple: {
      bg: "bg-purple-100",
      lightBg: "bg-purple-50",
      border: "border-purple-500",
      iconBg: "bg-purple-500",
      textColor: "text-purple-500",
    },
    indigo: {
      bg: "bg-indigo-100",
      lightBg: "bg-indigo-50",
      border: "border-indigo-500",
      iconBg: "bg-indigo-500",
      textColor: "text-indigo-500",
    },
    amber: {
      bg: "bg-amber-100",
      lightBg: "bg-amber-50",
      border: "border-amber-500",
      iconBg: "bg-amber-500",
      textColor: "text-amber-500",
    },
  };

  // Month name mapping
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Date Badge Component
  const DateBadge = ({ color, dateText, type = "month" }) => (
    <div
      className={`absolute right-2 top-2 flex gap-2 rounded-full px-2 py-1 text-sm font-medium text-gray-800 ${colorClasses[color].lightBg}`}
    >
      <Calendar className={`h-4 w-4 ${colorClasses[color].textColor}`} />
      {type === "month" ? monthNames[parseInt(dateText) - 1] : dateText}
    </div>
  );

  // Reusable StatBox with badgeType
  const StatBox = ({
    title,
    value,
    icon: Icon,
    color = "blue",
    showCondition = true,
    badgeType = "none", // "new", "total", "none"
  }) => {
    if (!showCondition) return null;

    const showMonthBadge = badgeType === "new" && dashboardData?.timestamp?.month;
    const showYearBadge = badgeType === "total";

    return (
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
          <p className={`count-label ${colorClasses[color].textColor}`}>
            {value}
          </p>
        </div>

        {/* Month Badge for New/Pending/Accepted/Completed */}
        {showMonthBadge && (
          <DateBadge color={color} dateText={dashboardData.timestamp.month} type="month" />
        )}

        {/* Financial Year Badge for Total */}
        {showYearBadge && (
          <DateBadge color={color} dateText={getFinancialYear()} type="year" />
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="max-w-7xl grid h-full">

        {/* LEAD DASHBOARD */}
        {dashboardType === "lead" && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Total ${pluralize(contactLabel, dashboardData?.contact?.contact || 0)}`} value={dashboardData?.contact?.contact} icon={Users} color="blue" />
              <StatBox title={`Total Raw ${pluralize(contactLabel, dashboardData?.contact?.raw_contact || 0)}`} value={dashboardData?.contact?.raw_contact} icon={Clock} color="green" />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`New ${pluralize(leadLabel, dashboardData?.new_lead || 0)}`} value={dashboardData?.new_lead} icon={UserCheck} color="teal" badgeType="new" />
              <StatBox title={`Total ${pluralize(leadLabel, dashboardData?.total_lead_financial || 0)}`} value={dashboardData?.total_lead_financial} icon={Package} color="red" badgeType="total" />
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Won ${pluralize(leadLabel, dashboardData?.won_lead || 0)}`} value={dashboardData?.won_lead} icon={ShoppingBag} color="orange" badgeType="new" />
              <StatBox title={`Lost ${pluralize(leadLabel, dashboardData?.lost_lead || 0)}`} value={dashboardData?.lost_lead} icon={CheckCircle} color="purple" badgeType="new" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title="Total Lead Followup Done" value={dashboardData?.done_lead_followup} icon={CalendarCheck} color="indigo" />
              <StatBox title="Total Pending Followup" value={dashboardData?.pending_lead_followup} icon={CalendarClock} color="amber" />
            </div>
          </>
        )}

        {/* QUOTATION DASHBOARD */}
        {dashboardType === "quotation" && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Total ${pluralize(contactLabel, dashboardData?.contact?.contact || 0)}`} value={dashboardData?.contact?.contact} icon={Users} color="blue" />
              <StatBox title={`Active ${pluralize(contactLabel, dashboardData?.active_contact || 0)}`} value={dashboardData?.active_contact} icon={UserCheck} color="teal" />
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title="Total Products" value={dashboardData?.products} icon={Package} color="red" />
              <StatBox title={`New ${pluralize(quotationLabel, dashboardData?.new_order || 0)}`} value={dashboardData?.new_order} icon={ShoppingBag} color="orange" badgeType="new" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Pending ${pluralize(quotationLabel, dashboardData?.quo_pending || 0)}`} value={dashboardData?.quo_pending} icon={Clock} color="green" badgeType="new" />
              <StatBox title={`Approved ${pluralize(quotationLabel, dashboardData?.quo_accept || 0)}`} value={dashboardData?.quo_accept} icon={CheckCircle} color="purple" />
            </div>
          </>
        )}

        {/* SALES ORDER DASHBOARD */}
        {dashboardType === "sales" && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Total ${pluralize(contactLabel, dashboardData?.contact?.contact || 0)}`} value={dashboardData?.contact?.contact} icon={Users} color="blue" />
              <StatBox title={`Active ${pluralize(contactLabel, dashboardData?.active_contact || 0)}`} value={dashboardData?.active_contact} icon={UserCheck} color="teal" />
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title="Total Products" value={dashboardData?.products} icon={Package} color="red" />
              <StatBox title={`New ${pluralize(orderLabel, dashboardData?.new_order || 0)}`} value={dashboardData?.new_order} icon={ShoppingBag} color="orange" badgeType="new" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Pending ${pluralize(orderLabel, dashboardData?.so_pending || 0)}`} value={dashboardData?.so_pending} icon={Clock} color="green" badgeType="new" />
              <StatBox title={`Approved ${pluralize(orderLabel, dashboardData?.so_accept || 0)}`} value={dashboardData?.so_accept} icon={CheckCircle} color="purple" />
            </div>
          </>
        )}

        {/* DELIVERY CHALLAN DASHBOARD */}
        {dashboardType === "delivery_challan" && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Total ${pluralize(contactLabel, dashboardData?.contact?.contact || 0)}`} value={dashboardData?.contact?.contact} icon={Users} color="blue" />
              <StatBox title="Total Products" value={dashboardData?.products} icon={Package} color="red" />
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`New ${pluralize(deliveryChallanLabel, dashboardData?.new_order || 0)}`} value={dashboardData?.new_order} icon={ShoppingBag} color="orange" badgeType="new" />
              <StatBox title={`Pending ${pluralize(deliveryChallanLabel, dashboardData?.dc_pending || 0)}`} value={dashboardData?.dc_pending} icon={Clock} color="green" badgeType="new" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Accepted ${pluralize(deliveryChallanLabel, dashboardData?.dc_accept || 0)}`} value={dashboardData?.dc_accept} icon={CheckCircle} color="purple" badgeType="new" />
              <StatBox title={`Completed ${pluralize(deliveryChallanLabel, dashboardData?.dc_complete || 0)}`} value={dashboardData?.dc_complete} icon={CalendarCheck} color="indigo" badgeType="new" />
            </div>
          </>
        )}

        {/* INVOICE DASHBOARD */}
        {dashboardType === "invoice" && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Total ${pluralize(contactLabel, dashboardData?.contact?.contact || 0)}`} value={dashboardData?.contact?.contact} icon={Users} color="blue" />
              <StatBox title="Total Products" value={dashboardData?.products} icon={Package} color="red" />
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`New ${pluralize(invoiceLabel, dashboardData?.new_order || 0)}`} value={dashboardData?.new_order} icon={ShoppingBag} color="orange" badgeType="new" />
              <StatBox title={`Pending ${pluralize(invoiceLabel, dashboardData?.inv_pending || 0)}`} value={dashboardData?.inv_pending} icon={Clock} color="green" badgeType="new" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatBox title={`Accepted ${pluralize(invoiceLabel, dashboardData?.inv_accept || 0)}`} value={dashboardData?.inv_accept} icon={CheckCircle} color="purple" badgeType="new" />
              <StatBox title={`Completed ${pluralize(invoiceLabel, dashboardData?.inv_complete || 0)}`} value={dashboardData?.inv_complete} icon={CalendarCheck} color="indigo" badgeType="new" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}