"use client";
import DashboardSidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/Header";
import DashboardFooter from "@/components/dashboard/Footer";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Loading from "@/components/ui/Loading";
import BasicSettingsInitializer from "../BasicSettingsInitializer";
import PunchStatusInitializer from "../PunchStatusInitializer";
import LeadFollowupSettingsInitializer from "../LeadFollowupSettingsInitializer";
import RouteListInitializer from "../RouteListInitializer";
import { useLoginStore } from "@/stores/auth.store";
import { checkLocationPermission } from "@/utils/location";
import TemplateListInitializer from "../TemplateListInitializer";

export default function DashboardLayout({ children }) {
  const [loading, setLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const pathname = usePathname();
  const { setLocationError } = useLoginStore();

  // Only check permission, don't get actual location
  useEffect(() => {
    const handleLocationPermission = async () => {
      try {
        const permission = await checkLocationPermission();

        if (permission === "denied") {
          setLocationError(
            "You have blocked location access. Please enable it in your browser settings to use punch and visit features."
          );
        } else {
          // Clear any previous location errors if permission is granted/prompt
          setLocationError(null);
        }
      } catch (error) {
        console.error("Location permission check error:", error);
        setLocationError("Unable to check location permissions");
      }
    };

    handleLocationPermission();
  }, [setLocationError]);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    handleStart();
    const timer = setTimeout(handleComplete, 1000);

    return () => {
      clearTimeout(timer);
      handleComplete();
    };
  }, [pathname]);

  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen">
      <PunchStatusInitializer />
      <LeadFollowupSettingsInitializer />
      <TemplateListInitializer />
      <RouteListInitializer />

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 transition-transform duration-300 ease-in-out overflow-y-auto ${
            sidebarVisible ? "translate-x-0" : "-translate-x-64"
          }`}
        >
          <DashboardSidebar setLoading={setLoading} />
        </div>

        <div
          className={`flex flex-col flex-1 min-h-0 overflow-auto bg-[#e5edf4] transition-all duration-300 ease-in-out ${
            sidebarVisible ? "md:ml-64" : "md:ml-0"
          }`}
        >
          <DashboardHeader
            toggleSidebar={toggleSidebar}
            sidebarVisible={sidebarVisible}
          />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
            <div className="min-h-full">
              {loading && <Loading />}
              {children}
            </div>
          </main>
        </div>
      </div>

      <DashboardFooter />
    </div>
  );
}