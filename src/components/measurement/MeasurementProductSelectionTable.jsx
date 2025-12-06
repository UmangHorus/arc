"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Tag, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductSearch } from "../inputs/search";
import { toast } from "sonner";
import { leadService } from "@/lib/leadService";
import { useLoginStore } from "@/stores/auth.store";
import ProductAttributesEditor from "../shared/ProductAttributesEditor";
import { calculateSubTotalFromAttributes } from "@/utils/measurementCalculations";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

const MeasurementProductSelectionTable = ({
  formValues,
  setFormValues,
  productList,
  entityIdParam,
  entityDetails,
  entityType,
}) => {
  const baseurl = process.env.NEXT_PUBLIC_API_BASE_URL_FALLBACK;
  const { user = {}, token } = useLoginStore();

  const [expandedRows, setExpandedRows] = useState(new Set());
  const [tooltipOpenIndex, setTooltipOpenIndex] = useState(null);

  // Toggle expansion for a row
  const toggleExpand = (index) => {
    const element = formValues[index];
    if (!element.productid || Object.keys(element.Attribute_data || {}).length === 0) {
      return;
    }

    const newSet = new Set(expandedRows);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedRows(newSet);
  };

  // Generate unique ID
  const generateUniqueId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Initial form values
  const getInitialFormValues = (product = null) => {
    const baseFormValues = {
      unique_id: product?.unique_id || generateUniqueId(),
      productid: product?.productid || "",
      productname: product?.productname || "",
      short_description: product?.short_description || "",
      productcode: product?.productcode || "",
      product_image: product?.product_image || "",
      Attribute_data: product?.Attribute_data || {},
      attribute: product?.attribute || {},
    };

    return product ? baseFormValues : [{ ...baseFormValues, unique_id: generateUniqueId() }];
  };

  // Initialize form values on mount
  useEffect(() => {
    if (entityIdParam && entityType === "lead" && entityDetails?.product_array?.length > 0) {
      const initialFormValues = entityDetails.product_array.map((product, idx) => {
        let base = getInitialFormValues({
          ...product,
          unique_id: product.unique_id || generateUniqueId(),
        });

        const productAttrKey = `${product.productid}_${idx}`;
        const initialAttributes = {};

        if (product.Attribute_data) {
          Object.entries(product.Attribute_data).forEach(([attrId, attrData]) => {
            let valueID = attrData.ValueID;

            const attr1 = product.Attribute_data_1?.find(
              (a) => a.id == attrId || a.id == attrId.toString()
            );

            if (
              attr1 &&
              typeof attr1.value === "string" &&
              attr1.value.trim() !== "" &&
              attr1.value !== "undefined" &&
              attr1.value !== null
            ) {
              valueID = attr1.value;
            }

            if ((attrData.Type == "3" || attrData.Type == "2") && attrData.Masters) {
              const masters = Array.isArray(attrData.Masters)
                ? attrData.Masters
                : Object.values(attrData.Masters);

              if (valueID) {
                const matchedMaster = masters.find((master) => master.N == valueID);
                if (matchedMaster) {
                  initialAttributes[attrId] = matchedMaster.ID;
                }
              }
            } else if (valueID) {
              let value = valueID;
              if (attrData.Type == "6") {
                value = value?.split(" ")[0] ?? "";
              }
              initialAttributes[attrId] = value;
            }
          });
        }

        base.attribute = { [productAttrKey]: [initialAttributes] };

        const calculatedSubTotal = calculateSubTotalFromAttributes(
          { attribute: base.attribute, Attribute_data: product.Attribute_data },
          product.Attribute_data
        );

        base.subTotal = calculatedSubTotal;

        return base;
      });
      setFormValues(initialFormValues);
    } else if (!formValues.length) {
      setFormValues(getInitialFormValues());
    }
  }, [entityIdParam, entityDetails, entityType, setFormValues]);

  // Add new row
  const addFormFields = () => {
    setFormValues([
      ...formValues,
      {
        unique_id: generateUniqueId(),
        productid: "",
        productname: "",
        short_description: "", // Add this line
        productcode: "",
        product_image: "",
        Attribute_data: {},
        attribute: {},
      },
    ]);
  };

  // Remove row
  const removeFormFields = (index) => {
    if (formValues.length === 1 && !formValues[0].productid) {
      return;
    }

    const newFormValues = [...formValues];
    newFormValues.splice(index, 1);

    const newExpandedRows = new Set(expandedRows);
    newExpandedRows.delete(index);
    setExpandedRows(newExpandedRows);

    const updatedFormValues = newFormValues.map((item, newIndex) => {
      if (item.productid && item.attribute) {
        const oldKey = Object.keys(item.attribute)[0];
        if (oldKey) {
          const [productId, oldIndex] = oldKey.split("_");
          const newKey = `${productId}_${newIndex}`;
          const newAttribute = {};
          newAttribute[newKey] = item.attribute[oldKey];
          return { ...item, attribute: newAttribute };
        }
      }
      return item;
    });

    if (updatedFormValues.length === 0) {
      const baseDefault = {
        unique_id: generateUniqueId(),
        productid: "",
        productname: "",
        short_description: "", // Add this line
        productcode: "",
        product_image: "",
        Attribute_data: {},
        attribute: {},
      };
      setFormValues([baseDefault]);
    } else {
      setFormValues(updatedFormValues);
    }
  };

  // Handle product selection
  const productSelect = (product, index) => {
    if (!product?.product_id) return;
    getProductUnit(product, index);
  };

  // Fetch product details
  const getProductUnit = async (product, index) => {
    try {
      if (!token || !product?.product_id) {
        throw new Error("Invalid parameters");
      }

      const response = await leadService.getProductUnit(
        token,
        product?.product_id,
        user?.id,
        user?.type
      );
      const data = Array.isArray(response) ? response[0] : response;
      const productData = data?.DATA;

      if (data?.STATUS === "SUCCESS") {
        let newFormValues = [...formValues];
        newFormValues[index] = {
          unique_id: newFormValues[index].unique_id || generateUniqueId(),
          productid: product?.product_id ?? "",
          productname: product?.name ?? "",
          short_description: productData?.short_description ?? "", // Add this line
          productcode: productData?.productcode ?? "",
          product_image: productData?.product_image ?? "",
          Attribute_data: productData?.Attribute_data || {},
          attribute: newFormValues[index]?.attribute || {},
        };
        setFormValues(newFormValues);

        if (productData?.Attribute_data && Object.keys(productData.Attribute_data).length > 0) {
          const newExpandedRows = new Set(expandedRows);
          newExpandedRows.add(index);
          setExpandedRows(newExpandedRows);
        } else {
          const newExpandedRows = new Set(expandedRows);
          newExpandedRows.delete(index);
          setExpandedRows(newExpandedRows);
        }
      } else {
        resetRow(index);
        toast.error(data?.MSG || "Failed to fetch product details");
      }
    } catch (error) {
      console.error("Error fetching product unit:", error);
      resetRow(index);
      toast.error("Error fetching product details");
    }
  };

  const resetRow = (index) => {
    const newFormValues = [...formValues];
    newFormValues[index] = {
      unique_id: newFormValues[index].unique_id || generateUniqueId(),
      productid: "",
      productname: "",
      short_description: "", // Add this line
      productcode: "",
      product_image: "",
      Attribute_data: {},
      attribute: newFormValues[index]?.attribute || {},
    };
    setFormValues(newFormValues);

    const newExpandedRows = new Set(expandedRows);
    newExpandedRows.delete(index);
    setExpandedRows(newExpandedRows);
  };

  // Count attribute rows
  const getAttributeRowCount = (element, index) => {
    const productAttrKey = `${element.productid}_${index}`;
    const attrRows = element?.attribute?.[productAttrKey] || [];
    return attrRows.length;
  };

  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[700px] border-collapse">
          <TableHeader>
            <TableRow className="bg-[#4a5a6b] text-white hover:bg-[#4a5a6b]">
              {/* Attributes - Narrow */}
              <TableHead className="text-white text-sm px-2 py-2 w-[60px] min-w-[60px] text-center">
                Attr
              </TableHead>
              {/* Image - Fixed small */}
              <TableHead className="text-white text-sm px-2 py-2 w-[50px] min-w-[50px] text-center">
                Image
              </TableHead>
              {/* Product - Takes most space */}
              <TableHead className="text-white text-sm px-3 py-2 min-w-[200px] max-w-[400px] text-left">
                Product
              </TableHead>
              {/* Sub Total - Auto */}
              <TableHead className="text-white text-sm px-3 py-2 w-[100px] min-w-[100px] text-center">
                Sub Total
              </TableHead>
              {/* Action - Fixed small */}
              <TableHead className="text-white text-sm px-2 py-2 w-[60px] min-w-[60px] text-center">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formValues.map((element, index) => (
              <React.Fragment key={element.unique_id}>
                <TableRow className="hover:bg-gray-50 text-center align-middle">
                  {/* Attributes */}
                  <TableCell className="py-2 px-1 w-[120px]">
                    <div className="flex items-center justify-center">
                      <Tag
                        className={`${element.productid && Object.keys(element.Attribute_data || {}).length > 0
                          ? "text-[#26994e] cursor-pointer rotate-90"
                          : "text-gray-400 cursor-not-allowed opacity-50 rotate-90"
                          }`}
                        size={20}
                        onClick={() => {
                          if (element.productid && Object.keys(element.Attribute_data || {}).length > 0) {
                            toggleExpand(index);
                          }
                        }}
                      />
                      <span className="ml-1 text-xs text-gray-600">
                        ({getAttributeRowCount(element, index)} rows)
                      </span>
                    </div>
                  </TableCell>

                  {/* Image */}
                  <TableCell className="py-2 px-1 w-[50px]">
                    <img
                      alt="product"
                      src={
                        element.product_image
                          ? `${baseurl}/viewimage/getproduct/${element.product_image}/normal`
                          : `${baseurl}/viewimage/getproduct/normal`
                      }
                      className="w-8 h-8 object-cover rounded mx-auto"
                    />
                  </TableCell>

                  {/* Product Name / Search */}
                  <TableCell className="py-2 px-3 text-left min-w-[200px] max-w-[400px]">
                    {element.productid ? (
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium truncate">
                          {element.productname || ""}{" "}
                          {element.productcode && <span className="text-gray-500">({element.productcode})</span>}
                        </div>
                        {element.short_description && (
                          <TooltipProvider>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <Info
                                  className="text-blue-500 cursor-pointer flex-shrink-0"
                                  size={16}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{element.short_description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    ) : (
                      <ProductSearch
                        products={productList}
                        onSelect={(product) => productSelect(product, index)}
                      />
                    )}
                  </TableCell>

                  {/* Sub Total */}
                  <TableCell className="py-2 px-3 text-center font-bold text-green-700 w-[180px]">
                    {element.subTotal !== undefined ? element.subTotal.toFixed(2) : "-"}
                  </TableCell>

                  {/* Delete Action */}
                  <TableCell className="py-2 px-1 w-[60px]">
                    <Trash2
                      className={`h-7 w-7 p-1.5 rounded-full mx-auto ${formValues.length === 1 && !element.productid
                        ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                        : "text-red-500 hover:bg-red-100 cursor-pointer"
                        }`}
                      onClick={() => {
                        if (formValues.length > 1 || element.productid) {
                          removeFormFields(index);
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>

                {/* Expanded Row - Attributes Editor */}
                {expandedRows.has(index) && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0 bg-gray-50 border-t">
                      <ProductAttributesEditor
                        product={element}
                        index={index}
                        formValues={formValues}
                        setFormValues={setFormValues}
                        onClose={() => toggleExpand(index)}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>

        {/* Add Button - Desktop */}
        <div className="mt-3 flex justify-end px-2">
          <Button
            type="button"
            className="bg-[#287f71] hover:bg-[#20665a] text-white text-xs px-3 py-1 h-8 flex items-center gap-1"
            onClick={addFormFields}
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4 mb-4">
        {formValues.map((element, index) => (
          <div
            key={element.unique_id}
            className="border rounded-lg p-3 bg-white shadow-sm"
          >
            <div className="flex justify-end mb-2">
              <Trash2
                className={`h-8 w-8 p-2 rounded-full ${formValues.length === 1 && !element.productid
                  ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                  : "text-red-500 hover:bg-red-100 cursor-pointer"
                  }`}
                onClick={() => {
                  if (formValues.length > 1 || element.productid) {
                    removeFormFields(index);
                  }
                }}
              />
            </div>

            <div className="space-y-3 text-sm">
              {/* Attributes */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-600 w-20">Attr:</span>
                <div className="flex items-center">
                  <Tag
                    className={`${element.productid && Object.keys(element.Attribute_data || {}).length > 0
                      ? "text-[#26994e] cursor-pointer rotate-90"
                      : "text-gray-400 cursor-not-allowed opacity-50 rotate-90"
                      }`}
                    size={20}
                    onClick={() => {
                      if (element.productid && Object.keys(element.Attribute_data || {}).length > 0) {
                        toggleExpand(index);
                      }
                    }}
                  />
                  <span className="ml-1 text-xs">({getAttributeRowCount(element, index)} rows)</span>
                </div>
              </div>

              {/* Image */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-600 w-20">Image:</span>
                <img
                  alt="product"
                  src={
                    element.product_image
                      ? `${baseurl}/viewimage/getproduct/${element.product_image}/normal`
                      : `${baseurl}/viewimage/getproduct/normal`
                  }
                  className="w-10 h-10 object-cover rounded"
                />
              </div>

              {/* Product */}
              <div className={`${element.productid ? "flex items-center" : ""}`}>
                <label className="text-sm font-medium text-gray-500 w-20">
                  Product:
                </label>
                {element.productid ? (
                  <div className="flex items-center">
                    <span className="text-sm flex-1">
                      {element.productname || ""} {element.productcode && ` (${element.productcode})`}
                    </span>
                  </div>
                ) : (
                  <ProductSearch
                    products={productList}
                    onSelect={(product) => productSelect(product, index)}
                    className="mt-1"
                  />
                )}
              </div>

              {element.short_description && (
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-500 w-32">Description:</label>
                  <div className="flex items-center">
                    <TooltipProvider>
                      <Tooltip
                        open={tooltipOpenIndex === index}
                        onOpenChange={(open) => setTooltipOpenIndex(open ? index : null)}
                        delayDuration={0}
                      >
                        <TooltipTrigger asChild>
                          <Info
                            className="text-blue-500 cursor-pointer"
                            size={18}
                            onClick={() => setTooltipOpenIndex(tooltipOpenIndex === index ? null : index)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{element.short_description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              )}

              {/* Sub Total */}
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-600 w-20">Sub Total:</span>
                <span className="font-bold text-green-700">
                  {element.subTotal !== undefined ? element.subTotal.toFixed(2) : "-"}
                </span>
              </div>
            </div>

            {/* Expanded Editor */}
            {expandedRows.has(index) && (
              <div className="mt-4 border-t pt-3 max-h-[400px] overflow-y-auto">
                <ProductAttributesEditor
                  product={element}
                  index={index}
                  formValues={formValues}
                  setFormValues={setFormValues}
                  onClose={() => toggleExpand(index)}
                />
              </div>
            )}
          </div>
        ))}

        {/* Add Button - Mobile */}
        <div className="flex justify-end">
          <Button
            type="button"
            className="bg-[#287f71] hover:bg-[#20665a] text-white text-xs px-3 py-1 h-8 flex items-center gap-1"
            onClick={addFormFields}
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MeasurementProductSelectionTable;