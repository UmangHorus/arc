"use client";

import { useLoginStore } from "@/stores/auth.store";
import React from "react";

const ContactBasicDetailsCard = ({ contact }) => {
    const { appConfig } = useLoginStore();
    const contactLabel = useLoginStore(
        (state) => state.navConfig?.labels?.contacts || "Contact"
    );
    const RawContactLabel = appConfig?.rawcontact_config_name || "RawContact";

    const handleMobileClick = (mobileNumber) => {
        if (mobileNumber && mobileNumber !== "-") {
            // Remove any non-digit characters except + for international numbers
            const cleanNumber = mobileNumber.replace(/[^\d+]/g, '');
            window.open(`tel:${cleanNumber}`, '_self');
        }
    };

    const handleEmailClick = (email) => {
        if (email && email !== "-") {
            window.open(`mailto:${email}`, '_self');
        }
    };

    return (
        <div className="rounded-[3px] border border-solid border-[rgba(40,127,113,0.80)] bg-[rgba(255,255,255,0.80)] shadow-[0_5px_5px_0_rgba(212,222,229,0.16)] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Profile Image */}
                <div className="flex justify-center sm:justify-start">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-300 flex-shrink-0">
                        <img
                            src={contact?.photo_path || "https://via.placeholder.com/64"}
                            alt={contact?.name || "Contact"}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h2 className="text-[#287F71] text-lg sm:text-xl font-[500] truncate text-center sm:text-left mb-2 sm:mb-3">
                        {contact?.contactType == "C" ? contactLabel : contact?.contactType == "RC" ? RawContactLabel : contact?.contactType || "-"} -
                        {contact?.code && ` (${contact.code})`}
                        {contact?.contact_title && ` ${contact.contact_title}`}
                        {contact?.name && ` ${contact.name}`}
                    </h2>

                    {/* CSS Grid for perfect alignment */}
                    <div className="grid grid-cols-[auto_1fr] gap-y-2 sm:gap-y-1 gap-x-2 sm:gap-x-3 items-start">
                        {/* Mobile Number */}
                        <div className="flex justify-between items-center">
                            <span className="text-[#3A3A3A] text-sm sm:text-[14px] font-[500] whitespace-nowrap">
                                Mobile Number
                            </span>
                            <span className="text-[#3A3A3A] text-sm sm:text-[14px] font-[500]">:</span>
                        </div>
                        <button
                            onClick={() => handleMobileClick(contact?.mobile)}
                            className={`text-[#287F71] text-sm sm:text-[14px] font-[400] underline break-words text-left ${contact?.mobile && contact.mobile !== "-"
                                ? "hover:text-[#1e6b5d] cursor-pointer"
                                : "cursor-default no-underline"
                                }`}
                            disabled={!contact?.mobile || contact.mobile === "-"}
                        >
                            {contact?.mobile || "-"}
                        </button>

                        {/* Email */}
                        <div className="flex justify-between items-center">
                            <span className="text-[#3A3A3A] text-sm sm:text-[14px] font-[500] whitespace-nowrap">
                                E-Mail
                            </span>
                            <span className="text-[#3A3A3A] text-sm sm:text-[14px] font-[500]">:</span>
                        </div>
                        <button
                            onClick={() => handleEmailClick(contact?.email)}
                            className={`text-[#287F71] text-sm sm:text-[14px] font-[400] underline break-words text-left ${contact?.email && contact.email !== "-"
                                ? "hover:text-[#1e6b5d] cursor-pointer"
                                : "cursor-default no-underline"
                                }`}
                            disabled={!contact?.email || contact.email === "-"}
                        >
                            {contact?.email || "-"}
                        </button>

                        {/* Address */}
                        <div className="flex justify-between items-center">
                            <span className="text-[#3A3A3A] text-sm sm:text-[14px] font-[500] whitespace-nowrap">
                                Address
                            </span>
                            <span className="text-[#3A3A3A] text-sm sm:text-[14px] font-[500]">:</span>
                        </div>
                        <span className="text-[#287F71] text-sm sm:text-[14px] font-[400] break-words">
                            {contact?.address || "-"}
                        </span>

                        {/* Division */}
                        <div className="flex justify-between items-center">
                            <span className="text-[#3A3A3A] text-sm sm:text-[14px] font-[500] whitespace-nowrap">
                                {contact?.division_label || "Division"}
                            </span>
                            <span className="text-[#3A3A3A] text-sm sm:text-[14px] font-[500]">:</span>
                        </div>
                        <span className="text-[#287F71] text-sm sm:text-[14px] font-[400] break-words">
                            {contact?.division || "-"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactBasicDetailsCard;