"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLoginStore } from "@/stores/auth.store";
import { usePunchStore } from "@/stores/punch.store";
import PropTypes from "prop-types";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronDown,
  House,
  Triangle,
  Columns2,
  Mic,
  MessageSquare,
  CircleHelp,
  FileText,
  UserRound,
  ListChecks,
  Bell,
  Boxes,
  DollarSign,
  FileSpreadsheet,
  Ruler,
} from "lucide-react";
import Image from "next/image";

// Constants
const ICON_SIZE = "w-5 h-5";
const ACTIVE_COLOR = "text-[#287f71]";
const INACTIVE_COLOR = "text-gray-600 hover:text-[#287f71]";

export default function DashboardSidebar({ onNavigate }) {
  const { empInTime, empOutTime } = usePunchStore();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState({
    dashboard: pathname.startsWith("/dashboard"),
  });

  // Get store data with fallbacks
  const { navConfig = {}, user = {}, appConfig = {} } = useLoginStore();
  const { permissions = {}, labels = {} } = navConfig;
  const soPermissions = appConfig?.user_role?.so || {};
  const quotationPermissions = appConfig?.user_role?.quotation || {};

  // Permission checks
  const isEmployee = user?.isEmployee;
  const isRestrictedUser = !user?.isEmployee && user?.type != 5;
  const showContactFollowups =
    appConfig?.contact_rawcontact_followup == "Y" && isEmployee;

  const isMedbotUser = appConfig?.medbot_user_type == "1" || appConfig?.medbot_user_type == "2";

  const canManageOrders = () => {
    if (appConfig?.isadmin == 1) return true;
    return (
      isEmployee &&
      (soPermissions.canCreateSO == 1 || soPermissions.canViewAllSO == 1)
    );
  };

  const canManageQuotations = () => {
    if (appConfig?.isadmin == 1) return true;
    return (
      isEmployee &&
      (quotationPermissions.canCreateQuotation == 1 ||
        quotationPermissions.canViewAllQuotation == 1)
    );
  };

  const canManageMeasurements = () => {
    if (appConfig?.isadmin == 1) return true;
    return isEmployee;
  };

  const canManageInvoices = () => {
    if (appConfig?.isadmin == 1) return true;
    return isEmployee;
  };

  const canManageReceipts = () => {
    if (appConfig?.isadmin == 1) return true;
    return isEmployee;
  };

  // Generate unique key for menu items
  const generateKey = (base, suffix = "") =>
    `${base}-${suffix || Math.random().toString(36).substring(2, 9)
      }`.toLowerCase();

  // Navigation items configuration
  const baseNavItems = isEmployee
    ? [
      {
        id: "dashboard",
        name: "Dashboard",
        href: "/dashboard",
        icon: <House className={ICON_SIZE} />,
      },
    ]
    : [];


  const employeeNavItems = isEmployee
    ? [
      {
        id: "contacts",
        name: labels.contacts || "Contact",
        href: "/contacts",
        icon: <UserRound className={ICON_SIZE} />,
      },
    ].filter(Boolean)
    : [];

  const leadsItem = permissions.showLeads
    ? [
      {
        id: "leads",
        name: labels.leads || "Leads",
        href: "/leads",
        icon: <Triangle className={ICON_SIZE} />,
        originalName: "Leads",
      },
    ]
    : [];

  const quotationItems =
    permissions.showQuotations && canManageQuotations()
      ? [
        {
          id: "quotations",
          name: labels.Quotation_config_name || "Quotation",
          href: "/quotations",
          icon: <FileText className={ICON_SIZE} />,
        },
      ]
      : [];

  const ordersItem =
    permissions.showOrders && canManageOrders()
      ? [
        {
          id: "orders",
          name: labels.orders || "Orders",
          href: "/orders",
          icon: <Columns2 className={ICON_SIZE} />,
          originalName: "Orders",
        },
      ]
      : [];

  // Invoices menu item
  const invoiceItem = permissions.showInvoices && canManageInvoices()
    ? [{ id: "invoices", name: labels.invoices || "Invoice", href: "/invoices", icon: <DollarSign className={ICON_SIZE} /> }]
    : [];

  // Receipts menu item
  const receiptsItem = permissions.showReceipts && canManageReceipts()
    ? [
      {
        id: "receipts",
        name: "Receipts",
        href: "/receipts",
        icon: <FileSpreadsheet className={ICON_SIZE} />,
        originalName: "Receipts",
      },
    ]
    : [];

  // Order Processing (submenu: Order Listing, Order Approve, Planning, History)
  const deliveryChallansItem = [
    {
      id: "deliverychallans",
      name: labels.deliverychallans || "Order Processing",
      href: "/deliverychallans",
      icon: <Boxes className={ICON_SIZE} />,
      originalName: "Order Processing",
      submenu: [
        // These 3: only for medbot users
        ...(isMedbotUser
          ? [
            { id: "order-listing", name: "Order Listing", href: "/deliverychallans/order-listing" },
            { id: "order-approve", name: "Order Approve", href: "/deliverychallans/order-approve" },
            { id: "delivery-planning", name: "Delivery Planning", href: "/deliverychallans/planning" },
          ]
          : []),
        // This one: ALWAYS visible (even non-medbot users)
        { id: "delivery-history", name: "Delivery History", href: "/deliverychallans/history" },
      ].filter((item) => item),
    },
  ];

  const conditionalNavItemsForContacts = [
    permissions.showLeads && {
      id: "leads",
      name: labels.leads || "Leads",
      href: "/leads",
      icon: <Triangle className={ICON_SIZE} />,
      originalName: "Leads",
    },
    permissions.showQuotations && {
      id: "quotations",
      name: labels.Quotation_config_name || "Quotation",
      href: "/quotations",
      icon: <FileText className={ICON_SIZE} />,
    },
    permissions.showOrders && {
      id: "orders",
      name: labels.orders || "Orders",
      href: "/orders",
      icon: <Columns2 className={ICON_SIZE} />,
      originalName: "Orders",
    },
  ].filter(Boolean);

  const followUpItems =
    !isRestrictedUser && showContactFollowups
      ? [
        {
          id: "follow-ups",
          name: "Followups",
          href: "#",
          icon: <ListChecks className={ICON_SIZE} />,
          submenu: [
            {
              id: "contact-followups",
              name: `${labels.contacts || "Contacts"} Followups`,
              href: "/contact-followups",
            },
            permissions.showLeads && {
              id: "leads-followups",
              name: `${labels.leads || "Leads"} Followups`,
              href: "/leads-followups",
            },
          ].filter(Boolean),
        },
      ].filter((item) => item && item.submenu?.length > 0)
      : [];

  // const reportItems =
  //   !isRestrictedUser && isEmployee
  //     ? [
  //       {
  //         id: "reports",
  //         name: "Reports",
  //         href: "/reports",
  //         icon: <FileSpreadsheet className={ICON_SIZE} />,
  //       },
  //     ]
  //     : [];

  const productItems =
    [
      {
        id: "products",
        name: "Products",
        href: "/products",
        icon: <FileSpreadsheet className={ICON_SIZE} />,
      },
    ]

  const reportItems = !isRestrictedUser && isEmployee
    ? [
      {
        id: "reports",
        name: "Reports",
        href: "/reports",
        icon: <FileSpreadsheet className={ICON_SIZE} />,
        submenu: [
          { id: "attendance-report", name: "Attendance Report", href: "/reports" },
          ...(isMedbotUser
            ? [{ id: "sotosireport", name: "SO to SI Report", href: "/sotosireport" }]
            : []),
        ],
      },
    ]
    : [];

  const measurementsItem = permissions.showMeasurements && canManageMeasurements()
    ? [{
      id: "measurements",
      name: "Measurement Sheet",
      href: "/measurements",
      icon: <Ruler className={ICON_SIZE} />,
    }]
    : [];

  const navItems = isEmployee
    ? [
      ...baseNavItems,
      ...employeeNavItems,
      ...leadsItem,
      ...quotationItems,
      ...ordersItem,
      ...measurementsItem, // Add the measurements item here
      ...deliveryChallansItem, // place right after Orders
      ...invoiceItem,
      ...receiptsItem,
      ...followUpItems,
      ...reportItems,
      // ...productItems,
    ]
    : [...baseNavItems, ...conditionalNavItemsForContacts];

  const helpItems = [
    {
      id: "notifications",
      title: "Notifications",
      path: "/notifications",
      icon: <Bell className={`${ICON_SIZE} mr-2`} />,
    },
    {
      id: "faqs",
      title: "FAQs",
      path: "/faqs",
      icon: <CircleHelp className={`${ICON_SIZE} mr-2`} />,
    },
  ];

  // Handlers
  const toggleMenu = (menuId) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const handleNavigation = (e, href) => {
    if (href != "/logout") {
      if (
        isEmployee &&
        ((empInTime && empOutTime) || (!empInTime && !empOutTime))
      ) {
        e.preventDefault();
        toast.warning("Please Punch-In to continue.", {
          action: {
            label: "OK",
            onClick: () => { },
          },
        });
        onNavigate?.();
        return;
      }
    }

    onNavigate?.();
  };

  // Render helpers
  const renderSubmenu = (item) => {
    const isExpanded = expandedMenus[item.id];
    const isActive =
      pathname == item.href ||
      (item.submenu && item.submenu.some((sub) => pathname == sub.href));

    return (
      <div key={item.id} className="space-y-1">
        <button
          onClick={() => toggleMenu(item.id)}
          className={`flex items-center justify-between w-full px-3 py-3 text-sm font-medium rounded-[10px] border-l-[2px] ${isActive
            ? "bg-[rgba(40,127,113,0.08)] text-[#287f71] border-[#287f71]"
            : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-[#287f71]"
            }`}
        >
          <span className="flex items-center gap-3">
            {item.icon}
            {item.name}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {isExpanded && item.submenu && (
          <div className="ml-8 space-y-1">
            {item.submenu.map((subItem) => {
              const isSubActive = pathname == subItem.href;
              return (
                <Link
                  key={subItem.id}
                  href={subItem.href}
                  className={`block px-3 py-3 text-sm rounded-[10px] ${isSubActive
                    ? "text-[#287f71]  font-medium"
                    : "text-gray-600 hover:text-[#287f71]"
                    }`}
                  onClick={(e) => handleNavigation(e, subItem.href)}
                >
                  {subItem.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderLink = (item) => {
    const isActive = pathname == item.href;
    return (
      <div key={item.id} className="space-y-1">
        <Link
          href={item.href}
          className={`flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-[10px] border-l-[2px] ${isActive
            ? "bg-[rgba(40,127,113,0.08)] text-[#287f71] border-[#287f71]"
            : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-[#287f71]"
            }`}
          onClick={(e) => handleNavigation(e, item.href)}
        >
          {item.icon}
          {item.name}
        </Link>
      </div>
    );
  };

  return (
    <div className="border-r bg-white h-full">
      <div className="flex h-16 items-center px-4 ml-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
          onClick={(e) => handleNavigation(e, "/dashboard")}
        >
          <img
            src="/logo.png"
            alt="Company Logo"
            // width={120}
            // height={32}
            //  className="w-full h-auto object-contain"
            className="w-[108px] h-[56px] object-contain"
          />
        </Link>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) =>
          item.submenu ? renderSubmenu(item) : renderLink(item)
        )}

        <h3 className="text-xs font-semibold text-gray-400 uppercase px-3 pt-6 pb-2">
          HELP
        </h3>

        {helpItems.map((item) => (
          <div key={item.id} className="space-y-1">
            <Link
              href={item.path}
              className={`flex items-center px-3 py-2 text-sm rounded-md font-medium ${pathname == item.path ? ACTIVE_COLOR : INACTIVE_COLOR
                }`}
              onClick={(e) => handleNavigation(e, item.path)}
            >
              {item.icon}
              {item.title}
            </Link>
          </div>
        ))}
      </nav>
    </div>
  );
}

DashboardSidebar.propTypes = {
  onNavigate: PropTypes.func,
};