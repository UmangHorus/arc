"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import { NotificationModal } from "./NotificationModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { useLoginStore } from "@/stores/auth.store";
import { useSound } from "@/hooks/useSound";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [isExpanded, setIsExpanded] = useState(false);

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useLoginStore();
  const playNotificationSound = useSound("/notification_sound.wav");

  // -----------------------------
  // Fetch notifications
  // -----------------------------
  const { data: notificationsRaw = [], isLoading, isError } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const formData = new FormData();
      formData.append("PHPTOKEN", token);
      formData.append("AUTHORIZEKEY", process.env.NEXT_PUBLIC_API_AUTH_KEY);
      formData.append("employee_id", user.id);

      const response = await api.post("/expo_access_api/getNotificationList", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response.data?.DATA) return [];

      return response.data.DATA.map((notification) => ({
        id: notification.notification_id,
        title: notification.title,
        description: notification.message,
        timestamp: formatTimestamp(notification.notification_dt),
        isRead: notification?.isRead === "Y",
        type: notification.type,
        rawData: notification,
      }));
    },
    refetchInterval: 600000, // 10 minutes
    keepPreviousData: true, // keeps previous data if same
  });

  // -----------------------------
  // Memoize notifications to avoid unnecessary re-renders
  // -----------------------------
  const notifications = useMemo(() => notificationsRaw, [notificationsRaw]);

  // -----------------------------
  // Close dropdown when clicking outside
  // -----------------------------
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -----------------------------
  // Track first user interaction for sound
  // -----------------------------
  useEffect(() => {
    const handleInteraction = () => {
      setHasUserInteracted(true);
      document.removeEventListener("click", handleInteraction);
    };
    document.addEventListener("click", handleInteraction);
    return () => document.removeEventListener("click", handleInteraction);
  }, []);

  // -----------------------------
  // Mark as read mutation
  // -----------------------------
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const formData = new FormData();
      formData.append("PHPTOKEN", token);
      formData.append("AUTHORIZEKEY", process.env.NEXT_PUBLIC_API_AUTH_KEY);
      formData.append("notification_id", notificationId);

      await api.post("/expo_access_api/markNotificationAsRead", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });

  // -----------------------------
  // Delete mutation
  // -----------------------------
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      const formData = new FormData();
      formData.append("PHPTOKEN", token);
      formData.append("AUTHORIZEKEY", process.env.NEXT_PUBLIC_API_AUTH_KEY);
      formData.append("notification_id", notificationId);

      await api.post("/expo_access_api/deleteNotification", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });

  // -----------------------------
  // Unread count
  // -----------------------------
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // -----------------------------
  // Play sound when new notifications arrive
  // -----------------------------
  useEffect(() => {
    if (unreadCount > previousUnreadCount && hasUserInteracted) {
      playNotificationSound();
    }
    setPreviousUnreadCount(unreadCount);
  }, [unreadCount, previousUnreadCount, hasUserInteracted, playNotificationSound]);

  // -----------------------------
  // Notification display logic
  // -----------------------------
  const displayedNotifications = isExpanded
    ? notifications
    : notifications.slice(0, displayLimit);

  const shouldShowLoadMore = notifications.length > displayLimit && !isExpanded;
  const shouldShowLess = isExpanded && displayLimit > 10;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setDisplayLimit(!isExpanded ? notifications.length : 10);
  };

  // -----------------------------
  // Handlers
  // -----------------------------
  const handleNotificationClick = (notification) => {
    if (!notification.isRead) markAsReadMutation.mutate(notification.id);
    setSelectedNotification(notification);
    setIsModalOpen(true);
    setIsOpen(false);
  };

  const handleDeleteNotification = (id) => deleteNotificationMutation.mutate(id);

  const handleClearAll = async () => {
    const confirmClear = window.confirm("Are you sure you want to clear all notifications?");
    if (!confirmClear) return;

    try {
      const formData = new FormData();
      formData.append("PHPTOKEN", token);
      formData.append("AUTHORIZEKEY", process.env.NEXT_PUBLIC_API_AUTH_KEY);
      formData.append("employee_id", user.id);

      await api.post("/expo_access_api/deleteNotification", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      queryClient.invalidateQueries(["notifications"]);
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to clear notifications. Please try again.");
    }
  };

  const handleViewAllNotifications = () => {
    setIsOpen(false);
    router.push("/notifications");
  };

  // -----------------------------
  // Utility: format timestamp
  // -----------------------------
  const formatTimestamp = (unixTimestamp) => {
    const now = new Date();
    const notificationDate = new Date(unixTimestamp * 1000);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return notificationDate.toLocaleDateString();
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Notifications"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center font-semibold px-1 shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div ref={dropdownRef} className="notification-dropdown absolute right-0 mt-3 w-[95vw] sm:w-80 md:w-96 max-h-[80vh] sm:max-h-[70vh] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden overflow-y-auto transform transition-all duration-200 ease-out sm:right-4 md:right-0">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {isLoading && <p className="p-4 text-center text-gray-500">Loading...</p>}
              {isError && <p className="p-4 text-center text-red-500">Error loading notifications</p>}
              {!isLoading && !isError && notifications.length === 0 && (
                <p className="p-4 text-center text-gray-500">No notifications</p>
              )}
              {!isLoading && !isError && notifications.length > 0 &&
                displayedNotifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClick={() => handleNotificationClick(n)}
                    onDelete={() => handleDeleteNotification(n.id)}
                  />
                ))
              }
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <button onClick={handleViewAllNotifications} className="text-sm text-gray-600 hover:text-gray-900 font-medium">View all notifications</button>
                <div className="flex gap-2">
                  {shouldShowLoadMore && (
                    <Button variant="ghost" size="sm" onClick={() => setDisplayLimit(prev => prev + 10)} className="flex items-center gap-1">
                      Load More <ChevronDown className="w-4 h-4" />
                    </Button>
                  )}
                  {shouldShowLess && (
                    <Button variant="ghost" size="sm" onClick={() => { setDisplayLimit(10); setIsExpanded(false); }} className="flex items-center gap-1">
                      Show Less <ChevronUp className="w-4 h-4" />
                    </Button>
                  )}
                  {!shouldShowLoadMore && !shouldShowLess && notifications.length > 10 && (
                    <Button variant="ghost" size="sm" onClick={toggleExpanded} className="flex items-center gap-1">
                      {isExpanded ? "Show Less" : "Show All"}
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Modal */}
      <NotificationModal
        notification={selectedNotification}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedNotification(null); }}
      />
    </>
  );
};
