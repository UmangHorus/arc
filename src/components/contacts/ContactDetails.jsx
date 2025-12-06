"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HashLoader } from "react-spinners";
import AssociateContact from "./sections/AssociateContact";
import ContactLeads from "./sections/ContactLeads";
import ContactQuotation from "./sections/ContactQuotation";
import ContactSalesOrder from "./sections/ContactSalesOrder";
import ContactLeadFollowUp from "./sections/ContactLeadFollowUp";
import { useLoginStore } from "@/stores/auth.store";
import ContactFollowUpList from "./sections/ContactFollowUpList";
import { ContactService } from "@/lib/ContactService";
import ContactBasicDetails from "./sections/ContactBasicDetails";
import ContactBasicDetailsCard from "./sections/ContactBasicDetailsCard";
import ContactAddresses from "./sections/ContactAddresses";
import ContactMeasurements from "./sections/ContactMeasurements"; // Import

const ContactDetails = ({ contactId, contactType }) => {
  const { user, token, location, appConfig } = useLoginStore();
  const [contact, setContact] = useState({});
  const [defaultTab, setDefaultTab] = useState("basic-details");
  const leadLabel = useLoginStore(
    (state) => state.navConfig?.labels?.leads || "Lead"
  );
  const quotationLabel = useLoginStore(
    (state) => state.navConfig?.labels?.Quotation_config_name || "Quotation"
  );
  const ordersLabel = useLoginStore(
    (state) => state.navConfig?.labels?.orders || "Sales Order"
  );
  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );
  const RawContactLabel = appConfig?.rawcontact_config_name || "RawContact";

  const { data, isLoading, error } = useQuery({
    queryKey: ["contactDetails", contactId, contactType, user?.id],
    queryFn: () =>
      ContactService.getContactDetails(token, contactId, contactType, user?.id),
    enabled: !!token && !!contactId && !!contactType && !!user?.id,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: "always",
  });

  // NEW FUNCTION ADDED
  const formatCompleteAddress = (address) => {
    if (!address) return "";

    const addressParts = [
      address.address1,
      address.address_2,
      address.area,
      address.city_name,
      address.district,
      address.state,
      address.country,
      address.zipcode
    ].filter(part => part && part.trim() !== "");

    return addressParts.join(", ") || "";
  };

  useEffect(() => {
    if (data?.STATUS === "SUCCESS" && Array.isArray(data?.DATA) && data?.DATA?.length > 0) {
      const contactData = data?.DATA?.[0];
      const contactAddresses = contactData?.contact_address || [];
      const billingAddress = contactAddresses.find((addr) => addr.billing_flg == "Y") || contactAddresses[0] || {};

      setContact({
        name: contactData?.contact_name || "",
        photo_path: contactData?.photo_path || "",
        email: contactData?.contact_email_address || "",
        contactType: contactType || "",
        mobile: contactData?.contact_mobile_no || "",
        contact_title: contactData?.contact_title || "",
        code: contactData?.code || "",
        handled_by: contactData?.handled_by || "",
        position: contactData?.contact_title || "",
        industry: contactData?.industries_name || "",
        city: billingAddress?.city_name || "",
        country: billingAddress?.country || "",
        address: formatCompleteAddress(billingAddress),
        route: contactData?.route_values || [],
        division_label: contactData?.division_label || "",
        division: contactData?.division || "",
        contact_address: contactAddresses,
      });
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
      </div>
    );
  }

  if (error || data?.STATUS === "ERROR") {
    return (
      <div className="text-center text-red-500">
        Error: {error?.message || data?.MSG || "Failed to load contact details"}
      </div>
    );
  }

  const contactData = data?.DATA?.[0] || {};

  return (
    <div>
      {/* Contact Card */}
      <div>
        <ContactBasicDetailsCard contact={contact} />
      </div>

      {/* Tabs */}
      <Tabs
        value={defaultTab}
        onValueChange={setDefaultTab}
        className="w-full mt-4 sm:mt-6 md:mt-8"
      >
        <TabsList className="flex flex-wrap gap-2 h-auto rounded-lg bg-transparent justify-start">
          <TabsTrigger
            value="basic-details"
            className="bg-white text-[#3A3A3A] text-[14px] font-normal leading-[140%] rounded-[3px] border-[0.5px] border-solid border-[rgba(58,58,58,0.70)] data-[state=active]:bg-[#287F71] data-[state=active]:text-white data-[state=active]:border-[#287F71] hover:bg-gray-50 transition-all duration-200 py-2 px-3 text-center"
          >
            Basic Details
          </TabsTrigger>

          {contactData?.subordinate && contactData.subordinate.length > 0 && (
            <TabsTrigger
              value="associate-contact"
              className="bg-white text-[#3A3A3A] text-[14px] font-normal leading-[140%] rounded-[3px] border-[0.5px] border-solid border-[rgba(58,58,58,0.70)] data-[state=active]:bg-[#287F71] data-[state=active]:text-white data-[state=active]:border-[#287F71] hover:bg-gray-50 transition-all duration-200 py-2 px-3 text-center"
            >
              Associate Contacts
            </TabsTrigger>
          )}

          {contact.contact_address && contact.contact_address.length > 0 && (
            <TabsTrigger
              value="addresses"
              className="bg-white text-[#3A3A3A] text-[14px] font-normal leading-[140%] rounded-[3px] border-[0.5px] border-solid border-[rgba(58,58,58,0.70)] data-[state=active]:bg-[#287F71] data-[state=active]:text-white data-[state=active]:border-[#287F71] hover:bg-gray-50 transition-all duration-200 py-2 px-3 text-center"
            >
              Addresses
            </TabsTrigger>
          )}

          {contactData?.followUpList && contactData.followUpList.length > 0 && (
            <TabsTrigger
              value="contact-followup"
              className="bg-white text-[#3A3A3A] text-[14px] font-normal leading-[140%] rounded-[3px] border-[0.5px] border-solid border-[rgba(58,58,58,0.70)] data-[state=active]:bg-[#287F71] data-[state=active]:text-white data-[state=active]:border-[#287F71] hover:bg-gray-50 transition-all duration-200 py-2 px-3 text-center"
            >
              {contact.contactType == "C" ? `${contactLabel}-Followup` : contact.contactType == "RC" ? `${RawContactLabel}-Followup` : "Contact-Followup"}
            </TabsTrigger>
          )}

          {contactData?.lead && contactData.lead.length > 0 && (
            <TabsTrigger
              value="leads"
              className="bg-white text-[#3A3A3A] text-[14px] font-normal leading-[140%] rounded-[3px] border-[0.5px] border-solid border-[rgba(58,58,58,0.70)] data-[state=active]:bg-[#287F71] data-[state=active]:text-white data-[state=active]:border-[#287F71] hover:bg-gray-50 transition-all duration-200 py-2 px-3 text-center"
            >
              {`${leadLabel}`}
            </TabsTrigger>
          )}

          {contactData?.lead_lf && contactData.lead_lf.length > 0 && (
            <TabsTrigger
              value="lead-followup"
              className="bg-white text-[#3A3A3A] text-[14px] font-normal leading-[140%] rounded-[3px] border-[0.5px] border-solid border-[rgba(58,58,58,0.70)] data-[state=active]:bg-[#287F71] data-[state=active]:text-white data-[state=active]:border-[#287F71] hover:bg-gray-50 transition-all duration-200 py-2 px-3 text-center"
            >
              {`${leadLabel}-Follow Up`}
            </TabsTrigger>
          )}

          {/* NEW: Measurements Tab */}
          {contactData?.measurement_data && contactData.measurement_data.length > 0 && (
            <TabsTrigger
              value="measurements"
              className="bg-white text-[#3A3A3A] text-[14px] font-normal leading-[140%] rounded-[3px] border-[0.5px] border-solid border-[rgba(58,58,58,0.70)] data-[state=active]:bg-[#287F71] data-[state=active]:text-white data-[state=active]:border-[#287F71] hover:bg-gray-50 transition-all duration-200 py-2 px-3 text-center"
            >
              Measurements
            </TabsTrigger>
          )}

          {contactData?.quotation && contactData.quotation.length > 0 && (
            <TabsTrigger
              value="quotations"
              className="bg-white text-[#3A3A3A] text-[14px] font-normal leading-[140%] rounded-[3px] border-[0.5px] border-solid border-[rgba(58,58,58,0.70)] data-[state=active]:bg-[#287F71] data-[state=active]:text-white data-[state=active]:border-[#287F71] hover:bg-gray-50 transition-all duration-200 py-2 px-3 text-center"
            >
              {`${quotationLabel}`}
            </TabsTrigger>
          )}

          {contactData?.salesorder && contactData.salesorder.length > 0 && (
            <TabsTrigger
              value="sales-orders"
              className="bg-white text-[#3A3A3A] text-[14px] font-normal leading-[140%] rounded-[3px] border-[0.5px] border-solid border-[rgba(58,58,58,0.70)] data-[state=active]:bg-[#287F71] data-[state=active]:text-white data-[state=active]:border-[#287F71] hover:bg-gray-50 transition-all duration-200 py-2 px-3 text-center"
            >
              {`${ordersLabel}`}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="basic-details" className="bg-white text-black rounded py-3 px-4 sm:py-4 sm:px-6 mt-4">
          <ContactBasicDetails basicData={contactData} />
        </TabsContent>

        {contactData?.subordinate && contactData.subordinate.length > 0 && (
          <TabsContent value="associate-contact" className="mt-4 rounded-[10px] border border-solid border-[#DBE0E5] bg-[#FFF] shadow-[0_4px_8px_0_rgba(55,56,56,0.10)] py-4 px-6">
            <AssociateContact associateData={contactData?.subordinate || []} />
          </TabsContent>
        )}

        {contact.contact_address && contact.contact_address.length > 0 && (
          <TabsContent value="addresses" className="mt-4 rounded-[10px] border border-solid border-[#DBE0E5] bg-[#FFF] shadow-[0_4px_8px_0_rgba(55,56,56,0.10)] py-4 px-6">
            <ContactAddresses contact={contact} />
          </TabsContent>
        )}

        {contactData?.lead && contactData.lead.length > 0 && (
          <TabsContent value="leads" className="mt-4 rounded-[10px] border border-solid border-[#DBE0E5] bg-[#FFF] shadow-[0_4px_8px_0_rgba(55,56,56,0.10)] py-4 px-6">
            <ContactLeads leadData={contactData?.lead || []} contact={contact} />
          </TabsContent>
        )}

        {contactData?.quotation && contactData.quotation.length > 0 && (
          <TabsContent value="quotations" className="mt-4 rounded-[10px] border border-solid border-[#DBE0E5] bg-[#FFF] shadow-[0_4px_8px_0_rgba(55,56,56,0.10)] py-4 px-6">
            <ContactQuotation quotationData={contactData?.quotation || []} contact={contact} />
          </TabsContent>
        )}

        {contactData?.salesorder && contactData.salesorder.length > 0 && (
          <TabsContent value="sales-orders" className="mt-4 rounded-[10px] border border-solid border-[#DBE0E5] bg-[#FFF] shadow-[0_4px_8px_0_rgba(55,56,56,0.10)] py-4 px-6">
            <ContactSalesOrder salesOrderData={contactData?.salesorder || []} contact={contact} />
          </TabsContent>
        )}

        {contactData?.lead_lf && contactData.lead_lf.length > 0 && (
          <TabsContent value="lead-followup" className="mt-4 rounded-[10px] border border-solid border-[#DBE0E5] bg-[#FFF] shadow-[0_4px_8px_0_rgba(55,56,56,0.10)] py-4 px-6">
            <ContactLeadFollowUp leadFollowUpData={contactData?.lead_lf || []} contact={contact} />
          </TabsContent>
        )}

        {contactData?.followUpList && contactData.followUpList.length > 0 && (
          <TabsContent value="contact-followup" className="mt-4 rounded-[10px] border border-solid border-[#DBE0E5] bg-[#FFF] shadow-[0_4px_8px_0_rgba(55,56,56,0.10)] py-4 px-6">
            <ContactFollowUpList followUpData={contactData?.followUpList || []} contact={contact} />
          </TabsContent>
        )}

        {/* NEW: Measurements Content */}
        {contactData?.measurement_data && contactData.measurement_data.length > 0 && (
          <TabsContent
            value="measurements"
            className="mt-4 rounded-[10px] border border-solid border-[#DBE0E5] bg-[#FFF] shadow-[0_4px_8px_0_rgba(55,56,56,0.10)] py-4 px-6"
          >
            <ContactMeasurements measurementData={contactData.measurement_data} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ContactDetails;