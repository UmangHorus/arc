import api from "./api/axios";

const AUTHORIZE_KEY = process.env.NEXT_PUBLIC_API_AUTH_KEY || "";

const OrderProcessingService = {
  // Search sales order list with filters
  searchSalesOrderList: async ({ token, employeeId, filters = {} }) => {
    const {
      company_id = "",
      branch_id = "",
      cd_id = "",
      created_by = "",
      s_delivery_dt = "",
      e_delivery_dt = "",
    } = filters;

    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      employee_id: employeeId,
      company_id,
      branch_id,
      cd_id,
      created_by,
      s_delivery_dt,
      e_delivery_dt,
    };

    const response = await api.post(
      "/expo_access_api/search_salesorderlist_api/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Approve selected orders
  salesOrderApproved: async ({ token, employeeId, salesOrderIds }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      salesorder_ids: salesOrderIds,
      employee_id: employeeId,
    };

    const response = await api.post(
      "/expo_access_api/salesorderapproved_support/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Reject selected orders
  salesOrderRejected: async ({ token, employeeId, salesOrderIds }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      salesorder_ids: salesOrderIds,
      employee_id: employeeId,
    };

    const response = await api.post(
      "/expo_access_api/salesorderrejected/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Update dispatch status (Accept/Reject)
  updateDispatchStatus: async ({
    token,
    employeeId,
    salesOrderId,
    isDispatch,
  }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      salesorder_id: salesOrderId,
      is_dispatch: isDispatch, // "Y" for accept, "C" for reject
      employee_id: employeeId,
    };

    const response = await api.post(
      "/expo_access_api/updateDispatchStatus/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get single sales order details
  getSingleSalesOrder: async ({ token, salesOrderId }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      salesorder_id: salesOrderId,
    };

    const response = await api.post("/expo_access_api/getSingleSo/", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  // Update sales order data
  // updateSalesOrder: async ({ token, employeeId, salesOrderData }) => {
  //   const formData = new FormData();
  //   formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
  //   formData.append("PHPTOKEN", token);
  //   formData.append("salesorder_id", salesOrderData.salesorder_id);
  //   formData.append("contact_id", salesOrderData.contact_id);
  //   formData.append("object_type", salesOrderData.object_type);
  //   formData.append("billing_address_id", salesOrderData.billing_address_id);
  //   formData.append("shipping_address_id", salesOrderData.shipping_address_id);
  //   formData.append("division_id", salesOrderData.division_id);
  //   formData.append("company_id", salesOrderData.company_id);
  //   formData.append("branch_id", salesOrderData.branch_id);
  //   formData.append("created_by", employeeId);
  //   formData.append("create_from", "salesorder_app");
  //   formData.append("gmapAddress", salesOrderData.billto_address || "");
  //   formData.append("gmapurl", salesOrderData.gmapurl || "");
  //   formData.append("remarks", salesOrderData.remarks || "");
  //   formData.append("credit_days", salesOrderData.credit_days || "");
  //   formData.append("payments_terms", salesOrderData.payments_terms || "");
  //   formData.append("patient_name", salesOrderData.contact_name || "");
  //   formData.append("delivery_type", salesOrderData.delivery_type || "2");

  //   if (salesOrderData.products && salesOrderData.products.length > 0) {
  //     formData.append("products", JSON.stringify(salesOrderData.products));
  //   }

  //   const response = await api.post(
  //     "/expo_access_api/insertSOData/",
  //     formData
  //   );
  //   return response.data;
  // },

  updateSalesOrder: async ({ token, employeeId, formData }) => {
    try {
      // Add additional required parameters to formData
      formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);

      // formData.append("employee_id", employeeId);

      const response = await api.post(
        "/expo_access_api/insertSOData/",
        formData
      );

      return response.data;
    } catch (error) {
      console.error("Error updating sales order:", error);
      throw error;
    }
  },

  // Get count of orders
  getCountOfOrder: async ({ token, employeeId }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      employee_id: employeeId,
    };

    const response = await api.post(
      "/expo_access_api/getCountOfOrder/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get delivery challan count
  getDeliveryChallanCount: async ({ token, employeeId }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      employee_id: employeeId,
    };

    const response = await api.post(
      "/expo_access_api/deliverychallan_count/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get delivery challan list
  getDeliveryChallanList: async ({
    token,
    employeeId,
    companyId,
    branchId,
    assignedTo,
  }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      employee_id: employeeId,
      company_id: companyId || "",
      branch_id: branchId || "",
      assigned_to: assignedTo || "",
    };

    const response = await api.post(
      "/expo_access_api/delievrychallanlist_api/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get ship through list
  getShipThroughList: async ({ token, flg }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      flg: flg,
    };

    const response = await api.post(
      "/expo_access_api/getShipThroughList/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get employee list
  getEmployeeList: async ({ token }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
    };

    const response = await api.post(
      "/expo_access_api/getEmployeeList/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get employee list from medical API
  getMedicalEmployeeList: async ({ token }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
    };

    const response = await api.post(
      "/expo_access_api/getEmployeeList/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get DC details
  getDCDetails: async ({ token, dcId }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      dc_id: dcId,
    };

    const response = await api.post("/expo_access_api/getDCDetails/", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  },

  // Dispatch delivery challan
  dispatchDeliveryChallan: async ({ token, employeeId, formData }) => {
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN",  token);
    formData.append("employee_id", employeeId);

    const response = await api.post(
      "/expo_access_api/dispatchDeliveryChallan/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Get transporter list
  getTransporterList: async ({ token }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
    };

    const response = await api.post(
      "/expo_access_api/getmyTransporterList/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get dispatch delivery challan list
  getDispatchDeliveryChallanList: async ({
    token,
    employeeId,
    status,
    companyId,
    branchId,
    routeId,
    transportId,
    deliveryType,
  }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      employee_id: employeeId,
      status: status || "",
      company_id: companyId || "",
      branch_id: branchId || "",
      delivery_type: deliveryType || "",
    };

    if (routeId) {
      payload.route_id = routeId;
    }

    if (transportId) {
      payload.transport_id = transportId;
    }

    const response = await api.post(
      "/expo_access_api/delievrydispatchchallanlist_api/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Update DC dispatch status (multiple)
  updateDCDispatchStatus: async ({ token, dcData, attachment }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("dc_data", JSON.stringify(dcData));

    if (attachment) {
      formData.append("attachment", attachment);
    }

    const response = await api.post(
      "/expo_access_api/dcDispatchStatusUpdate_multiple/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Get template list
  getTemplateList: async ({ token }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);

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
  },

  // Download template
  downloadTemplate: async ({
    token,
    transactionId,
    transactionType,
    templateId,
  }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN",token);
    formData.append("transaction_id", transactionId);
    formData.append("transaction_type", transactionType);
    formData.append("template_id", templateId);

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
  },

  // Share template via WhatsApp
  shareTemplateViaWhatsApp: async ({
    token,
    transactionId,
    transactionType,
    templateId,
    contactId,
    contactType,
    mobileNo,
    mobileIsdNo,
  }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("transaction_id", transactionId);
    formData.append("transaction_type", transactionType);
    formData.append("template_id", templateId);
    formData.append("contact_id", contactId);
    formData.append("contact_type", contactType || "");
    formData.append("mobile_no", mobileNo || "");
    formData.append("mobile_isd_no", mobileIsdNo || "");
    formData.append("sent_whatsapp", "Y");

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
  },

  // Generate OTP for mobile
  generateOTP: async ({ token, contactMobile }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      contact_mobile: contactMobile,
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

  // Verify OTP
  verifyOTP: async ({ token, contact, key, verifyOTP }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      contact: contact,
      key: key,
      verifyOTP: verifyOTP,
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

  // Save delivery challan by sales order
  saveDeliveryChallanBySalesorder: async ({
    token,
    employeeId,
    salesOrderId,
    deliveryType,
    creditDays,
    shipThrough,
    transporterId,
    vehicleNo,
    lrNo,
    lrDate,
    products,
    remarks,
  }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      delivery_type: deliveryType,
      credit_days: creditDays,
      ship_through: shipThrough || "",
      transporter_id: transporterId || "",
      vehicle_no: vehicleNo || "",
      lr_no: lrNo || "",
      lr_date: lrDate || "",
      products: JSON.stringify(products),
      remarks: remarks || "",
      employee_id: employeeId,
      salesorder_id: salesOrderId,
    };

    const response = await api.post(
      "/expo_access_api/saveDeliveryChallanBySalesorder/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get stock list for barcode products
  getStockList: async ({ token, companyId, branchId, productId }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("company_id", companyId);
    formData.append("branch_id", branchId);
    formData.append("product_id", productId);

    const response = await api.post("/expo_access_api/GetStockList", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Save payment receipt
  savePaymentReceipt: async ({
    token,
    employeeId,
    salesorderId,
    paymentMode,
    transactionNumber,
    instrumentDate,
    amount,
    remarks,
    attachment,
  }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("salesorder_id", salesorderId);
    formData.append("employee_id", employeeId);
    formData.append("paymentmode", paymentMode);
    formData.append("transactionNumber", transactionNumber || "");
    formData.append("amount", amount);
    formData.append("remarks", remarks || "");
    
    if (attachment) {
      formData.append("attachment", attachment);
    }

    const response = await api.post(
      "/expo_access_api/savePaymentReceipt/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Get payment report (sales order to payment report)
  getPaymentReport: async ({
    token,
    employeeId,
    status = "",
    paymentType = "",
    deliveryId = "",
    startDate = "",
    endDate = "",
  }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      employee_id: employeeId || "",
      status: status || "",
      payment_type: paymentType || "",
      delivery_id: deliveryId || employeeId || "",
      startDate: startDate || "",
      endDate: endDate || "",
    };

    const response = await api.post(
      "/expo_access_api/salesordertopaymentreport/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Download receipt image
  downloadReceiptImage: async ({ token, employeeId, receiptId }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      employee_id: employeeId,
      receipt_id: receiptId,
    };

    const response = await api.post(
      "/expo_access_api/downloadreceiptimage/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get subordinate contact raw contact (for WhatsApp sharing)
  getSubordinateContactRawcontact: async ({ token, contactId, contactType }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token);
    formData.append("contact_id", contactId);
    formData.append("contact_type", contactType || "");

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
  },

  // Generate OTP for mobile (for order bot)
  generateOTPForOrderBot: async ({ token, contactMobile }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      contact_mobile: contactMobile,
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

  // Verify OTP for mobile (for order bot)
  verifyOTPForOrderBot: async ({ token, contact, key, verifyOTP }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      contact: contact,
      key: key,
      verifyOTP: verifyOTP,
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

  // Get sales order to delivery summary report
  getSalesOrderToDeliverySummaryReport: async ({ token, status }) => {
    const payload = {
      AUTHORIZEKEY: AUTHORIZE_KEY,
      PHPTOKEN: token,
      status: status || "",
    };

    const response = await api.post(
      "/expo_access_api/salesordertodeliverysummaryreport/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

};

export default OrderProcessingService;
