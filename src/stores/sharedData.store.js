import { create } from "zustand";

const initialState = {
  companyBranchDivisionData: null,
  leadTypeMaster: null,
  myLeadFollowupSettings: null,
  companyInfo: null,
  companyDetails: null,
  contactProfileName: null, // Added new state
  routeList: [], // Changed from null to empty array
  templateList: null, // Add templateList to initial state
};

export const useSharedDataStore = create((set, get) => ({
  ...initialState,

  // Actions
  setCompanyBranchDivisionData: (data) =>
    set({ companyBranchDivisionData: data }),
  setLeadTypeMaster: (data) => set({ leadTypeMaster: data }),
  setMyLeadFollowupSettings: (data) => set({ myLeadFollowupSettings: data }),
  setCompanyInfo: (data) => set({ companyInfo: data }),
  setCompanyDetails: (data) => set({ companyDetails: data }),
  setContactProfileName: (name) => set({ contactProfileName: name }), // Added new action
  setRouteList: (data) => set({ routeList: data }),
  setTemplateList: (data, isLoading, error) =>
    set({ templateList: { data, isLoading, error } }), // Add setTemplateList action

  clearSharedData: () =>
    set({
      companyBranchDivisionData: null,
      leadTypeMaster: null,
      myLeadFollowupSettings: null,
      companyInfo: null,
      companyDetails: null,
      contactProfileName: null, // Added to clear
      routeList: [], // Changed from null to empty array
      templateList: null, // Clear templateList
    }),

  debugStore: () => {
    const state = get();
    console.log("Shared Data Store State:", {
      companyBranchDivisionData: state.companyBranchDivisionData,
      leadTypeMaster: state.leadTypeMaster,
      myLeadFollowupSettings: state.myLeadFollowupSettings,
      companyInfo: state.companyInfo,
      companyDetails: state.companyDetails,
      contactProfileName: state.contactProfileName, // Added to debug
      routeList: state.routeList, // Changed from null to empty array
      templateList: state.templateList, // Add to debug
    });
    return state;
  },
}));
