"use client";

const ContactBasicDetails = ({ basicData }) => {
  // Directly use basicData without state to avoid unnecessary re-renders
  const contact = {
    name: basicData?.contact_name || "-",
    email: basicData?.contact_email_address || "-",
    mobile: basicData?.contact_mobile_no || "-",
    handled_by: basicData?.handled_by || "-",
    position: basicData?.contact_title || "-",
    industry: basicData?.industries_name || "-",
    city: basicData?.city_name || "-",
    country: basicData?.country || "-",
    address: `${basicData?.address1 || ""} ${basicData?.address_2 || ""} ${basicData?.area || ""} ${basicData?.zipcode || ""}`.trim() || "-",
    route_values: basicData?.route_values || "-",
    gstno: basicData?.gstno || "-",
    panno: basicData?.panno || "-",
  };

  return (
    <div className="w-full">
      <h2 className="text-[#373838] text-[22px] sm:text-[22px] font-[500] leading-[32px] ml-4">
        Customer Details
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Left Column */}
        <div className="bg-white rounded-[2px] border border-[#DBE0E5] shadow-sm overflow-hidden">
          <div className="grid grid-cols-1">

            {/* Key Account Manager */}
            <div className="flex flex-col sm:flex-row border-b border-[#DBE0E5]">
              <div className="w-full sm:w-1/3 bg-[#265285]/[0.04] px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-[#DBE0E5]">
                <span className="text-[#3A3A3A] text-[14px] font-medium leading-normal">Key Account Manager</span>
              </div>
              <div className="w-full sm:w-2/3 px-3 sm:px-4 py-2 sm:py-3">
                <span className="text-[#3A3A3A] text-[14px] font-normal leading-normal">
                  {contact.handled_by}
                </span>
              </div>
            </div>

            {/* Industry */}
            <div className="flex flex-col sm:flex-row border-b border-[#DBE0E5]">
              <div className="w-full sm:w-1/3 bg-[#265285]/[0.04] px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-[#DBE0E5]">
                <span className="text-[#3A3A3A] text-[14px] font-medium leading-normal">Industry</span>
              </div>
              <div className="w-full sm:w-2/3 px-3 sm:px-4 py-2 sm:py-3">
                <span className="text-[#3A3A3A] text-[14px] font-normal leading-normal">
                  {contact.industry}
                </span>
              </div>
            </div>

            {/* GST Number */}
            <div className="flex flex-col sm:flex-row border-b border-[#DBE0E5]">
              <div className="w-full sm:w-1/3 bg-[#265285]/[0.04] px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-[#DBE0E5]">
                <span className="text-[#3A3A3A] text-[14px] font-medium leading-normal">GST Number</span>
              </div>
              <div className="w-full sm:w-2/3 px-3 sm:px-4 py-2 sm:py-3">
                <span className="text-[#3A3A3A] text-[14px] font-normal leading-normal">
                  {contact?.gstno}
                </span>
              </div>
            </div>

            {/* PAN Number */}
            <div className="flex flex-col sm:flex-row border-b border-[#DBE0E5]">
              <div className="w-full sm:w-1/3 bg-[#265285]/[0.04] px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-[#DBE0E5]">
                <span className="text-[#3A3A3A] text-[14px] font-medium leading-normal">PAN Number</span>
              </div>
              <div className="w-full sm:w-2/3 px-3 sm:px-4 py-2 sm:py-3">
                <span className="text-[#3A3A3A] text-[14px] font-normal leading-normal">
                  {contact?.panno}
                </span>
              </div>
            </div>

            {/* Route  */}
            <div className="flex flex-col sm:flex-row border-b border-[#DBE0E5]">
              <div className="w-full sm:w-1/3 bg-[#265285]/[0.04] px-3 sm:px-4 py-2 sm:py-3 border-b sm:border-b-0 sm:border-r border-[#DBE0E5]">
                <span className="text-[#3A3A3A] text-[14px] font-medium leading-normal">Route</span>
              </div>
              <div className="w-full sm:w-2/3 px-3 sm:px-4 py-2 sm:py-3">
                <span className="text-[#3A3A3A] text-[14px] font-normal leading-normal">
                  {contact.route_values && Array.isArray(contact.route_values)
                    ? contact.route_values
                      .map(item => item?.RouteMaster?.route_name)
                      .filter(Boolean)
                      .join(", ")
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default ContactBasicDetails;