import {
  getCurrentLocation,
  requestLocationPermission,
} from "@/utils/location";
import api from "./api/axios";
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

export const QuotationService = {
  // Fetch template list
  getTemplateList: async (token) => {
    try {
      const formData = new FormData();
      formData.append("PHPTOKEN", token || "");
      formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");

      const response = await api.post(
        "/expo_access_api/getTemplateList/",
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
        "Error in getTemplateList:",
        error.message,
        error.response?.data
      );
      throw error; // Propagate error to useQuery
    }
  },

  // Download template
  downloadTemplate: async (
    token,
    transaction_id,
    transaction_type,
    template_id
  ) => {
    try {
      const formData = new FormData();
      formData.append("PHPTOKEN", token || "");
      formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
      formData.append("transaction_id", transaction_id || "");
      formData.append("transaction_type", transaction_type || "");
      formData.append("template_id", template_id || "");

      const response = await api.post(
        "/expo_access_api/downloadTemplate/",
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
        "Error in downloadTemplate:",
        error.message,
        error.response?.data
      );
      throw error; // Propagate error to caller
    }
  },

  getQuotation: async (token, userId) => {
    const formData = new FormData();

    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
    formData.append("created_by", userId || "");
    // formData.append("company_id", 1 || "");
    const response = await api.post(
      "/expo_access_api/getQuotation/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  QuotationDetail: async (quotationId) => {
    const formData = new FormData();

    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
    formData.append("quotation_id", quotationId || "");
    const response = await api.post(
      "/expo_access_api/QuotationDetail/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Save new quotation data
  saveQuotationData: async (quotationData) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);

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

      // Conditional fields with specified key-value logic
      formData.append(
        "contact_id",
        quotationData.user?.isEmployee
          ? quotationData.selectedContact?.id
          : quotationData.user?.id
      );
      formData.append(
        "object_type",
        quotationData.user?.isEmployee
          ? quotationData.selectedContact?.type
          : quotationData.user?.type
      );
      if (quotationData.user?.isEmployee) {
        formData.append("created_assigned_by", quotationData.user?.id);
      }

      // Handle company_id
      const companyToSend = quotationData.user?.isEmployee
        ? quotationData.selectedCompany
        : quotationData.maincompany_id;
      if (companyToSend) {
        formData.append("company_id", companyToSend);
      }

      // Handle branch_id
      const branchToSend = quotationData.user?.isEmployee
        ? quotationData.selectedBranch
        : quotationData.mainbranch_id;
      if (branchToSend) {
        formData.append("branch_id", branchToSend);
      }

      // Static and optional fields
      formData.append("create_from", "OE");
      formData.append("division_id", quotationData.selectedDivision);

      // Patient name
      const patientName = quotationData.user?.isEmployee
        ? quotationData.selectedContact?.title
        : quotationData.user?.name;
      if (patientName) {
        formData.append("patient_name", patientName);
      }

      if (quotationData.isSameAddress) {
        formData.append("billing_address_id", quotationData.isSameAddress);
        formData.append("shipping_address_id", quotationData.isSameAddress);
      } else if (quotationData.billToAddress && quotationData.shipToAddress) {
        formData.append("billing_address_id", quotationData.billToAddress);
        formData.append("shipping_address_id", quotationData.shipToAddress);
      }

      if (quotationData?.selectedTerm) {
        formData.append("payments_terms", quotationData?.selectedTerm);
      }

      if (quotationData?.selectedTerm == "F") {
        formData.append("credit_days", quotationData?.customDays);
      }

      if (quotationData.user?.isEmployee) {
        formData.append("created_by", quotationData.user?.id);
      }

      // if (quotationData?.remarks) {
      //   formData.append("remarks", quotationData?.remarks);
      // }

      // Handle remarks based on remarkType
      if (quotationData.remarkType == "text" && quotationData?.remarks) {
        formData.append("remarks", quotationData?.remarks);
      } else if (
        quotationData.remarkType == "voice" &&
        quotationData.remarksVoiceBlob?.size > 0
      ) {
        formData.append("remarkFile", quotationData.remarksVoiceBlob);
      }

      if (quotationData?.selectedWonLead?.lead_id) {
        formData.append(
          "reference_id",
          quotationData?.selectedWonLead?.lead_id
        );
        formData.append("reference_type", "7");
      }

      if (quotationData?.measurement_id) {
        formData.append("refrence_no ", quotationData.fullmeasurementno);
        formData.append("reference_id", quotationData.measurement_id); // important
        formData.append("reference_type", "306");
      }

      // Handle products
      if (quotationData.formValues && quotationData.formValues.length > 0) {
        const formattedProducts = quotationData.formValues.map((product) => {
          const formattedDate = format(
            new Date(product.scheduleDate),
            "dd-MM-yyyy"
          );
          const { Attribute_data, ...productWithoutAttributes } = product;
          return {
            ...productWithoutAttributes,
            scheduleDate: formattedDate,
          };
        });
        formData.append("products", JSON.stringify(formattedProducts));
      }

      // gst no handling
      if (quotationData?.gstNo) {
        formData.append("gst_no", quotationData?.gstNo);
      }

      const response = await api.post(
        "/expo_access_api/SaveQuotationData/",
        formData
      );
      return response.data;
    } catch (error) {
      if (error.message.includes("LOCATION_PERMISSION_REQUIRED")) {
        throw new Error(
          "Location access is required for creating quotations. Please enable location permissions."
        );
      }
      throw error;
    }
  },

  // Edit existing quotation data
  editQuotationData: async (quotationData) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append(
      "quotation_id",
      quotationData.quotationDetails?.quotation_id
    );

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

      // Contact information
      formData.append("contact_id", quotationData.quotationDetails?.contact_id);
      formData.append(
        "object_type",
        quotationData.quotationDetails?.contact_type.toString()
      );

      if (quotationData.user?.isEmployee) {
        formData.append("created_assigned_by", quotationData.user?.id);
      }

      // Company and branch information
      formData.append("company_id", quotationData.quotationDetails?.company_id);
      formData.append("branch_id", quotationData.quotationDetails?.branch_id);

      // Static fields
      formData.append("create_from", "OE");
      formData.append(
        "division_id",
        quotationData.quotationDetails?.division_id
      );

      // Patient name
      if (quotationData.quotationDetails?.patient_name) {
        formData.append(
          "patient_name",
          quotationData.quotationDetails.patient_name
        );
      }

      // Address information
      if (quotationData.quotationDetails?.billing_address_id) {
        formData.append(
          "billing_address_id",
          quotationData.quotationDetails.billing_address_id
        );
      }
      if (quotationData.quotationDetails?.shipping_address_id) {
        formData.append(
          "shipping_address_id",
          quotationData.quotationDetails.shipping_address_id
        );
      }

      // Payment terms
      if (quotationData.quotationDetails?.payments_terms) {
        formData.append(
          "payments_terms",
          quotationData.quotationDetails.payments_terms
        );
      }

      if (quotationData.quotationDetails?.payments_terms == "F") {
        formData.append(
          "credit_days",
          quotationData.quotationDetails.credit_days
        );
      }

      if (quotationData.user?.isEmployee) {
        formData.append("created_by", quotationData.user?.id);
      }

      // Remarks
      if (quotationData.quotationDetails?.remarks) {
        formData.append("remarks", quotationData.quotationDetails.remarks);
      }

      // Handle remarks based on remarkType
      // if (quotationData.remarkType == "text" && quotationData?.remarks) {
      //   formData.append("remarks", quotationData?.remarks);
      // } else if (
      //   quotationData.remarkType == "voice" &&
      //   quotationData.remarksVoiceBlob?.size > 0
      // ) {
      //   formData.append("remarkFile", quotationData.remarksVoiceBlob);
      // }

      // Handle products
      if (quotationData.formValues && quotationData.formValues.length > 0) {
        const formattedProducts = quotationData.formValues.map((product) => {
          const formattedDate = format(
            new Date(product.scheduleDate),
            "dd-MM-yyyy"
          );
          const { Attribute_data, ...productWithoutAttributes } = product;
          return {
            ...productWithoutAttributes,
            scheduleDate: formattedDate,
          };
        });
        formData.append("products", JSON.stringify(formattedProducts));
      }

      // gst no handling
      if (quotationData?.gstNo) {
        formData.append("gst_no", quotationData?.gstNo);
      }

      const response = await api.post(
        "/expo_access_api/SaveQuotationData/",
        formData
      );
      return response.data;
    } catch (error) {
      if (error.message.includes("LOCATION_PERMISSION_REQUIRED")) {
        throw new Error(
          "Location access is required for editing quotations. Please enable location permissions."
        );
      }
      throw error;
    }
  },

  // Approve/Reject quotation
  approveRejectQuotation: async (token, quotation_id, status_flg, lastapproved_reason) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("quotation_id", quotation_id);
    formData.append("status_flg", status_flg);
    formData.append("lastapproved_reason", lastapproved_reason || "");

    const response = await api.post(
      "/expo_access_api/approvedQuotation",
      formData
    );

    // Return the first element of response data array
    return Array.isArray(response.data) ? response.data[0] : response.data;
  },
};
