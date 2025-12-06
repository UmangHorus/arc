"use client";
import { useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLoginStore } from "@/stores/auth.store";

const DeliveryOptions = ({
  companyInfo,
  deliveryOptions = [],
  deliveryType,
  setDeliveryType,
  billToAddress,
  setBillToAddress,
  shipToAddress,
  setShipToAddress,
  isSameAddress,
  setIsSameAddress,
  selectedContact,
  entityIdParam,
  entityDetails,
  entityType = "order", // Default to order, but can be 'quotation', 'lead', 'invoice', etc.
}) => {
  const { user } = useLoginStore();

  // Get contactLabel from store
  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );

  // Transform companyInfo into pickupOptions format
  const pickupOptions = companyInfo
    ? [
      {
        id: companyInfo.company_id || "1",
        name: companyInfo.company_name || "",
        address: [
          companyInfo.address_1,
          companyInfo.address_2,
          companyInfo.area,
          companyInfo.city_name,
          companyInfo.state,
          companyInfo.country,
        ]
          .filter(Boolean)
          .join(", "),
      },
    ]
    : [];

  // Determine delivery type property name based on entity type
  const getDeliveryTypeProperty = () => {
    switch (entityType) {
      case "order":
        return "delivery_type";
      case "quotation":
        return "delivery_type";
      case "order_by_quotation":
        return "delivery_type";
      default:
        return "delivery_type";
    }
  };

  // Determine address property names based on entity type
  const getAddressProperties = () => {
    switch (entityType) {
      case "order":
        return {
          billingAddressId: "billing_address_id",
          shippingAddressId: "shipping_address_id",
        };
      case "quotation":
        return {
          billingAddressId: "billing_address_id",
          shippingAddressId: "shipping_address_id",
        };
      case "order_by_quotation":
        return {
          billingAddressId: "billing_address_id",
          shippingAddressId: "shipping_address_id",
        };
      default:
        return {
          billingAddressId: "billing_address_id",
          shippingAddressId: "shipping_address_id",
        };
    }
  };

  const deliveryTypeProp = getDeliveryTypeProperty();
  const { billingAddressId, shippingAddressId } = getAddressProperties();

  // Define disable logic
  const shouldDisable = !!entityIdParam && entityType != "order_by_quotation";

  // Initialize deliveryType, billToAddress, shipToAddress, and isSameAddress for order_by_quotation
  useEffect(() => {
    if (entityIdParam && entityType == "order_by_quotation" && entityDetails) {
      // Map numeric delivery_type to string for Tabs
      let deliveryTypeFromEntity = entityDetails[deliveryTypeProp];
      if (deliveryTypeFromEntity == 1) {
        deliveryTypeFromEntity = "pickup";
      } else if (deliveryTypeFromEntity == 2) {
        deliveryTypeFromEntity = "delivery";
      } else {
        deliveryTypeFromEntity = "delivery"; // Fallback
      }

      const billToAddressFromEntity = entityDetails[billingAddressId] || null;
      const shipToAddressFromEntity = entityDetails[shippingAddressId] || null;
      const isSameAddressFromEntity =
        billToAddressFromEntity && billToAddressFromEntity == shipToAddressFromEntity
          ? billToAddressFromEntity
          : null;

      // Validate entityDetails
      if (!entityDetails[deliveryTypeProp]) {
        console.warn(`Missing ${deliveryTypeProp} in entityDetails for ${entityType}`);
      }

      setDeliveryType(deliveryTypeFromEntity);
      setBillToAddress(billToAddressFromEntity);
      setShipToAddress(shipToAddressFromEntity);
      setIsSameAddress(isSameAddressFromEntity);
    }
  }, [entityIdParam, entityType, entityDetails, setDeliveryType, setBillToAddress, setShipToAddress, setIsSameAddress]);

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
      hasInitialized.current = true; // Mark as initialized
    }
  }, [deliveryOptions, entityIdParam, setIsSameAddress, selectedContact?.id]);

  // Reset hasInitialized when selectedContact becomes null
  useEffect(() => {
    if (!selectedContact?.id) {
      hasInitialized.current = false; // Allow reinitialization when selectedContact is null
    }
  }, [selectedContact?.id]);

  // Handle tab change
  const handleTabChange = (value) => {
    if (shouldDisable) return;
    if (value == "delivery" && user?.isEmployee && !selectedContact?.id) {
      toast.error(`Please select a ${contactLabel.toLowerCase()} to proceed`);
      return;
    }
    setDeliveryType(value);
    // Reset addresses when switching tabs
    // setIsSameAddress(null);
    // setBillToAddress(null);
    // setShipToAddress(null);
  };

  const handleBillToChange = (addressId) => {
    if (shouldDisable) return;
    setBillToAddress(addressId);
    setIsSameAddress(null); // Uncheck "same address" checkbox
    if (shipToAddress == addressId) {
      setShipToAddress(null); // Prevent same address for both billTo and shipTo
    }
  };

  const handleShipToChange = (addressId) => {
    if (shouldDisable) return;
    setShipToAddress(addressId);
    setIsSameAddress(null); // Uncheck "same address" checkbox
    if (billToAddress == addressId) {
      setBillToAddress(null); // Prevent same address for both billTo and shipTo
    }
  };

  const handleSameAddressChange = (addressId, checked) => {
    if (shouldDisable) return;
    if (checked) {
      setIsSameAddress(addressId);
      setBillToAddress(null);
      setShipToAddress(null);
    } else {
      setIsSameAddress(null);
      // Optionally, set default billTo/shipTo here if needed
    }
  };

  // Map numeric delivery_type to string for Tabs
  const getMappedDeliveryType = (typeValue) => {
    if (typeValue == 1) return "pickup";
    if (typeValue == 2) return "delivery";
    return "delivery"; // Fallback
  };

  // Determine default tab based on entityDetails and deliveryType
  const defaultTab =
    entityIdParam && entityType == "order_by_quotation"
      ? deliveryType
      : entityIdParam
        ? getMappedDeliveryType(entityDetails?.[deliveryTypeProp])
        : deliveryType || "delivery";

  // Render delivery content based on conditions
  const renderDeliveryContent = () => {
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
    if ((selectedContact?.id || entityIdParam) && deliveryOptions.length == 0) {
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
        entityDetails?.[shippingAddressId] == entityDetails?.[billingAddressId] &&
        entityDetails?.[billingAddressId] == option.id;

      const isBillToCheckedEntity =
        entityIdParam &&
        entityDetails?.[billingAddressId] == option.id &&
        entityDetails?.[shippingAddressId] != entityDetails?.[billingAddressId];

      const isShipToCheckedEntity =
        entityIdParam &&
        entityDetails?.[shippingAddressId] == option.id &&
        entityDetails?.[shippingAddressId] != entityDetails?.[billingAddressId];

      // For new entities or order_by_quotation
      const isCheckboxCheckedNew = isSameAddress == option.id;
      const isBillToCheckedNew = billToAddress == option.id && !isSameAddress;
      const isShipToCheckedNew = shipToAddress == option.id && !isSameAddress;

      // Combined values, prioritizing state for order_by_quotation
      const isCheckboxChecked =
        entityIdParam && entityType == "order_by_quotation"
          ? isCheckboxCheckedNew
          : isCheckboxCheckedEntity || isCheckboxCheckedNew;
      const isBillToChecked =
        entityIdParam && entityType == "order_by_quotation"
          ? isBillToCheckedNew
          : isBillToCheckedEntity || isBillToCheckedNew;
      const isShipToChecked =
        entityIdParam && entityType == "order_by_quotation"
          ? isShipToCheckedNew
          : isShipToCheckedEntity || isShipToCheckedNew;

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
              disabled={shouldDisable}
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
                disabled={shouldDisable}
              />
              <Label
                htmlFor={`bill-to-${option.id}`}
                className={`text-sm cursor-pointer ${shouldDisable
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-600"
                  }`}
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
                disabled={shouldDisable}
              />
              <Label
                htmlFor={`ship-to-${option.id}`}
                className={`text-sm cursor-pointer ${shouldDisable
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-600"
                  }`}
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

      <Tabs
        value={defaultTab}
        onValueChange={handleTabChange}
        className="w-full"
        disabled={shouldDisable}
      >
        <TabsList className="grid w-full grid-cols-2 h-auto lead-tabs">
          <TabsTrigger
            value="delivery"
            className="data-[state=active]:bg-[#287f71] data-[state=active]:text-white hover:text-[#20665a] transition-colors py-2"
            disabled={shouldDisable}
          >
            To Be Delivered
          </TabsTrigger>
          <TabsTrigger
            value="pickup"
            className="data-[state=active]:bg-[#287f71] data-[state=active]:text-white hover:text-[#20665a] transition-colors py-2"
            disabled={shouldDisable}
          >
            Pickup From Store
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pickup">
          <RadioGroup
            value={pickupOptions.length > 0 ? pickupOptions[0].id : ""}
            disabled={shouldDisable}
          >
            {pickupOptions.map((option) => (
              <Card key={option.id} className="p-4 mt-2">
                <div className="flex items-baseline space-x-2">
                  <RadioGroupItem
                    value={option.id}
                    id={option.id}
                    className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71]"
                    disabled={shouldDisable}
                  />
                  <Label htmlFor={option.id} className="cursor-pointer">
                    <h4 className="font-medium text-lg text-[#287f71]">
                      {option.name}
                    </h4>
                    <div className="text-sm text-gray-600">
                      {option.address}
                    </div>
                  </Label>
                </div>
              </Card>
            ))}
          </RadioGroup>
        </TabsContent>

        <TabsContent value="delivery">
          {renderDeliveryContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryOptions;