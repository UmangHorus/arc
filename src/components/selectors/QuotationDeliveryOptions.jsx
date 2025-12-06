"use client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useRef } from "react";
import { useLoginStore } from "@/stores/auth.store";

const QuotationDeliveryOptions = ({
    deliveryOptions = [],
    billToAddress,
    setBillToAddress,
    shipToAddress,
    setShipToAddress,
    isSameAddress,
    setIsSameAddress,
    selectedContact,
    entityIdParam,
    entityDetails,
}) => {

    // Get contactLabel from store
    const contactLabel = useLoginStore(
        (state) => state.navConfig?.labels?.contacts || "Contact"
    );

    // Determine address property names for quotation
    const getAddressProperties = () => {
        return {
            billingAddressId: "billing_address_id",
            shippingAddressId: "shipping_address_id"
        };
    };

    const { billingAddressId, shippingAddressId } = getAddressProperties();

    // Use a ref to track if the initial check has been done
    const hasInitialized = useRef(false);

    // Auto-select the checkbox when there's exactly one delivery option, only on mount and when selectedContact is available
    useEffect(() => {
        if (
            !entityIdParam &&
            deliveryOptions.length == 1 &&
            isSameAddress == null &&
            !hasInitialized.current &&
            selectedContact?.id
        ) {
            setIsSameAddress(deliveryOptions[0].id);
            hasInitialized.current = true;
        }
    }, [deliveryOptions, entityIdParam, setIsSameAddress, selectedContact?.id]);

    // Reset hasInitialized when selectedContact becomes null
    useEffect(() => {
        if (!selectedContact?.id) {
            hasInitialized.current = false;
        }
    }, [selectedContact?.id]);

    const handleBillToChange = (addressId) => {
        if (entityIdParam) return;
        setBillToAddress(addressId);
        setIsSameAddress(null);
        if (shipToAddress == addressId) {
            setShipToAddress(null);
        }
    };

    const handleShipToChange = (addressId) => {
        if (entityIdParam) return;
        setShipToAddress(addressId);
        setIsSameAddress(null);
        if (billToAddress == addressId) {
            setBillToAddress(null);
        }
    };

    const handleSameAddressChange = (addressId, checked) => {
        if (entityIdParam) return;
        if (checked) {
            setIsSameAddress(addressId);
            setBillToAddress(null);
            setShipToAddress(null);
        } else {
            setIsSameAddress(null);
        }
    };

    // Render content based on conditions
    const renderContent = () => {
        // Case 1: No selected contact
        if (!selectedContact?.id && !entityIdParam) {
            return (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-600 text-center">
                        Please select a {contactLabel.toLowerCase()} to view delivery options.
                    </p>
                </div>
            );
        }

        // Case 2: Selected contact available but no delivery options
        if ((selectedContact?.id || entityIdParam) && deliveryOptions.length === 0) {
            return (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-600 text-center">
                        No delivery addresses available for this {contactLabel.toLowerCase()}.
                    </p>
                </div>
            );
        }

        // Case 3: Show delivery options
        return deliveryOptions.map((option) => {
            // For existing entities (entityIdParam present)
            const isCheckboxCheckedEntity =
                entityIdParam &&
                entityDetails?.[shippingAddressId] ==
                entityDetails?.[billingAddressId] &&
                entityDetails?.[billingAddressId] == option.id;

            const isBillToCheckedEntity =
                entityIdParam &&
                entityDetails?.[billingAddressId] == option.id &&
                entityDetails?.[shippingAddressId] !=
                entityDetails?.[billingAddressId];

            const isShipToCheckedEntity =
                entityIdParam &&
                entityDetails?.[shippingAddressId] == option.id &&
                entityDetails?.[shippingAddressId] !=
                entityDetails?.[billingAddressId];

            // For new entities
            const isCheckboxCheckedNew = isSameAddress == option.id;
            const isBillToCheckedNew =
                billToAddress == option.id && !isSameAddress;
            const isShipToCheckedNew =
                shipToAddress == option.id && !isSameAddress;

            // Combined values
            const isCheckboxChecked =
                isCheckboxCheckedEntity || isCheckboxCheckedNew;
            const isBillToChecked = isBillToCheckedEntity || isBillToCheckedNew;
            const isShipToChecked = isShipToCheckedEntity || isShipToCheckedNew;

            return (
                <Card
                    key={option.id}
                    className="p-4 mt-2 border border-gray-300 rounded-lg"
                >
                    <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                            id={`same-address-${option.id}`}
                            checked={isCheckboxChecked}
                            onCheckedChange={(checked) =>
                                handleSameAddressChange(option.id, checked)
                            }
                            className="text-white data-[state=checked]:border-[#287f71] data-[state=checked]:bg-[#287f71]"
                            disabled={!!entityIdParam}
                        />
                        <Label
                            htmlFor={`same-address-${option.id}`}
                            className="text-sm text-gray-600"
                        >
                            Please select this if both addresses are same.
                        </Label>
                    </div>

                    <RadioGroup className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem
                                value={option.id}
                                id={`bill-to-${option.id}`}
                                checked={isBillToChecked}
                                onClick={() => handleBillToChange(option.id)}
                                className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71] disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!!entityIdParam}
                            />
                            <Label
                                htmlFor={`bill-to-${option.id}`}
                                className="text-sm text-gray-600 cursor-pointer"
                            >
                                Bill to Address
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem
                                value={option.id}
                                id={`ship-to-${option.id}`}
                                checked={isShipToChecked}
                                onClick={() => handleShipToChange(option.id)}
                                className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71] disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!!entityIdParam}
                            />
                            <Label
                                htmlFor={`ship-to-${option.id}`}
                                className="text-sm text-gray-600 cursor-pointer"
                            >
                                Ship to Address
                            </Label>
                        </div>
                    </RadioGroup>
                    <div className="mt-2 text-sm text-gray-600">
                        {option.address}
                    </div>
                </Card>
            );
        });
    };

    return (
        <div className="space-y-4">
            <h3 className="block text-base font-medium text-[#4a5a6b]">
                Where do you want the delivery?
            </h3>

            {renderContent()}
        </div>
    );
};

export default QuotationDeliveryOptions;