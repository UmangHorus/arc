import api from "@/lib/api/axios";
import {
  getCurrentLocation,
  requestLocationPermission,
} from "@/utils/location";
import { format } from "date-fns";

const AUTHORIZE_KEY = process.env.NEXT_PUBLIC_API_AUTH_KEY || "";

const getStrictLocationPayload = async () => {
  try {
    // Step 1: Request or check location permission
    const permission = await requestLocationPermission();

    if (permission === "denied" || permission === "prompt-denied") {
      throw new Error(
        "LOCATION_PERMISSION_DENIED: Location access is required. Please enable location permissions in your browser or app settings."
      );
    }

    // Step 2: Attempt to fetch current location
    const location = await getCurrentLocation();

    // Step 3: Validate coordinates
    if (
      !location ||
      typeof location.latitude !== "number" ||
      typeof location.longitude !== "number"
    ) {
      throw new Error(
        "LOCATION_UNAVAILABLE: Could not fetch your live GPS coordinates. Please ensure GPS is enabled and try again."
      );
    }

    // Step 4: Validate address (fallback if address is missing but coordinates exist)
    if (!location.address) {
      console.warn("⚠️ Address not found, fallback to coordinates only");
      location.address = `${location.latitude}, ${location.longitude}`;
    }

    // Step 5: Return consistent payload
    return {
      gmapurl:
        location.gmapLink ||
        `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
      gmapAddress: location.address,
      error: null,
    };
  } catch (error) {
    // Step 6: Handle specific error categories gracefully
    let userMessage = "Unknown location error. Please enable GPS and retry.";

    const msg = error.message.toLowerCase();

    if (msg.includes("permission")) {
      userMessage =
        "Location access is required. Please allow location permission in your browser or app settings.";
    } else if (msg.includes("timeout")) {
      userMessage =
        "Location request timed out. Please ensure GPS is enabled and try again.";
    } else if (msg.includes("unavailable")) {
      userMessage =
        "Could not determine your location. Please move to an open area with better signal.";
    } else if (msg.includes("address")) {
      userMessage =
        "Unable to fetch your address. Please retry after a few seconds.";
    }

    console.error("🚫 Location error:", error);
    throw new Error(userMessage);
  }
};

export const ContactService = {
  // Fetch contact list with addresses
  getContactList: async (token, userType, userId) => {
    const formData = new FormData();
    formData.append("object_type", userType || "EMPLOYEE");
    formData.append("object_id", userId || "");
    formData.append("PHPTOKEN", token || "");
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");

    const response = await api.post(
      "/expo_access_api/getContactRawcontactWithAddressList/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Fetch subordinates for a contact
  getSubordinates: async (token, contactId, contactType) => {
    try {
      const formData = new FormData();
      formData.append("contact_id", contactId || "");
      formData.append("contact_type", contactType || "");
      formData.append("PHPTOKEN", token || "");
      formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");

      const response = await api.post(
        "/expo_access_api/getSubordinateContactRawcontact/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error in getSubordinates:",
        error.message,
        error.response?.data
      );
      throw error; // Propagate error to useQuery
    }
  },

  // Fetch lead followup settings
  getLeadFollowupSettings: async (token) => {
    try {
      const formData = new FormData();
      formData.append("PHPTOKEN", token || "");
      formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");

      const response = await api.post(
        "/expo_access_api/getmyLeadFollowupSettings/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error in getLeadFollowupSettings:",
        error.message,
        error.response?.data
      );
      throw error; // Propagate error to useQuery
    }
  },

  // Fetch contact and raw contact follow-up data
  getContactRawcontactFollowUP: async (token, formData) => {
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");

    const response = await api.post(
      "/expo_access_api/getContactRawcontactFollowUP/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // download attachment in contact followup
  downloadInteractionsFile: async (token, formData) => {
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
    formData.append("PHPTOKEN", token || "");
    const response = await api.post(
      "/expo_access_api/downloadInteractionsFile/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Record Visit In/Out
  employeeVisitorInOut: async (
    token,
    visitorType,
    employeeId,
    referenceId,
    referenceType,
    evId = null
  ) => {
    const formData = new FormData();
    formData.append("visitor_type", visitorType);
    formData.append("employee_id", employeeId);
    formData.append("reference_id", referenceId);
    formData.append("reference_type", referenceType);
    formData.append("PHPTOKEN", token || "");
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
    if (evId) {
      formData.append("ev_id", evId);
    }

    const response = await api.post(
      "/expo_access_api/employeeVisitorInOut/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // New method for fetching route list
  getRouteList: async (token, id) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      employee_id: id,
    };

    const response = await api.post("/expo_access_api/route_list/", payload, {
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // Save contact follow-up
  saveContactRawcontactFollowUP: async (
    token,
    contactId,
    contactType,
    createdBy,
    outcomeId,
    followupType,
    comments,
    subordinateId,
    subordinateName,
    followupDate,
    nextActionDate,
    file,
    location
  ) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
    formData.append("PHPTOKEN", token || "");

    try {
      // 🛰️ 1. Fetch mandatory location (blocks if unavailable)
      const locationPayload = await getStrictLocationPayload();

      if (
        !locationPayload.gmapurl ||
        !locationPayload.gmapAddress ||
        locationPayload.error
      ) {
        throw new Error(
          "LOCATION_REQUIRED: Location could not be captured. Please ensure GPS and permissions are enabled."
        );
      }

      formData.append("gmapurl", locationPayload.gmapurl);
      formData.append("gmapAddress", locationPayload.gmapAddress);
      // If no location at all, the API will handle missing location fields

      // formData.append("gmapAddress", location?.address || "");
      // formData.append("gmapurl", location?.gmapLink || "");

      formData.append("contact_id", contactId || "");
      formData.append("contact_type", contactType || "");
      formData.append("created_by", createdBy || "");
      formData.append("outcome_id", outcomeId || "");
      formData.append("followup_type", followupType || "");
      formData.append("comments", comments || "");
      formData.append("subsubordinate_ids", subordinateId || "");
      formData.append("subsubordinate_names", subordinateName || "");

      // Format dates using date-fns
      const formattedFollowupDate = followupDate
        ? format(new Date(followupDate), "dd-MM-yyyy hh:mm a")
        : "";
      formData.append("followup_taken_dt", formattedFollowupDate);

      const formattedNextActionDate = nextActionDate
        ? format(new Date(nextActionDate), "dd-MM-yyyy hh:mm a")
        : "";
      formData.append("nextaction_dt", formattedNextActionDate);

      // Handle file upload
      if (file) {
        formData.append("followUps_file_count", "1");
        formData.append("FollowFile1", file, file.name);
      } else {
        formData.append("followUps_file_count", "0");
      }

      const response = await api.post(
        "/expo_access_api/saveContactRawcontactFollowUP/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      // Handle location-specific errors
      if (error.message.includes("LOCATION_PERMISSION_REQUIRED")) {
        throw new Error(
          "Location access is required for editing orders. Please enable location permissions."
        );
      }
      throw error;
    }
  },

  // add subordinate
  addSubordinate: async (
    token,
    parent_contact_id,
    parent_contact_type,
    {
      subordinate_title,
      subordinate_name,
      subordinate_email,
      subordinate_mobile,
    }
  ) => {
    const formData = new FormData();
    formData.append("object_id", parent_contact_id);
    formData.append("object_type", parent_contact_type);
    formData.append(
      "form_data",
      JSON.stringify({
        contact_title: subordinate_title,
        name: subordinate_name,
        email: subordinate_email,
        mobile: subordinate_mobile,
      })
    );
    formData.append("PHPTOKEN", token || "");
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");

    const response = await api.post(
      "/expo_access_api/saveSubordinate/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  getContactDetails: async (token, contactId, contactType, userId) => {
    try {
      if (!token || !contactId || !contactType) {
        throw new Error(
          "Missing required parameters: token, contactId, or contactType"
        );
      }

      // Map contactType: "C" → 1, "RC" → 6
      const mappedContactType =
        contactType == "C" ? 1 : contactType == "RC" ? 6 : contactType;

      const formData = new FormData();
      formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
      formData.append("PHPTOKEN", token);
      formData.append("contact_id", contactId);
      formData.append("contact_type", mappedContactType);
      formData.append("created_by", userId);

      const response = await api.post(
        `/expo_access_api/getContactDetails`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching contact details:", error);
      return {
        STATUS: "ERROR",
        MSG: error.response?.data?.message || "Failed to fetch contact details",
      };
    }
  },
};
