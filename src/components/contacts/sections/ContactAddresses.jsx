"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";

const ContactAddresses = ({ contact }) => {
    const addresses = useMemo(() => {
        return contact?.contact_address || [];
    }, [contact]);

    const formattedAddresses = useMemo(() => {
        return addresses.map((addr) => {
            const nickname = addr.nickname
                ? addr.nickname.charAt(0).toUpperCase() + addr.nickname.slice(1).toLowerCase()
                : "Home";
            const fullAddress = [
                addr.address1,
                addr.address_2,
                addr.area,
                addr.city_name,
                addr.district,
                addr.state,
                addr.country,
                addr.zipcode,
            ]
                .filter(Boolean)
                .join(", ")
                .trim();

            return { nickname, fullAddress };
        });
    }, [addresses]);

    return (
        <div className="w-full px-4 xs:px-6 sm:px-0">
            <h2 className="text-[#373838] text-[22px] sm:text-[22px] font-[500] leading-[32px] ml-4">
                Addresses
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-4">
                {formattedAddresses.length > 0 ? (
                    formattedAddresses.map((addr, index) => (
                        <div
                            key={index}
                            className="bg-white border border-[#DBE0E5] shadow-sm hover:shadow-md transition-all duration-200 rounded-[2px]"
                        >
                            {/* Header */}
                            <div className="bg-[#287F71]/[0.08] px-3 sm:px-4 py-2 sm:py-3 rounded-t-[2px]">
                                <h3 className="text-[#287F71] text-[15px] font-semibold leading-normal">
                                    {addr.nickname}
                                </h3>
                            </div>

                            {/* Address content */}
                            <div className="p-3 sm:p-4">
                                <p className="text-[#3A3A3A] text-[14px] font-normal leading-[140%] tracking-[-0.154px] flex items-start">
                                    <MapPin className="mr-2 h-3 w-3 sm:h-4 sm:w-4 text-[#287F71] flex-shrink-0 mt-0.5" />
                                    <span className="flex-1">
                                        {addr.fullAddress || "No address details available"}
                                    </span>
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full text-center py-6 sm:py-8">
                        <p className="text-[#373838] text-base sm:text-lg">No addresses available.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactAddresses;