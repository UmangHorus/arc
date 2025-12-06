import api from "./api/axios";

const AUTHORIZE_KEY = process.env.NEXT_PUBLIC_API_AUTH_KEY || "";

const InvoiceService = {
  getInvoiceList: async ({ token, employeeId, fromDate, toDate, status, invoiceStatus }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token || "");
    formData.append("from_date", fromDate); // expected DD/MM/YYYY upstream – pass preformatted
    formData.append("to_date", toDate);
    formData.append("paid_unpaid", invoiceStatus ?? "");
    formData.append("invoice_status", status ?? "");
    formData.append("employee_id", employeeId || "");

    const response = await api.post("/expo_access_api/GetInvoiceList", formData);
    return response.data;
  },

  getEInvoice: async ({ token, id }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token || "");
    formData.append("id", id);
    formData.append("type", "1");
    const response = await api.post("/expo_access_api/getEInvoice/", formData);
    return response.data;
  },

  saveEInvoice: async ({ token, id, Json2nd = "0", IsDividedPercentageWiseDiscount = "0" }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token || "");
    formData.append("id", id);
    formData.append("type", "1");
    formData.append("Json2nd", Json2nd);
    formData.append("IsReverse", "");
    formData.append("IsDividedPercentageWiseDiscount", IsDividedPercentageWiseDiscount);
    const response = await api.post("/expo_access_api/saveEInvoice/", formData);
    return response.data;
  },

  cancelEInvoice: async ({ id }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("id", id);
    formData.append("type", "1");
    const response = await api.post("/expo_access_api/cancelEInvoice/", formData);
    return response.data;
  },

  getEWaybill: async ({ token, id }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token || "");
    formData.append("id", id);
    formData.append("type", "1");
    const response = await api.post("/expo_access_api/getEWaybill/", formData);
    return response.data;
  },

  saveEWaybill: async ({ token, id }) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append("PHPTOKEN", token || "");
    formData.append("id", id);
    formData.append("type", "1");
    const response = await api.post("/expo_access_api/saveEWaybill/", formData);
    return response.data;
  },
};

export default InvoiceService;


