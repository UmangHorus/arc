import { create } from "zustand";
import { persist } from "zustand/middleware";

const initialState = {
  step: "mobile",
  mobile: "",
  otpData: null,
  token: null,
  user: null,
  isAuthenticated: false,
  appConfig: null,
  serverTime: null,
  userRole: null,
  navConfig: {
    permissions: {
      showLeads: false,
      showOrders: false,
    },
    labels: {
      leads: "Leads",
      orders: "Orders",
      contacts: "Contact",
    },
  },
  modalState: { isOpen: false, id: null },
  location: {
    latitude: null,
    longitude: null,
    accuracy: null,
    address: null,
    gmapLink: null,
  },
  locationError: null,
};

export const useLoginStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      setMobile: (mobile) => set({ mobile }),
      setStep: (step) => set({ step }),
      setOtpData: (otpData) => set({ otpData }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setLocation: (location) => set({ location }),
      setLocationError: (error) => set({ locationError: error }),

      login: (token, user, verificationData = null) => {
        const newState = {
          token,
          user: {
            ...user,
            isEmployee: user.isEmployee === true || user.isEmployee === "Y",
            enableOtp: user.enableOtp === true || user.enableOtp === "Y",
          },
          isAuthenticated: true,
          step: "complete",
        };

        if (verificationData) {
          const configData = verificationData.DATA || verificationData;
          newState.appConfig = configData;
          newState.serverTime = configData.serverTime;
          newState.userRole = configData.user_role;

          newState.navConfig = {
            permissions: {
              showLeads: configData.lead_creation === "Y",
              showOrders: configData.order_creation === "Y",
              showQuotations: configData.quotation_creation == "1",
              showMeasurements: configData.measurement_creation == "1",
              showInvoices: configData.invoice_creation == "1",
              showReceipts: configData.receipt_creation == "1",
            },
            labels: {
              leads: configData.lead_config_name || "Leads",
              orders: configData.so_config_name || "Orders",
              contacts: configData.contact_config_name || "Contact",
            },
          };
        }

        set(newState);
      },

      logout: () => {
        // Always clear all auth cookies
        const cookiesToClear = ["token", "isEmployee", "expiry"];
        cookiesToClear.forEach((cookieName) => {
          document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict${
            process.env.NODE_ENV === "production" ? "; Secure" : ""
          }`;
        });

        // Clear Zustand state
        set({
          ...initialState,
          modalState: { isOpen: false, id: null }, // reset modal
        });
      },

      setModalState: (modalState) => set({ modalState }),
      resetModalState: () => set({ modalState: { isOpen: false, id: null } }),

      debugStore: () => {
        const state = get();
        console.log("Current Zustand State:", {
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          navConfig: state.navConfig,
          modalState: state.modalState,
        });
        return state;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        appConfig: state.appConfig,
        serverTime: state.serverTime,
        navConfig: state.navConfig,
        modalState: state.modalState,
        location: state.location,
      }),
    }
  )
);
