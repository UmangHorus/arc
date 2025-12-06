import api from "@/lib/api/axios";
import {
  getCurrentLocation,
  requestLocationPermission,
} from "@/utils/location";

const AUTHORIZE_KEY = process.env.NEXT_PUBLIC_API_AUTH_KEY || "";

/**
 * Fetch user's live location (mandatory)
 */
const getStrictLocationPayload = async (actionType) => {
  try {
    // Step 1: Request or check location permission
    const permission = await requestLocationPermission();

    if (permission === "denied" || permission === "prompt-denied") {
      throw new Error(
        "LOCATION_PERMISSION_DENIED: Location access is required. Please enable location permissions in your browser or app settings."
      );
    }

    // Step 2: Fetch current location
    const location = await getCurrentLocation();

    // Step 3: Validate coordinates
    if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      throw new Error(
        "LOCATION_UNAVAILABLE: Could not fetch your live GPS coordinates. Please ensure GPS is enabled."
      );
    }

    // Step 4: Fallback if address missing
    let address = location.address;
    if (!address) {
      console.warn("⚠️ Address not found, fallback to coordinates only");
      address = `${location.latitude}, ${location.longitude}`;
    }

    // Step 5: Return structured payload
    return {
      [`${actionType}_gmapurl`]: location.gmapLink || `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
      [`${actionType}_gmapAddress`]: address,
    };
  } catch (error) {
    console.error("🚫 Location error:", error);

    const msg = error.message.toLowerCase();
    let userMessage = "Unknown location error. Please enable GPS and retry.";

    if (msg.includes("permission")) {
      userMessage =
        "Location access is required. Please allow location permission in your browser or device settings.";
    } else if (msg.includes("timeout")) {
      userMessage =
        "Location request timed out. Please ensure GPS is enabled and try again.";
    } else if (msg.includes("unavailable")) {
      userMessage =
        "Could not determine your location. Please move to an open area with better signal.";
    } else if (msg.includes("address")) {
      userMessage =
        "Unable to fetch your address. Please retry in an open area or with better network.";
    }

    throw new Error(userMessage);
  }
};

export const punchService = {
  /**
   * Fetch login hours
   */
  getLoginHours: async (payload) => {
    const response = await api.post(
      "/expo_access_api/login_hours/",
      { AUTHORIZEKEY: AUTHORIZE_KEY, ...payload },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  /**
   * Update login/logout times
   */
  updateLoginLogoutTime: async (payload) => {
    const response = await api.post(
      "/expo_access_api/Updatelogin_logoutTime/",
      { AUTHORIZEKEY: AUTHORIZE_KEY, ...payload },
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  /**
   * Fetch BreakOut ID by Attendance ID
   */
  getBreakOutIDByAttrID: async (att_id) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      att_id,
    };
    const response = await api.post(
      "/expo_access_api/getBreakOutIDByAttrID/",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  },

  /**
   * Employee Punch In (requires live location)
   */
  employeePunchIn: async ({ employee_id, datetime }) => {
    try {
      const locationPayload = await getStrictLocationPayload("punch_in");

      const payload = {
        AUTHORIZEKEY: AUTHORIZE_KEY,
        employee_id,
        datetime,
        ...locationPayload,
      };

      const response = await api.post(
        "/expo_access_api/employee_punch_in_api/",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Punch In failed:", error.message);
      throw new Error(
        error.message ||
          "Unable to punch in. Please enable GPS/location and try again."
      );
    }
  },

  /**
   * Employee Punch Out (requires live location)
   */
  employeePunchOut: async ({ employee_id, datetime, id }) => {
    try {
      const locationPayload = await getStrictLocationPayload("punch_out");

      const payload = {
        AUTHORIZEKEY: AUTHORIZE_KEY,
        employee_id,
        datetime,
        id,
        ...locationPayload,
      };

      const response = await api.post(
        "/expo_access_api/employee_punch_out_api/",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Punch Out failed:", error.message);
      throw new Error(
        error.message ||
          "Unable to punch out. Please enable GPS/location and try again."
      );
    }
  },

  /**
   * Employee Break In/Out (no location required)
   */
  employeeBreakInOut: async ({ id, att_id, break_type, datetime }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      ...(id && { id }), // include id only for break-out
      att_id,
      break_type,
      datetime,
    };

    const response = await api.post(
      "/expo_access_api/employee_break_in_out_api/",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data;
  },
};
