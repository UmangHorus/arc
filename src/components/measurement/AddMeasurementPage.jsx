"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Ruler } from "lucide-react";
import { format, parse } from "date-fns";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLoginStore } from "@/stores/auth.store";
import { leadService } from "@/lib/leadService";
import { ContactService } from "@/lib/ContactService";
import MeasurementProductSelectionTable from "./MeasurementProductSelectionTable";
import { HashLoader } from "react-spinners";
import { calculateSubTotalFromAttributes } from "@/utils/measurementCalculations";

const AddMeasurementPage = () => {
  const { user = {}, token, appConfig } = useLoginStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const measurementId = searchParams.get("measurement_id");
  const contactId = searchParams.get("contact_id");
  const contactType = searchParams.get("contact_type");
  const leadId = searchParams.get("lead_id");
  const evId = searchParams.get("ev_id");

  const entityType = leadId
    ? "lead"
    : contactId && contactType
      ? "contact"
      : null;

  // NEW: For Edit mode — reference_id & reference_type passed directly
  const referenceId = searchParams.get("reference_id");
  const referenceType = searchParams.get("reference_type");

  const isEditMode = !!measurementId;

  // ---------- DATE HELPERS ----------
  const formatDateForAPI = (dateString) => {
    const date = new Date(dateString);
    return format(date, "dd-MM-yyyy");
  };

  const formatDateForInput = (dateString) => {
    const date = new Date(dateString);
    return format(date, "yyyy-MM-dd");
  };

  // ---------- STATE ----------
  const [measurementDate, setMeasurementDate] = useState(
    formatDateForInput(new Date())
  );
  const [formValues, setFormValues] = useState([
    {
      unique_id:
        Date.now().toString() + Math.random().toString(36).substr(2, 9),
      productid: "",
      productname: "",
      short_description: "", // Add this line
      productcode: "",
      product_image: "",
      Attribute_data: {},
      attribute: {},
    },
  ]);
  const [productList, setProductList] = useState([]);
  const [leadDetails, setLeadDetails] = useState(null);

  // ---------- QUERIES ----------
  const {
    data: productData,
    error: productError,
    isLoading: productLoading,
  } = useQuery({
    queryKey: ["productList", token, user?.id],
    queryFn: () => leadService.getProductBasedOnCompany(token, "", "", user?.id),
    enabled: !!token && !!user?.id,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: leadData,
    error: leadError,
    isLoading: leadLoading,
  } = useQuery({
    queryKey: ["leadDetails", leadId],
    queryFn: () => leadService.checkLead(leadId),
    enabled: !!leadId,
    refetchOnMount: "always",
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    keepPreviousData: false,
  });

  const {
    data: measurementData,
    error: measurementError,
    isLoading: measurementLoading,
  } = useQuery({
    queryKey: ["measurementDetail", measurementId],
    queryFn: () =>
      leadService.getMeasurementDetail(
        token,
        user?.id,
        appConfig?.company_id,
        appConfig?.branch_id,
        measurementId
      ),
    enabled:
      isEditMode &&
      !!token &&
      !!user?.id &&
      !!appConfig?.company_id &&
      !!appConfig?.branch_id,
    refetchOnMount: "always",
  });

  // ---------- PRODUCT LIST ----------
  useEffect(() => {
    if (productData) {
      const responseData = Array.isArray(productData)
        ? productData[0]
        : productData;
      if (
        responseData?.STATUS === "SUCCESS" &&
        Array.isArray(responseData?.DATA?.products)
      ) {
        setProductList(responseData.DATA.products);
      } else {
        toast.error(responseData?.MSG || "Invalid product response data");
        setProductList([]);
      }
    }
    if (productError) {
      console.error("Error fetching products:", productError.message);
      toast.error("Error fetching products: " + productError.message);
    }
  }, [productData, productError]);

  // ---------- LEAD DETAILS ----------
  useEffect(() => {
    if (leadData && leadData[0]?.STATUS === "SUCCESS") {
      setLeadDetails(leadData[0].DATA);
    } else if (leadData && leadData[0]?.STATUS === "ERROR") {
      toast.error(leadData[0]?.MSG || "Failed to fetch lead details");
    }
    if (leadError) {
      console.error("Error fetching lead details:", leadError.message);
      toast.error("An error occurred while fetching lead details");
    }
  }, [leadData, leadError]);

  // ---------- MEASUREMENT DETAIL (EDIT) ----------
  useEffect(() => {
    if (measurementData && measurementData?.STATUS === "SUCCESS") {
      const data = measurementData.DATA[0];

      if (data.measurement_dt) {
        try {
          const parsed = parse(data.measurement_dt, "dd-MM-yyyy", new Date());
          if (!isNaN(parsed.getTime())) {
            setMeasurementDate(format(parsed, "yyyy-MM-dd"));
          }
        } catch (e) {
          console.warn("Invalid measurement_dt:", data.measurement_dt);
          setMeasurementDate(formatDateForInput(new Date()));
        }
      }

      if (Array.isArray(data.measurement_product) && data.measurement_product.length > 0) {
        const newFormValues = data.measurement_product.map((prod, idx) => {
          const productKey = `${prod.product_id}_${idx}`;
          const attrObj = {};
          const attrValues = [];

          if (prod.Attributes && typeof prod.Attributes === "object") {
            const attrKeys = Object.keys(prod.Attributes);
            attrKeys.forEach((attrId) => {
              const values = prod.Attributes[attrId];
              values.forEach((val, i) => {
                if (!attrValues[i]) attrValues[i] = {};
                attrValues[i][attrId] = val;
              });
            });
          }

          attrObj[productKey] = attrValues;

          // Calculate subTotal from attributes
          const calculatedSubTotal = calculateSubTotalFromAttributes(
            { attribute: attrObj, Attribute_data: prod.Attribute_data },
            prod.Attribute_data
          );

          return {
            unique_id: Date.now().toString() + idx,
            productid: prod.product_id || "",
            productname: prod.name || "",
            short_description: prod.short_description || "", // Add this line
            productcode: prod.code || "",
            product_image: prod.photo_path
              ? prod.photo_path.split('/').slice(-2, -1)[0] || ""
              : "",
            Attribute_data: prod.Attribute_data || {},
            attribute: attrObj,
            subTotal: calculatedSubTotal,
          };
        });

        setFormValues(newFormValues);
      }
    } else if (measurementData && measurementData?.STATUS === "ERROR") {
      toast.error(measurementData?.MSG || "Failed to load measurement");
    }
    if (measurementError) {
      console.error("Error fetching measurement:", measurementError);
      toast.error("Failed to load measurement data");
    }
  }, [measurementData, measurementError]);

  // ---------- SAVE / UPDATE MUTATION ----------
  const saveMeasurementMutation = useMutation({
    mutationFn: ({
      token,
      product_id,
      attributes,
      created_by,
      reference_id,
      reference_type,
      company_id,
      branch_id,
      measurement_dt,
      measurement_id,
    }) => {
      if (!token || !product_id || !attributes || !created_by) {
        throw new Error("Missing required parameters");
      }

      if (!reference_id || !reference_type) {
        throw new Error("Reference ID and Type are required");
      }

      if (isEditMode) {
        return leadService.updateMeasurement({
          token,
          product_id: JSON.stringify(product_id),
          attributes: JSON.stringify(attributes),
          created_by,
          reference_id,
          reference_type,
          company_id,
          branch_id,
          measurement_dt,
          measurement_id,
        });
      } else {
        return leadService.saveMeasurement({
          token,
          product_id: JSON.stringify(product_id),
          attributes: JSON.stringify(attributes),
          created_by,
          reference_id,
          reference_type,
          company_id,
          branch_id,
          measurement_dt,
        });
      }
    },
    onSuccess: async (data) => {
      const responseData = Array.isArray(data) ? data[0] : data;

      if (responseData?.STATUS === "SUCCESS") {
        setFormValues([
          {
            unique_id:
              Date.now().toString() + Math.random().toString(36).substr(2, 9),
            productid: "",
            productname: "",
            short_description: "", // Add this line
            productcode: "",
            product_image: "",
            Attribute_data: {},
            attribute: {},
          },
        ]);

        const action = isEditMode ? "updated" : "added";

        if (evId && (contactId || leadId)) {
          try {
            const refId = contactId || leadId;
            const refType = contactType === "C" ? "1" : contactType === "RC" ? "6" : "7";
            const visitorResponse = await ContactService.employeeVisitorInOut(
              token,
              "out",
              user.id,
              refId,
              refType,
              evId
            );
            const visitorResult = visitorResponse[0] || {};
            if (visitorResult.STATUS === "SUCCESS") {
              toast.success(
                `Measurement ${action} and Visit Out recorded successfully.`,
                { duration: 2000 }
              );
            } else {
              toast.error(visitorResult.MSG || "Visit Out recording failed.");
            }

            if (leadId) {
              setLeadDetails(null);
              queryClient.removeQueries({ queryKey: ["leadDetails", leadId] });
              router.push("/leads");
            } else {
              router.push("/contacts");
            }
          } catch (error) {
            console.error("Visit Out error:", error);
            toast.error(`Measurement ${action} but failed to record Visit Out.`);
            router.push("/measurements");
          }
        } else {
          toast.success(`Measurement ${action} successfully`, {
            duration: 2000,
          });
          router.push("/measurements");
        }
      } else {
        throw new Error(responseData?.MSG || "Failed to save measurement");
      }
    },
    onError: (error) => {
      console.error("Save measurement error:", error);
      toast.error(error.message || "Failed to save measurement");
    },
  });

  // ---------- HANDLE SAVE ----------
  const handleAddMeasurement = () => {
    const hasContactInfo = contactId && contactType;
    const hasLeadInfo = leadId;

    // Add mode: require contact/lead
    if (!isEditMode && (!token || !user?.id || (!hasContactInfo && !hasLeadInfo))) {
      toast.error("Missing contact or lead information");
      return;
    }

    // Edit mode: require reference_id & reference_type
    if (isEditMode && (!referenceId || !referenceType)) {
      toast.error("Missing reference information for edit");
      return;
    }

    if (!formValues.some((item) => item.productid)) {
      toast.error("Please select at least one product");
      return;
    }

    const productId = [
      ...new Set(
        formValues.filter((item) => item.productid).map((item) => item.productid)
      ),
    ];

    const attributes = formValues.map((item) => {
      const productKey = Object.keys(item.attribute)[0];
      const attrData = item.attribute[productKey] || [];

      const attrMap = {};
      attrData.forEach((attrSet) => {
        Object.entries(attrSet).forEach(([key, value]) => {
          if (!attrMap[key]) attrMap[key] = [];
          attrMap[key].push(value.toString());
        });
      });
      return attrMap;
    });

    // === DETERMINE reference_id & reference_type ===
    let reference_id = "";
    let reference_type = "";

    if (isEditMode) {
      // EDIT: Use reference_id & reference_type from URL
      reference_id = referenceId;
      reference_type = referenceType;
    } else {
      // ADD: Map from contact/lead
      if (contactId && contactType && evId) {
        reference_id = contactId;
        reference_type = contactType === "C" ? "1" : "6";
      } else if (leadId && evId) {
        reference_id = leadId;
        reference_type = "7";
      }
    }

    const finalCompanyId = appConfig?.company_id || 1;
    const finalBranchId = appConfig?.branch_id || 1;
    const formattedMeasurementDate = formatDateForAPI(measurementDate);

    saveMeasurementMutation.mutate({
      token,
      product_id: productId,
      attributes,
      created_by: user.id,
      reference_id,
      reference_type,
      company_id: finalCompanyId,
      branch_id: finalBranchId,
      measurement_dt: formattedMeasurementDate,
      measurement_id: measurementId,
    });
  };

  // ---------- LOADER ----------
  if ((leadId && !leadDetails) || (isEditMode && measurementLoading)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
      </div>
    );
  }

  // ---------- RENDER ----------
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-[#4a5a6b] flex items-center gap-2">
        <Ruler />
        {isEditMode && measurementData?.DATA?.[0]?.fullmeasurementno
          ? <span>Edit Measurement Sheet <span className="text-[#287f71] font-bold">({measurementData.DATA[0].fullmeasurementno})</span></span>
          : "Add Measurement"
        }
      </h1>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[#4a5a6b]">
            Measurement Date
          </label>
          <Input
            type="date"
            value={measurementDate}
            onChange={(e) => setMeasurementDate(e.target.value)}
            className="w-full max-w-xs bg-white"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-[12px] pb-[0.5rem]">
          <div className="space-y-2">
            <h3 className="block text-base font-medium text-[#4a5a6b]">
              Select Products
            </h3>
            <MeasurementProductSelectionTable
              formValues={formValues}
              setFormValues={setFormValues}
              productList={productList}
              entityIdParam={leadId}
              entityDetails={leadDetails}
              entityType={entityType}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="button"
        className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm sm:text-base px-4 py-2"
        onClick={handleAddMeasurement}
        disabled={
          productLoading ||
          leadLoading ||
          measurementLoading ||
          !formValues.some((item) => item.productid) ||
          saveMeasurementMutation.isPending
        }
      >
        {saveMeasurementMutation.isPending
          ? isEditMode
            ? "Updating Measurement..."
            : "Saving Measurement..."
          : isEditMode
            ? "Update Measurement"
            : "Save Measurement"}
      </Button>
    </div>
  );
};

export default AddMeasurementPage;