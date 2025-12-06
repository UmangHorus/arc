// src/lib/leadService.js

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

export const leadService = {
  // This API still uses FormData as per your original code
  getCompanyBranchDivisionData: async (token, employeeId) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("employee_id", employeeId);

    const response = await api.post(
      "/expo_access_api/getEmpCompanyAndBranch/",
      formData
    );
    return response.data;
  },

  // Updated to use JSON instead of FormData
  getContactRawcontactAutoComplete: async (
    token,
    companyId,
    includeSearch = false
  ) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      distributed_in_company: companyId,
    };

    // Only add search parameter if explicitly requested
    if (includeSearch) {
      payload.search = 1;
    }

    const response = await api.post(
      "/expo_access_api/getContactRawcontactAutoComplete/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  getProductBasedOnCompany: async (
    token,
    companyId,
    divisionId,
    employeeId
  ) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("employee_id", employeeId);

    // Only append if values exist
    if (companyId) formData.append("distributed_in_company", companyId);
    if (divisionId) formData.append("cd_id", divisionId);

    const response = await api.post(
      "/expo_access_api/getProductBasedOnCompany",
      formData
    );
    return response.data;
  },

  // New method to fetch product attributes
  GetProductAttributes: async (token, productId) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);

    // Only append if productId exists
    if (productId) formData.append("product_id", productId);

    const response = await api.post(
      "/expo_access_api/getProductAttribute",
      formData
    );
    return response.data;
  },

  // Updated to use JSON instead of FormData
  getCompanyDetails: async () => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
    };

    const response = await api.post(
      "/expo_access_api/companydetails/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Updated getProductUnit service function
  getProductUnit: async (
    token,
    productId,
    contactId,
    contactType,
    companyId,
    branchId
  ) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      product_id: productId,
      contact_id: contactId,
      contact_type: contactType,
      company_id: companyId,
      branch_id: branchId,
    };

    const response = await api.post(
      "/expo_access_api/getProductUnit/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Fetch product price list by product ID
  getProductPriceList: async (token, productId) => {
    try {
      if (!token || !productId) {
        throw new Error("Missing required parameters: token or productId");
      }

      const formData = new FormData();
      formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
      formData.append("PHPTOKEN", token);
      formData.append("product_id", productId);

      const response = await api.post(
        `/expo_access_api/getProductPriceList1`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching product price list:", error);
      return {
        STATUS: "ERROR",
        MSG: error.response?.data?.message || "Failed to fetch price list",
      };
    }
  },

  // Fetch state list for a given country
  getStateList: async (country) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      COUNTRY: country,
    };

    const response = await api.post("/expo_access_api/getstatelist/", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  // Save raw contact
  saveRawContact: async (contactData) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      contact: contactData,
    };

    const response = await api.post("/ecommerce_api/saveRawContact/", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  // Save raw contact
  updateContactandRawContact: async (contactData) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      contact: contactData,
    };

    const response = await api.post(
      "/ecommerce_api/updateContactandRawContact/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Fetch raw contact details
  getRawContactDetails: async (contactId, contactType) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      contact_id: contactId,
      contact_type: contactType,
    };

    const response = await api.post(
      "/ecommerce_api/getRawContactDetails/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Fetch lead title data
  getLeadTitle: async (token) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
    };
    const response = await api.post("/expo_access_api/getLeadTitle/", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  // Add new lead title
  addLeadTitle: async (addLeadTitleData) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      lead_title_name: addLeadTitleData.lead_title,
      company_id: addLeadTitleData.company_id,
      lead_title_id: 0,
    };
    const response = await api.post("/expo_access_api/addLeadTitle/", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  // Update lead contact data
  updateLeadContactData: async (payload) => {
    const updatedPayload = {
      AUTHORIZEKEY: AUTHORIZE_KEY, // Add AUTHORIZEKEY directly to the payload
      ...payload,
    };
    const response = await api.post(
      "/expo_access_api/updateLeadContactData/",
      updatedPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // New APIs for OTP and lead creation
  generateOtp: async (contactMobile) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      contact_mobile: contactMobile,
      form_type: 1,
    };

    const response = await api.post(
      "/expo_access_api/verifyGenerateOTPByMobileForOrderBot/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  verifyOtp: async (contact, objectId, objectType, verifyOTP, key) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      contact,
      object_id: objectId,
      object_type: objectType,
      verifyOTP,
      key,
    };

    const response = await api.post(
      "/expo_access_api/verifyRegisterOTPByMobile/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // New API for fetching contact billing address
  getContactBillingAddressForBot: async (token, contactId, contactType) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      billing_type: "Y",
      contact_id: contactId,
      contact_type: contactType,
    };

    const response = await api.post(
      "/expo_access_api/getContactBillingAddressForBot/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // New APIs for Lead Details
  checkLead: async (leadId) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      lead_id: leadId,
    };

    const response = await api.post("/expo_access_api/checkLead/", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  getAttachmentOfLead: async (leadId) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      lead_id: leadId,
    };

    const response = await api.post(
      "/expo_access_api/getAttachmentofLead/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  getLeadPastOrders: async (token, id, type) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      contact_id: id,
      contact_type: type,
    };

    const response = await api.post(
      "/expo_access_api/getLeadPastOrders/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  getmyLeadFollowup: async (token, formData) => {
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
    const response = await api.post(
      "/expo_access_api/getmyLeadFollowup/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Save lead follow-up
  saveLeadFollowup: async (
    token,
    leadId,
    createdBy,
    outcomeId,
    followupType,
    comments,
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

      // formData.append("gmapAddress", location.address);
      // formData.append("gmapurl", location.gmapLink);

      formData.append("lead_id", leadId || "");
      formData.append("followup_doneby", createdBy || "");
      formData.append("outcome", outcomeId || "");
      formData.append("followup_type", followupType || "");
      formData.append("remarks", comments || "");

      // Format dates using date-fns
      const formattedFollowupDate = followupDate
        ? format(new Date(followupDate), "dd-MM-yyyy hh:mm a")
        : "";
      formData.append("followup_taken_dt", formattedFollowupDate);

      const formattedNextActionDate = nextActionDate
        ? format(new Date(nextActionDate), "dd-MM-yyyy hh:mm a")
        : "";
      formData.append("next_action_dt", formattedNextActionDate);

      // Handle file upload
      if (file) {
        // formData.append("followUps_file_count", "1");
        formData.append("file", file, file.name);
      } else {
        // formData.append("followUps_file_count", "0");
      }

      const response = await api.post(
        "/expo_access_api/saveLeadFollowup/",
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
          "Location access is required for creating orders. Please enable location permissions."
        );
      }
      throw error;
    }
  },

 // SAVE: Add → reference_id & reference_type ALWAYS REQUIRED
  saveMeasurement: async ({
    token,
    product_id,
    attributes,
    created_by,
    reference_id,
    reference_type,
    company_id,
    branch_id,
    measurement_dt,
  }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("product_id", product_id);
    formData.append("attributes", attributes);
    formData.append("created_by", created_by);
    
    formData.append("reference_id", reference_id);
    formData.append("reference_type", reference_type);

    formData.append("company_id", company_id);
    formData.append("branch_id", branch_id);
    formData.append("measurement_dt", measurement_dt);

    const response = await api.post(
      "/expo_access_api/saveMeasurement/",
      formData
    );
    return response.data;
  },

 // UPDATE: Edit → reference_id & reference_type ALWAYS REQUIRED
  updateMeasurement: async ({
    token,
    product_id,
    attributes,
    created_by,
    reference_id,
    reference_type,
    company_id,
    branch_id,
    measurement_dt,
    measurement_id,
  }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("product_id", product_id);
    formData.append("attributes", attributes);
    
    formData.append("reference_id", reference_id);     // Always sent
    formData.append("reference_type", reference_type); // Always sent

    formData.append("company_id", company_id);
    formData.append("branch_id", branch_id);
    formData.append("measurement_dt", measurement_dt);
    formData.append("measurement_id", measurement_id);
    formData.append("updated_by", created_by);

    const response = await api.post(
      "/expo_access_api/saveMeasurement/",
      formData
    );
    return response.data;
  },

  getMeasurement: async (token, userId, companyId, branchId) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("created_by", userId);
    formData.append("company_id", companyId);
    formData.append("branch_id", branchId);

    const response = await api.post(
      "/expo_access_api/getMeasurement/",
      formData
    );
    return response.data;
  },

  

  getMeasurementDetail: async (
    token,
    userId,
    companyId,
    branchId,
    measurementId
  ) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("created_by", userId);
    formData.append("company_id", companyId);
    formData.append("branch_id", branchId);
    formData.append("measurement_id", measurementId); // Only for detail

    const response = await api.post(
      "/expo_access_api/getMeasurement/", // Same endpoint
      formData
    );
    return response.data;
  },

   getMeasurementDetail1: async (
    token,
    userId,
    companyId,
    branchId,
    measurementId
  ) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("created_by", userId);
    formData.append("company_id", companyId);
    formData.append("branch_id", branchId);
    formData.append("measurement_id", measurementId); // Only for detail
        formData.append("flg", 1); // Only for detail

    const response = await api.post(
      "/expo_access_api/getMeasurement1/", // Same endpoint
      formData
    );
    return response.data;
  },

  saveMedBotLeadData: async (leadData) => {
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
        leadData.user?.isEmployee
          ? leadData.selectedContact?.id
          : leadData.user?.id
      );
      formData.append(
        "object_type",
        leadData.user?.isEmployee
          ? leadData.selectedContact?.type
          : leadData.user?.type
      );
      if (leadData.user?.isEmployee) {
        formData.append("created_assigned_by", leadData.user?.id);
      }

      if (leadData?.leadTitle) {
        formData.append("lead_title", leadData?.leadTitle);
      }

      // Handle company_id
      const companyToSend = leadData.user?.isEmployee
        ? leadData.selectedCompany
        : leadData.maincompany_id;
      if (companyToSend) {
        formData.append("company_id", companyToSend);
      }

      // Handle branch_id
      const branchToSend = leadData.user?.isEmployee
        ? leadData.selectedBranch
        : leadData.mainbranch_id;
      if (branchToSend) {
        formData.append("branch_id", branchToSend);
      }

      // Static and optional fields
      formData.append("create_from", "OE");
      formData.append("division_id", leadData.selectedDivision);

      // if (leadData.location?.address) {
      //   formData.append("gmapAddress", leadData.location.address);
      // }
      // if (leadData.location?.gmapLink) {
      //   formData.append("gmapurl", leadData.location.gmapLink);
      // }

      // Handle remarks based on remarkType
      if (leadData.remarkType == "text" && leadData?.remarks) {
        formData.append("remarks", leadData?.remarks);
      } else if (
        leadData.remarkType == "voice" &&
        leadData.remarksVoiceBlob?.size > 0
      ) {
        formData.append("remarkFile", leadData.remarksVoiceBlob);
      }

      // Handle patient_name based on user?.isEmployee
      const patientName = leadData.user?.isEmployee
        ? leadData.selectedContact?.title
        : leadData.user?.name;
      if (patientName) {
        formData.append("patient_name", patientName);
      }

      // Handle activeTab-specific fields
      if (leadData.activeTab == "Upload Order Details") {
        if (leadData.singleFile?.length > 0) {
          formData.append("botFile", leadData.singleFile[0]);
        }
        formData.append(
          "lead_file_count",
          leadData.multipleFiles?.length || ""
        );
        for (let v = 0; v < leadData.multipleFiles?.length; v++) {
          const num = v + 1;
          formData.append(
            "LeadFile" + num,
            leadData.multipleFiles[v],
            leadData.multipleFiles[v].name
          );
        }
      } else if (leadData.activeTab == "Upload by Products") {
        // Transform editableProducts into comma-separated string: name1,qty1,unit1,name2,qty2,unit2,...
        const productString = leadData.editableProducts
          ?.map((product) => `${product.name},${product.qty},${product.unit}`)
          .join(",");
        formData.append("productby_name", productString || "");
        formData.append(
          "lead_file_count",
          leadData.multipleFiles?.length || ""
        );
        for (let v = 0; v < leadData.multipleFiles?.length; v++) {
          const num = v + 1;
          formData.append(
            "LeadFile" + num,
            leadData.multipleFiles[v],
            leadData.multipleFiles[v].name
          );
        }
      } else if (leadData.activeTab == "Select Products") {
        const modifiedMergedData = leadData.formValues.map((item) => {
          // Remove Attribute_data (like in productWithoutAttributes logic)
          const { Attribute_data, secondary_base_qty, ...rest } = item;

          return {
            ...rest,
            conv_fact: secondary_base_qty || "0",
          };
        });

        formData.append("products", JSON.stringify(modifiedMergedData));

        if (leadData.singleFile?.length > 0) {
          formData.append("bot_file_extra", leadData.singleFile[0]);
        }
      } else if (leadData.activeTab == "Voice Note") {
        if (leadData.voiceNoteBlob?.size > 0) {
          formData.append("botFile", leadData.voiceNoteBlob);
        }
      }

      const response = await api.post(
        "/expo_access_api/saveMedBotLeaddata/",
        formData
      );
      return response.data;
    } catch (error) {
      // Handle location-specific errors
      if (error.message.includes("LOCATION_PERMISSION_REQUIRED")) {
        throw new Error(
          "Location access is required for creating orders. Please enable location permissions."
        );
      }
      throw error;
    }
  },
};
