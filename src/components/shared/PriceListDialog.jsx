"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, parseISO, isValid, parse, isAfter, isBefore } from "date-fns";
import { toast } from "sonner";
import { HashLoader } from "react-spinners";
import { useSharedDataStore } from "@/stores/sharedData.store";

export const PriceListDialog = ({
  open,
  setOpen,
  product,
  selectedProductPriceList,
  isSelectedProductPriceListLoading,
  onSave,
}) => {
  const { companyDetails } = useSharedDataStore();
  const [selectedPriceList, setSelectedPriceList] = useState("");
  const [priceLists, setPriceLists] = useState([]);
  const [filteredPriceLists, setFilteredPriceLists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [activePriceListId, setActivePriceListId] = useState("");

  // Parse server date from dd-MM-yyyy format
  const serverDate = useMemo(() => {
    if (!companyDetails?.server_time) return null;
    try {
      // Convert Unix timestamp to Date then format as dd-MM-yyyy
      const date = new Date(companyDetails.server_time * 1000);
      const formatted = format(date, "dd-MM-yyyy");
      return parse(formatted, "dd-MM-yyyy", new Date());
    } catch {
      return null;
    }
  }, [companyDetails?.server_time]);

  // Parse date string in dd-MM-yyyy format
  const parseDdMmYyyy = (dateStr) => {
    if (!dateStr) return null;
    try {
      return parse(dateStr, "dd-MM-yyyy", new Date());
    } catch {
      return null;
    }
  };

  // Extract attribute code from text
  const extractAttributeCode = (text) => {
    if (!text || typeof text != "string") return null;
    const match = text.match(/\((\d+)\)$/);
    return match ? match[1] : null;
  };

  // Clean attribute name by removing the code
  const cleanAttributeName = (header) => {
    if (!header) return "";
    return header.replace(/\s*\(\d+\)$/, "").trim();
  };

  // Extract value from dynamic attribute
  const extractDynamicValue = (value) => {
    if (!value || typeof value != "string") return null;
    const match = value.match(/^(.+?)\s*\(\d+\)$/);
    return match ? match[1].trim() : value.trim();
  };

  // Get product attributes from product data
  const getProductAttributes = () => {
    if (!product?.attribute || !product?.Attribute_data) return {};

    const attributes = {};
    const attributeKeys = Object.keys(product.attribute);

    if (attributeKeys.length == 0) return {};

    // Get the first attribute object (assuming there's only one)
    const productAttr = product.attribute[attributeKeys[0]];

    // For each attribute in the product
    Object.keys(productAttr).forEach(attrId => {
      const valueId = productAttr[attrId];

      if (product.Attribute_data[attrId] && product.Attribute_data[attrId].Masters) {
        const master = product.Attribute_data[attrId].Masters[valueId];
        if (master && master.N) {
          attributes[attrId] = master.N;
        }
      }
    });

    return attributes;
  };

  // Filter price lists based on product attributes
  const filterPriceListsByAttributes = (priceListsData, headers, productAttributes) => {
    if (Object.keys(productAttributes).length == 0) return priceListsData;

    return priceListsData.filter(priceList => {
      // Check if this price list matches all product attributes
      return Object.keys(productAttributes).every(attrId => {
        // Find the header column that corresponds to this attribute
        const attributeHeader = headers.find(header =>
          header.isDynamic && header.code == attrId
        );

        if (!attributeHeader) return true; // No matching column, skip check

        const columnValue = priceList[attributeHeader.id];
        const productAttributeValue = productAttributes[attrId];

        // Check if the values match
        return columnValue == productAttributeValue;
      });
    });
  };

  // Transform API data to table format and return both data and headers
  const transformPriceListData = (pricelistData) => {
    if (
      !pricelistData ||
      typeof pricelistData != "object" ||
      !pricelistData.header ||
      !pricelistData.data
    ) {
      return { data: [], headers: [] };
    }

    const { header, data } = pricelistData;

    // Create map of attribute codes to column indexes
    const attributeMap = {};
    header.forEach((h, index) => {
      const code = extractAttributeCode(h);
      if (code) attributeMap[code] = index;
    });

    // Generate table headers
    const generatedHeaders = [
      { id: "select", name: "Select", isSpecial: true },
      ...header.map((h, index) => ({
        id: `col_${index}`,
        name: cleanAttributeName(h),
        code: extractAttributeCode(h),
        index,
        isDynamic: !!extractAttributeCode(h),
      })),
    ];

    // Transform the data rows
    const transformedData = data.map((row, idx) => {
      const rowData = { id: String(idx + 1) };

      // First handle standard columns
      header.forEach((h, index) => {
        if (!extractAttributeCode(h)) {
          rowData[`col_${index}`] = row[index] ?? null;
        }
      });

      // Then handle dynamic attributes
      row.forEach((value) => {
        const code = extractAttributeCode(value);
        if (code && attributeMap[code] != undefined) {
          const cleanValue = extractDynamicValue(value);
          if (cleanValue) {
            rowData[`col_${attributeMap[code]}`] = cleanValue;
          }
        }
      });

      return rowData;
    });

    return { data: transformedData, headers: generatedHeaders };
  };

  // Find the active price list based on server date (exclusive of boundary dates)
  const findActivePriceList = (data) => {
    if (!serverDate || !data?.length) return "";

    for (const row of data) {
      const fromDate = parseDdMmYyyy(row.col_1); // Effective From Date
      const toDate = parseDdMmYyyy(row.col_2); // Effective To Date

      // Check if serverDate is strictly between fromDate and toDate
      if (
        fromDate &&
        toDate &&
        isAfter(serverDate, fromDate) &&
        isBefore(serverDate, toDate)
      ) {
        return row.id;
      }
    }

    return "";
  };

  useEffect(() => {
    if (open && selectedProductPriceList) {
      setIsLoading(true);
      try {
        // Transform the data and get both data and headers
        const { data: transformedData, headers: generatedHeaders } =
          transformPriceListData(selectedProductPriceList);

        // Get product attributes
        const productAttributes = getProductAttributes();

        // Filter price lists based on product attributes
        const filteredData = filterPriceListsByAttributes(
          transformedData,
          generatedHeaders,
          productAttributes
        );

        // Set both state variables
        setPriceLists(transformedData);
        setFilteredPriceLists(filteredData);
        setTableHeaders(generatedHeaders);

        // Find active price list with the filtered data
        const activeId = findActivePriceList(filteredData);
        setActivePriceListId(activeId);

        // Initialize selected price list
        setSelectedPriceList("");
      } catch (error) {
        console.error("Error transforming data:", error);
        toast.error("Failed to load price lists");
        setPriceLists([]);
        setFilteredPriceLists([]);
        setTableHeaders([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setPriceLists([]);
      setFilteredPriceLists([]);
      setTableHeaders([]);
      setSelectedPriceList("");
      setActivePriceListId("");
    }
  }, [open, selectedProductPriceList, companyDetails?.server_time]);

  const handleSave = () => {
    if (!selectedPriceList && !activePriceListId) {
      toast.warning("Please select a price list");
      return;
    }

    const selectedId = selectedPriceList || activePriceListId;
    const selected = filteredPriceLists.find((pl) => pl.id == selectedId);

    if (selected) {
      onSave({
        ...selected,
        priceINR: selected.col_3 || "0",
        name: selected.col_0 || "Selected Price List",
      });
    }

    setSelectedPriceList("");
    setActivePriceListId("");
    setOpen(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.split("-");
      if (
        parts.length == 3 &&
        parts[0].length == 2 &&
        parts[1].length == 2 &&
        parts[2].length == 4
      ) {
        return dateStr;
      }
      let parsedDate = parseISO(dateStr);
      if (!isValid(parsedDate)) parsedDate = new Date(dateStr);
      if (isValid(parsedDate)) {
        return format(parsedDate, "dd-MM-yyyy");
      }
      return "-";
    } catch {
      return "-";
    }
  };

  const isDateColumn = (headerName) => {
    if (!headerName) return false;
    const lowerName = headerName.toLowerCase();
    return lowerName.includes("date") || lowerName.includes("effective");
  };

  const shouldDisplayColumn = (header) => {
    if (header.isSpecial) return true;

    // Check if this column contains numeric values (including 0)
    const hasNumericValues = filteredPriceLists.some((row) => {
      const value = row[header.id];
      return typeof value == 'number' || (!isNaN(parseFloat(value)) && isFinite(value));
    });

    if (hasNumericValues) return true;

    // For non-numeric columns, check if they have any content
    return filteredPriceLists.some((row) => {
      const value = row[header.id];
      return value != null && value != "" && value != undefined;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[1200px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle>Select Price List</DialogTitle>
        </DialogHeader>

        {isSelectedProductPriceListLoading || isLoading ? (
          <div className="flex justify-center items-center py-8">
            <HashLoader color="#287f71" size={50} />
          </div>
        ) : filteredPriceLists.length == 0 ? (
          <>
            <p className="text-center py-4">
              No matching price lists available for this product.
            </p>
            {/* <p className="text-center py-4">
              No price lists match this product's specifications.
              Please check if there are price lists available for
              {product?.Attribute_data ? Object.values(product.Attribute_data).map(attr => attr.Name).join(" and ") : "this product category"}.
            </p> */}
          </>

        ) : (
          <div className="overflow-x-auto">
            <RadioGroup
              value={selectedPriceList || activePriceListId}
              onValueChange={(value) => setSelectedPriceList(value)}
            >
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-[#4a5a6b] text-white hover:bg-[#4a5a6b]">
                    {tableHeaders
                      .filter((header) => shouldDisplayColumn(header))
                      .map((header) => (
                        <TableHead
                          key={header.id}
                          className="text-white px-2 py-2"
                        >
                          {header.name}
                        </TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPriceLists.map((pl) => (
                    <TableRow key={pl.id} className="text-center">
                      {tableHeaders
                        .filter((header) => shouldDisplayColumn(header))
                        .map((header) => {
                          if (header.isSpecial) {
                            return (
                              <TableCell key={header.id}>
                                <RadioGroupItem
                                  value={pl.id}
                                  id={`pl-${pl.id}`}
                                  checked={
                                    (selectedPriceList || activePriceListId) ==
                                    pl.id
                                  }
                                  className="text-white data-[state=checked]:border-[#287f71] [&[data-state=checked]>span>svg]:fill-[#287f71]"
                                />
                              </TableCell>
                            );
                          }

                          const value = pl[header.id];

                          if (isDateColumn(header.name)) {
                            return (
                              <TableCell key={header.id} className="text-left">
                                {formatDate(value)}
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell key={header.id} className="text-left">
                              {value != null && value != "" ? value : "-"}
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </RadioGroup>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm sm:text-base"
                onClick={handleSave}
                disabled={!selectedPriceList && !activePriceListId}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};