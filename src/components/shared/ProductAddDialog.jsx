"use client";
import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Loader2, Upload, X, FileUp } from "lucide-react";
import { useLoginStore } from "@/stores/auth.store";
import { MultiSelect } from "@/components/shared/MultiSelect";
import ProductService from "@/lib/ProductService";
import { createProductFormSchema } from "@/validation/product-form.schema";

const ProductAddDialog = ({ open, onOpenChange, productId, onSuccess, categoriesData, unitsData }) => {
    const { token, appConfig } = useLoginStore();
    const queryClient = useQueryClient();
    const [imagePreview, setImagePreview] = useState(null);
    const [existingImage, setExistingImage] = useState(null);
    const [galleryFiles, setGalleryFiles] = useState([]);
    const [existingGallery, setExistingGallery] = useState([]);
    const [attributes, setAttributes] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [codeAttrBased, setCodeAttrBased] = useState("");
    const [codeActiveAttr, setCodeActiveAttr] = useState([]);
    const [categoryId, setCategoryId] = useState(null);
    const [timer, setTimer] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm({
        resolver: zodResolver(createProductFormSchema()),
        defaultValues: {
            category_id: "",
            product_name: "",
            product_code: "",
            unit_id: "",
            price: "",
            mrp_price: "",
            description: "",
            hsn_code: "",
            batch_controlled: "N",
            serialized: "N",
            child_categories: [],
            vol_length: "",
            vol_breath: "",
            vol_height: "",
            vol_weight: "",
        },
        mode: "onChange",
    });

    const watchBatchControlled = form.watch("batch_controlled");
    const watchCategoryId = form.watch("category_id");

    // Fetch Product Data for Edit
    const { data: productData, isLoading: isProductLoading, refetch: refetchProductData } = useQuery({
        queryKey: ["productData", productId, token],
        queryFn: async () => {
            const response = await ProductService.getProductSingleData(token, productId);
            return response;
        },
        enabled: !!token && !!productId && open,
        refetchOnMount: "always",
        staleTime: 0,
        cacheTime: 0,
    });

    // Fetch Gallery Data for Edit
    const { data: galleryData } = useQuery({
        queryKey: ["productGallery", productId, token],
        queryFn: async () => {
            const response = await ProductService.getProductGallery(token, productId);
            return response;
        },
        enabled: !!token && !!productId && open,
    });

    // Fetch Attributes based on Category
    const { data: attributesData } = useQuery({
        queryKey: ["attributes", watchCategoryId, token],
        queryFn: async () => {
            const response = await ProductService.getAttributeMaster(token, watchCategoryId);
            return response;
        },
        enabled: !!token && !!watchCategoryId && open,
    });

    // Update code generation settings when attributes data changes
    useEffect(() => {
        if (attributesData && watchCategoryId) {
            const responseData = Array.isArray(attributesData) ? attributesData?.[0] : attributesData;
            if (responseData?.STATUS === "SUCCESS") {
                if (responseData?.DATA?.code_generation) {
                    setCodeAttrBased(responseData.DATA.code_generation);
                } else {
                    setCodeAttrBased("");
                }
                if (responseData?.DATA?.activecodegen_attr) {
                    setCodeActiveAttr(responseData.DATA.activecodegen_attr);
                } else {
                    setCodeActiveAttr([]);
                }
            } else {
                setCodeAttrBased("");
                setCodeActiveAttr([]);
            }
        } else if (!watchCategoryId) {
            setCodeAttrBased("");
            setCodeActiveAttr([]);
        }
    }, [attributesData, watchCategoryId]);

    // Load product data for edit
    useEffect(() => {
        if (open && productId && productData && !isProductLoading) {
            const responseData = Array.isArray(productData) ? productData?.[0] : productData;
            if (responseData?.STATUS === "SUCCESS" && responseData?.DATA?.products?.Product) {
                const product = responseData?.DATA?.products?.Product;

                // Prepare form values - ensure all Select values are strings
                const formValues = {
                    category_id: product?.category?.toString() || "",
                    product_name: product?.name || "",
                    product_code: product?.code || "",
                    unit_id: product?.unit?.toString() || "",
                    price: product?.price1_min || "",
                    mrp_price: product?.mrp_price || "",
                    description: product?.short_description || "",
                    hsn_code: product?.hsn_code || "",
                    batch_controlled: product?.isconsumable || "N",
                    serialized: product?.trackserialnumber_flg || "N",
                    vol_length: product?.packaged_weight || "",
                    vol_breath: product?.packaged_volume || "",
                    vol_height: product?.product_attr1 || "",
                    vol_weight: product?.product_attr2 || "",
                    child_categories: responseData?.DATA?.exist_category?.map(cat => {
                        const id = cat?.value || cat?.category_id;
                        return id?.toString();
                    }).filter(id => id) || [],
                };

                // Use reset to properly set all form values and clear errors
                form.reset(formValues, { keepDefaultValues: false });

                // Set product image from photo_src
                if (responseData?.DATA?.photo_src) {
                    setExistingImage(responseData.DATA.photo_src);
                } else if (product?.product_image) {
                    setExistingImage(product.product_image);
                }

                // Load existing attributes - convert to old format
                if (responseData?.DATA?.products?.ProductAttribute) {
                    const attrs = responseData?.DATA?.products?.ProductAttribute?.reduce((acc, attr) => {
                        acc[`Attr${attr?.attribute_id}[]`] = [attr?.attributevalue_id?.toString()];
                        return acc;
                    }, {});
                    setAttributes(attrs);
                }

                // Trigger validation after setting values to clear any errors
                setTimeout(() => {
                    form.trigger(["category_id", "product_name", "unit_id", "price"]);
                }, 200);
            }
        }

        if (open && productId && galleryData) {
            const responseData = Array.isArray(galleryData) ? galleryData?.[0] : galleryData;
            if (responseData?.STATUS === "SUCCESS" && responseData?.DATA?.gallery) {
                setExistingGallery(responseData?.DATA?.gallery);
            }
        }
    }, [open, productId, productData, galleryData]);

    // Handle Batch/Serial Logic
    useEffect(() => {
        if (watchBatchControlled !== "Y") {
            form.setValue("serialized", "N");
        }
    }, [watchBatchControlled, form]);

    // Update attributes when category changes
    useEffect(() => {
        if (attributesData && !productId) {
            const responseData = Array.isArray(attributesData) ? attributesData?.[0] : attributesData;
            if (responseData?.STATUS === "SUCCESS" && responseData?.DATA?.attribute_arr) {
                setAttributes({});
            }
        }
    }, [attributesData, productId]);

    // Add this useEffect to clear cache when dialog closes
    useEffect(() => {
        if (!open) {
            // Clear product data queries
            if (productId) {
                queryClient.removeQueries({
                    queryKey: ["productData", productId, token],
                    exact: true
                });
                queryClient.removeQueries({
                    queryKey: ["productGallery", productId, token],
                    exact: true
                });
            }

            // Reset form to default values
            form.reset({
                category_id: "",
                product_name: "",
                product_code: "",
                unit_id: "",
                price: "",
                mrp_price: "",
                description: "",
                hsn_code: "",
                batch_controlled: "N",
                serialized: "N",
                child_categories: [],
                vol_length: "",
                vol_breath: "",
                vol_height: "",
                vol_weight: "",
            });

            // Reset local state
            setImagePreview(null);
            setExistingImage(null);
            setGalleryFiles([]);
            setExistingGallery([]);
            setAttributes({});
            setCodeAttrBased("");
            setCodeActiveAttr([]);
            setCategoryId(null);
            if (timer) {
                clearTimeout(timer);
                setTimer(null);
            }
        }
    }, [open, productId, token, queryClient, form]);

    const checkCodeExistence = async (code) => {
        if (!code) return;
        try {
            const response = await ProductService.checkProductCodeExist(token, productId || 0, code);
            const responseData = Array.isArray(response) ? response?.[0] : response;
            if (responseData?.STATUS === "SUCCESS") {
                toast.error(responseData?.MSG || "Product code already exists");
                form.setValue("product_code", "");
                form.setError("product_code", { type: "manual", message: responseData?.MSG || "Product code already exists" });
            } else {
                form.clearErrors("product_code");
            }
        } catch (error) {
            console.error("Error checking product code:", error);
        }
    };

    const checkNameExistence = async (name) => {
        if (!name) return;
        try {
            const response = await ProductService.checkProductNameExist(token, productId || 0, name);
            const responseData = Array.isArray(response) ? response?.[0] : response;
            if (responseData?.STATUS === "SUCCESS") {
                toast.error(responseData?.MSG || "Product name already exists");
                form.setValue("product_name", "");
                form.setError("product_name", { type: "manual", message: responseData?.MSG || "Product name already exists" });
            } else {
                form.clearErrors("product_name");
            }
        } catch (error) {
            console.error("Error checking product name:", error);
        }
    };

    const handleChangeCategory = (value) => {
        const cat_id = value;
        if (cat_id) {
            setCategoryId(cat_id);
        }
    };

    const handleCheckCodeExist = (e) => {
        const code = e.target.value;
        if (timer) {
            clearTimeout(timer);
            setTimer(null);
        }
        setTimer(
            setTimeout(() => {
                checkCodeExistence(code);
            }, 3000)
        );
    };

    const handleCheckProductExist = (e) => {
        const product_name = e.target.value;
        if (timer) {
            clearTimeout(timer);
            setTimer(null);
        }
        setTimer(
            setTimeout(() => {
                checkNameExistence(product_name);
            }, 3000)
        );
    };

    const handleImageChange = (e) => {
        const file = e?.target?.files?.[0];
        if (file) {
            const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
            if (!allowedTypes?.includes(file?.type)) {
                toast.error("Invalid file type. Only JPEG, JPG, and PNG formats are allowed.");
                e.target.value = "";
                return;
            }

            if (file?.size > 2 * 1024 * 1024) {
                toast.error("Image size must be less than 2MB");
                e.target.value = "";
                return;
            }

            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                if (img?.width > 600 || img?.height > 600) {
                    toast.error("Image dimensions exceed the allowed size! Maximum 600x600 pixels.");
                    e.target.value = "";
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result);
                    setExistingImage(null);
                };
                reader.readAsDataURL(file);
            };
        }
    };

    const handleGalleryChange = (e) => {
        const files = Array.from(e?.target?.files || []);
        const totalFiles = galleryFiles?.length + existingGallery?.length + files?.length;

        if (totalFiles > 5) {
            toast.error("You can only upload a maximum of 5 images/videos.");
            return;
        }

        const validFiles = files?.filter(file => {
            const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "video/mp4", "video/webm", "video/ogg"];

            if (!allowedTypes?.includes(file?.type)) {
                toast.error(`${file?.name} is not an allowed file type.`);
                return false;
            }

            if (file?.size > 2 * 1024 * 1024) {
                toast.error(`${file?.name} is too large (max 2MB).`);
                return false;
            }
            return true;
        });

        const newFiles = validFiles?.map(file => ({
            file,
            preview: URL.createObjectURL(file),
        }));

        setGalleryFiles(prev => [...prev, ...newFiles]);
        if (e?.target) {
            e.target.value = "";
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const droppedFiles = Array.from(event.dataTransfer.files || []);
        if (droppedFiles.length > 0) {
            const fakeEvent = {
                target: {
                    files: droppedFiles
                }
            };
            handleGalleryChange(fakeEvent);
        }
    };

    const removeGalleryFile = (index) => {
        setGalleryFiles(prev => prev?.filter((_, i) => i !== index));
    };

    const removeExistingGalleryImage = async (pictureId) => {
        try {
            setIsDeleting(true);
            const response = await ProductService.deleteProductGalleryImage(token, productId, pictureId);
            const responseData = Array.isArray(response) ? response?.[0] : response;
            if (responseData?.STATUS === "SUCCESS") {
                toast.success("Image deleted successfully");
                setExistingGallery(prev => prev?.filter(img => img?.picture_id !== pictureId));
            } else {
                toast.error(responseData?.MSG || "Failed to delete image");
            }
        } catch (error) {
            console.error("Error deleting gallery image:", error);
            toast.error("Error deleting gallery image");
        } finally {
            setIsDeleting(false);
        }
    };

    // Create File object from URL (for existing gallery images when editing)
    const createFileObjectFromUrl = async (url, fileName) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: blob.type });
            return file;
        } catch (error) {
            console.error(`Error creating file from URL: ${url}`, error);
            throw error;
        }
    };

    // Create File objects from array of gallery items (for editing)
    const createFileObjectsFromArray = async (array) => {
        const fileObjects = [];
        for (const item of array) {
            try {
                // If the object doesn't have a `src`, return it as is
                if (!item.src && !item.picture_url) {
                    fileObjects.push(item);
                    continue;
                }
                // Create a File object from the URL and file name
                const file = await createFileObjectFromUrl(item.src || item.picture_url, item.file_name || `image_${item.picture_id || Date.now()}.jpg`);
                // Generate a preview URL for the file
                const preview = URL.createObjectURL(file);
                // Add the file and preview to the array
                fileObjects.push({
                    file: file,
                    preview: preview,
                });
            } catch (error) {
                console.error(`Error creating file from URL: ${item.src || item.picture_url}`, error);
                // If there's an error, push the original object as a fallback
                fileObjects.push(item);
            }
        }
        return fileObjects;
    };

    const onSubmit = async (data) => {
        if (isDeleting) {
            toast.error("Please wait! Deletion in progress. Save will proceed after it completes.");
            return;
        }

        // Validate product_code if codeAttrBased == "M"
        if (codeAttrBased == "M" && (!data?.product_code || data?.product_code?.trim() === "")) {
            form.setError("product_code", { type: "manual", message: "Product Code is required" });
            toast.error("Product Code is required");
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();

            if (productId) {
                formData.append("product_id", productId);
            }

            formData.append("category_id", data?.category_id);
            formData.append("name", data?.product_name);
            formData.append("productcode", data?.product_code);
            formData.append("unit", data?.unit_id);
            formData.append("expo_iframe", data?.unit_id); // Same as unit per old code
            formData.append("price", data?.price);
            formData.append("mrpprice", data?.mrp_price);
            formData.append("description", data?.description || "");
            formData.append("hsn_code", data?.hsn_code || "");
            formData.append("isconsumable", data?.batch_controlled);
            formData.append("trackserialnumber_flg", data?.serialized);
            formData.append("vol_length", data?.vol_length || "");
            formData.append("vol_breath", data?.vol_breath || "");
            formData.append("vol_height", data?.vol_height || "");
            formData.append("vol_weight", data?.vol_weight || "");
            formData.append("attributes", JSON.stringify(attributes));

            // Transform child_categories to API format: [{"value":"20","label":"..."}]
            // Get categories from props (passed from ProductListTable)
            const categoriesResponse = Array.isArray(categoriesData) ? categoriesData?.[0] : categoriesData;
            const categoriesList = categoriesResponse?.STATUS === "SUCCESS" ? categoriesResponse?.DATA?.categorylists || [] : [];

            const transformedChildCategories = (data?.child_categories || []).map(catId => {
                // Find the category object from categories list
                const category = categoriesList?.find(cat =>
                    cat?.Productcategory?.category_id?.toString() === catId?.toString()
                );
                if (category) {
                    return {
                        value: category.Productcategory.category_id?.toString(),
                        label: category.Productcategory.category_name || ""
                    };
                }
                // Fallback if category not found
                return {
                    value: catId?.toString(),
                    label: ""
                };
            });
            formData.append("childcategory", JSON.stringify(transformedChildCategories));

            // Handle main image
            const imageFile = data?.product_image?.[0];
            if (imageFile) {
                formData.append("photo", imageFile);
            }

            // Handle gallery files - match old code logic
            if (productId) {
                // If product_id is available (editing), create fileObjects from the array of objects
                const allGalleryFiles = [...existingGallery, ...galleryFiles];
                if (allGalleryFiles.length > 0) {
                    const fileObjects = await createFileObjectsFromArray(allGalleryFiles);
                    if (Array.isArray(fileObjects) && fileObjects.length > 0) {
                        formData.append("gallery_file_count", fileObjects.length);
                        fileObjects.forEach((file, index) => {
                            if (file.file) {
                                formData.append(`thumbfile${index + 1}`, file.file, file.file.name);
                            }
                        });
                    }
                }
            } else {
                // Otherwise (adding new), use the existing galleryFiles array
                if (Array.isArray(galleryFiles) && galleryFiles.length > 0) {
                    formData.append("gallery_file_count", galleryFiles.length);
                    galleryFiles.forEach((file, index) => {
                        if (file.file) {
                            formData.append(`thumbfile${index + 1}`, file.file, file.file.name);
                        }
                    });
                }
            }

            // Save product
            const response = await ProductService.saveProduct(token, formData);
            const responseData = Array.isArray(response) ? response?.[0] : response;

            if (responseData?.STATUS === "SUCCESS") {
                const newProductId = responseData?.DATA?.product_id || responseData?.product_id || productId;

                // Save gallery files after main product save (only new files, not existing ones)
                if (galleryFiles?.length > 0 && newProductId) {
                    try {
                        const galleryFormData = new FormData();
                        galleryFormData.append("product_id", newProductId);
                        galleryFormData.append("gallery_file_count", galleryFiles.length);

                        galleryFiles.forEach((fileObj, index) => {
                            if (fileObj?.file) {
                                galleryFormData.append(`thumbfile${index + 1}`, fileObj.file, fileObj.file.name);
                            }
                        });

                        await ProductService.saveGalleryFile(token, galleryFormData);
                    } catch (galleryError) {
                        console.error("Error uploading gallery:", galleryError);
                        toast.error("Product saved, but failed to upload some gallery images.");
                    }
                }

                toast.success(responseData?.MSG || "Product saved successfully");

                // Remove queries to refresh data
                queryClient.removeQueries(["productList"]);
                if (productId) {
                    queryClient.removeQueries({
                        queryKey: ["productData", productId, token],
                        exact: true
                    });
                    queryClient.removeQueries({
                        queryKey: ["productGallery", productId, token],
                        exact: true
                    });
                }


                // Reset form and state after successful save only if adding new product (not editing)
                if (!productId) {
                    form.reset({
                        category_id: "",
                        product_name: "",
                        product_code: "",
                        unit_id: "",
                        price: "",
                        mrp_price: "",
                        description: "",
                        hsn_code: "",
                        batch_controlled: "N",
                        serialized: "N",
                        child_categories: [],
                        vol_length: "",
                        vol_breath: "",
                        vol_height: "",
                        vol_weight: "",
                    });
                    setImagePreview(null);
                    setExistingImage(null);
                    setGalleryFiles([]);
                    setExistingGallery([]);
                    setAttributes({});
                    setCodeAttrBased("");
                    setCodeActiveAttr([]);
                    setCategoryId(null);
                    if (timer) {
                        clearTimeout(timer);
                        setTimer(null);
                    }
                } else {
                    // Clear only gallery files when editing
                    setGalleryFiles([]);
                }

                onSuccess?.();
            } else {
                toast.error(responseData?.MSG || "Failed to save product");
            }
        } catch (error) {
            console.error("Error saving product:", error);
            toast.error("Error saving product");
        } finally {
            setIsSaving(false);
        }
    };

    // Process API responses
    const categoriesResponse = Array.isArray(categoriesData) ? categoriesData?.[0] : categoriesData;
    const categories = categoriesResponse?.STATUS === "SUCCESS" ? categoriesResponse?.DATA?.categorylists || [] : [];

    const unitsResponse = Array.isArray(unitsData) ? unitsData?.[0] : unitsData;
    const units = unitsResponse?.STATUS === "SUCCESS" ? unitsResponse?.DATA?.units || [] : [];

    const attributesResponse = Array.isArray(attributesData) ? attributesData?.[0] : attributesData;
    const attributeList = attributesResponse?.STATUS === "SUCCESS" ? attributesResponse?.DATA?.attribute_arr || [] : [];

    // Guard: Don't render until dialog is open and form is ready
    if (!open) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[90vw] max-w-[425px] md:w-full md:max-w-[600px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-white p-4 sm:p-6 rounded-lg">
                <DialogHeader>
                    <DialogTitle>{productId ? "Edit Product" : "Add Product"}</DialogTitle>
                    <DialogClose className="absolute right-4 top-4" />
                </DialogHeader>

                {isProductLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-[#562A75]" />

                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:gap-4 md:gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                                {/* Parent Category */}
                                <FormField
                                    control={form.control}
                                    name="category_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Label className="text-sm md:text-base">
                                                    Parent Category <span className="text-red-500">*</span>
                                                </Label>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={(value) => {
                                                            field.onChange(value);
                                                            handleChangeCategory(value);
                                                        }}
                                                        value={field?.value || undefined}
                                                    >
                                                        <SelectTrigger className="input-focus-style">
                                                            <SelectValue placeholder="Select Category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {categories?.map((cat) => (
                                                                <SelectItem key={cat?.Productcategory?.category_id} value={cat?.Productcategory?.category_id?.toString()}>
                                                                    {cat?.Productcategory?.category_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </div>
                                            <FormMessage className="text-xs h-2" />
                                        </FormItem>
                                    )}
                                />

                                {/* Child Category */}
                                <MultiSelect
                                    control={form.control}
                                    name="child_categories"
                                    label="Child Category"
                                    required={false}
                                    options={categories}
                                    valueKey="Productcategory.category_id"
                                    labelKey="Productcategory.category_name"
                                />

                                {/* Product Code - Only show if code_attr_based == "M" */}
                                {codeAttrBased == "M" && (
                                    <FormField
                                        control={form.control}
                                        name="product_code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <Label className="text-sm md:text-base">
                                                        Code <span className="text-red-500">*</span>
                                                    </Label>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            className="input-focus-style"
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                handleCheckCodeExist(e);
                                                            }}
                                                        />
                                                    </FormControl>
                                                </div>
                                                <FormMessage className="text-xs h-2" />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Product Name */}
                                <FormField
                                    control={form.control}
                                    name="product_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Label className="text-sm md:text-base">
                                                    Product Name <span className="text-red-500">*</span>
                                                </Label>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        className="input-focus-style"
                                                        onChange={(e) => {
                                                            field.onChange(e);
                                                            handleCheckProductExist(e);
                                                        }}
                                                    />
                                                </FormControl>
                                            </div>
                                            <FormMessage className="text-xs h-2" />
                                        </FormItem>
                                    )}
                                />

                                {/* Unit */}
                                <FormField
                                    control={form.control}
                                    name="unit_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Label className="text-sm md:text-base">
                                                    Unit <span className="text-red-500">*</span>
                                                </Label>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field?.value || undefined}>
                                                        <SelectTrigger className="input-focus-style">
                                                            <SelectValue placeholder="Select Unit" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {units?.map((unit) => (
                                                                <SelectItem key={unit?.Unit?.unit_id} value={unit?.Unit?.unit_id?.toString()}>
                                                                    {unit?.Unit?.unit_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </div>
                                            <FormMessage className="text-xs h-2" />
                                        </FormItem>
                                    )}
                                />

                                {/* MRP Price */}
                                <FormField
                                    control={form.control}
                                    name="mrp_price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Label className="text-sm md:text-base">MRP Price</Label>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        {...field}
                                                        className="input-focus-style"
                                                        onKeyPress={(event) => {
                                                            const char = event.key;
                                                            if (!/[\d.]/.test(char) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char)) {
                                                                event.preventDefault();
                                                            }
                                                            // Prevent multiple decimal points
                                                            if (char === '.' && field.value?.includes('.')) {
                                                                event.preventDefault();
                                                            }
                                                        }}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            // Ensure only one decimal point
                                                            const parts = value.split('.');
                                                            if (parts.length > 2) {
                                                                return;
                                                            }
                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </FormControl>
                                            </div>
                                            <FormMessage className="text-xs h-2" />
                                        </FormItem>
                                    )}
                                />

                                {/* Sales Price */}
                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Label className="text-sm md:text-base">
                                                    Sales Price <span className="text-red-500">*</span>
                                                </Label>
                                                <FormControl>
                                                    <Input
                                                        type="text"
                                                        {...field}
                                                        className="input-focus-style"
                                                        onKeyPress={(event) => {
                                                            const char = event.key;
                                                            if (!/[\d.]/.test(char) && !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(char)) {
                                                                event.preventDefault();
                                                            }
                                                            // Prevent multiple decimal points
                                                            if (char === '.' && field.value?.includes('.')) {
                                                                event.preventDefault();
                                                            }
                                                        }}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/[^\d.]/g, '');
                                                            // Ensure only one decimal point
                                                            const parts = value.split('.');
                                                            if (parts.length > 2) {
                                                                return;
                                                            }
                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </FormControl>
                                            </div>
                                            <FormMessage className="text-xs h-2" />
                                        </FormItem>
                                    )}
                                />

                                {/* HSN/SAC Code */}
                                <FormField
                                    control={form.control}
                                    name="hsn_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Label className="text-sm md:text-base">Hsn/SAC Code</Label>
                                                <FormControl>
                                                    <Input {...field} className="input-focus-style" />
                                                </FormControl>
                                            </div>
                                            <FormMessage className="text-xs h-2" />
                                        </FormItem>
                                    )}
                                />

                                {/* Product Photo */}
                                <FormField
                                    control={form.control}
                                    name="product_image"
                                    render={({ field: { onChange, value, ...field } }) => (
                                        <FormItem>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Label className="text-sm md:text-base">Product Photo</Label>
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        {...field}
                                                        onChange={(e) => {
                                                            handleImageChange(e);
                                                            onChange(e?.target?.files);
                                                        }}
                                                        className="w-full"
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-gray-500">Allow only images (600px width x 600px height) and max size 2MB.</p>
                                                {(imagePreview || existingImage) && (
                                                    <div className="mt-3 flex justify-center">
                                                        <img
                                                            src={imagePreview || existingImage}
                                                            alt="Product"
                                                            className="max-w-full max-h-48 object-contain"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <FormMessage className="text-xs h-2" />
                                        </FormItem>
                                    )}
                                />

                                {/* Batch Controlled */}
                                <FormField
                                    control={form.control}
                                    name="batch_controlled"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="grid grid-cols-1 gap-2">
                                                <Label className="text-sm md:text-base">Batch Controlled</Label>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={(value) => {
                                                            field.onChange(value);
                                                            if (value == "N") {
                                                                form.setValue("serialized", "N");
                                                            }
                                                        }}
                                                        value={field?.value || "N"}
                                                    >
                                                        <SelectTrigger className="input-focus-style">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="N">No</SelectItem>
                                                            <SelectItem value="Y">Yes</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </div>
                                            <FormMessage className="text-xs h-2" />
                                        </FormItem>
                                    )}
                                />

                                {/* Serialized - Only show if Batch Controlled == "Y" */}
                                {watchBatchControlled == "Y" && (
                                    <FormField
                                        control={form.control}
                                        name="serialized"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <Label className="text-sm md:text-base">Serialized</Label>
                                                    <FormControl>
                                                        <Select onValueChange={field.onChange} value={field?.value || "N"}>
                                                            <SelectTrigger className="input-focus-style">
                                                                <SelectValue placeholder="Select" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="N">No</SelectItem>
                                                                <SelectItem value="Y">Yes</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                </div>
                                                <FormMessage className="text-xs h-2" />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Gallery Upload Section */}
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <Label className="text-sm md:text-base">Upload Gallery Image/Video:</Label>
                                    <div
                                        className="border border-gray-300 rounded-md p-4 text-center"
                                        onDrop={handleDrop}
                                        onDragOver={(event) => event.preventDefault()}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-11 h-11 rounded-full bg-[#287F71] bg-opacity-10 flex items-center justify-center">
                                                <FileUp className="w-6 h-6 text-[#287F71]" />
                                            </div>
                                            <div className="text-sm">
                                                <label htmlFor="file-upload" className="cursor-pointer">
                                                    <span className="text-[#287F71] underline">Click Here</span> To Upload Your File On Drag.
                                                </label>
                                                <Input
                                                    type="file"
                                                    id="file-upload"
                                                    multiple
                                                    accept=".jpg,.png,.jpeg,.gif,.mp4,.webm,.ogg"
                                                    onChange={handleGalleryChange}
                                                    disabled={galleryFiles?.length + existingGallery?.length >= 5}
                                                    className="hidden"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Allow only images/videos (600px width x 600px height for images). Max file size is 2MB.
                                            </p>
                                        </div>

                                        {/* Gallery Files Display */}
                                        {(galleryFiles?.length > 0 || existingGallery?.length > 0) && (
                                            <div className="mt-4">
                                                <div className="grid grid-cols-5 gap-4">
                                                    {/* Existing Gallery */}
                                                    {existingGallery?.map((item) => (
                                                        <div key={item?.picture_id} className="relative w-24 h-24 border border-[#562a75] rounded overflow-hidden">
                                                            {item?.src?.endsWith?.(".mp4") || item?.src?.endsWith?.(".mkv") || item?.src?.endsWith?.(".ogg") ? (
                                                                <video
                                                                    src={item?.src || item?.picture_url}
                                                                    width="80"
                                                                    height="80"
                                                                    controls
                                                                    className="object-cover w-full h-full"
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={item?.src || item?.picture_url}
                                                                    alt="Gallery"
                                                                    className="object-cover w-full h-full"
                                                                />
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeExistingGalleryImage(item?.picture_id)}
                                                                disabled={isDeleting}
                                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {/* New Gallery Files */}
                                                    {galleryFiles?.map((fileObj, index) => (
                                                        <div key={index} className="relative w-24 h-24 border border-[#562a75] rounded flex items-center justify-center bg-gray-50">
                                                            {fileObj?.file?.type?.startsWith('video/') ? (
                                                                <video
                                                                    src={fileObj?.preview}
                                                                    width="80"
                                                                    height="80"
                                                                    controls
                                                                    className="object-cover w-full h-full rounded"
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={fileObj?.preview}
                                                                    alt="Preview"
                                                                    className="object-cover w-full h-full rounded"
                                                                />
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeGalleryFile(index)}
                                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                            <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] truncate px-1">
                                                                {fileObj?.file?.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="col-span-1 md:col-span-2">
                                            <div className="grid grid-cols-1 gap-2">
                                                <Label className="text-sm md:text-base">Product Description</Label>
                                                <FormControl>
                                                    <Textarea {...field} rows={3} className="input-focus-style" />
                                                </FormControl>
                                            </div>
                                            <FormMessage className="text-xs h-2" />
                                        </FormItem>
                                    )}
                                />

                                {/* Logistic Details Accordion */}
                                <div className="col-span-1 md:col-span-2">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem className="mb-2" value="logistics">
                                            <AccordionTrigger className="bg-[#4a5a6b] text-white hover:bg-[#4a5a6b]/90 py-4 px-6 rounded">
                                                Logistic Details
                                            </AccordionTrigger>
                                            <AccordionContent className="bg-white text-black py-4 px-6 rounded">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Length */}
                                                    <FormField
                                                        control={form.control}
                                                        name="vol_length"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    <Label className="text-sm md:text-base">{appConfig?.length_label || "Length"}</Label>
                                                                    <FormControl>
                                                                        <Input type="text" {...field} className="input-focus-style" />
                                                                    </FormControl>
                                                                </div>
                                                                <FormMessage className="text-xs h-2" />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {/* Breadth */}
                                                    <FormField
                                                        control={form.control}
                                                        name="vol_breath"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    <Label className="text-sm md:text-base">{appConfig?.breath_label || "Breadth"}</Label>
                                                                    <FormControl>
                                                                        <Input type="text" {...field} className="input-focus-style" />
                                                                    </FormControl>
                                                                </div>
                                                                <FormMessage className="text-xs h-2" />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {/* Height */}
                                                    <FormField
                                                        control={form.control}
                                                        name="vol_height"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    <Label className="text-sm md:text-base">{appConfig?.height_label || "Height"}</Label>
                                                                    <FormControl>
                                                                        <Input type="text" {...field} className="input-focus-style" />
                                                                    </FormControl>
                                                                </div>
                                                                <FormMessage className="text-xs h-2" />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {/* Weight */}
                                                    <FormField
                                                        control={form.control}
                                                        name="vol_weight"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    <Label className="text-sm md:text-base">{appConfig?.weight_label || "Weight"}</Label>
                                                                    <FormControl>
                                                                        <Input type="text" {...field} className="input-focus-style" />
                                                                    </FormControl>
                                                                </div>
                                                                <FormMessage className="text-xs h-2" />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                {/* Attributes - Only show if code_attr_based == "T" && productId == "" */}
                                                {codeAttrBased == "T" && !productId && watchCategoryId && (
                                                    <div className="mt-4">
                                                        {attributeList?.length > 0 ? (
                                                            <div className="space-y-4">
                                                                {attributeList?.map((attr) => {
                                                                    const isRequired = Object.values(codeActiveAttr || []).includes(attr?.attribute_id?.toString());
                                                                    return (
                                                                        <div key={attr?.attribute_id} className="space-y-2">
                                                                            <Label>
                                                                                {isRequired && <span className="text-red-500">*</span>}
                                                                                Default {attr?.attribute_name}
                                                                            </Label>
                                                                            {attr?.Type == 1 ? (
                                                                                <Input
                                                                                    type="text"
                                                                                    className="input-focus-style"
                                                                                    value={attributes?.[`Attr${attr?.attribute_id}[]`]?.[0] || ""}
                                                                                    onChange={(e) => {
                                                                                        setAttributes(prev => ({
                                                                                            ...prev,
                                                                                            [`Attr${attr?.attribute_id}[]`]: [e.target.value]
                                                                                        }));
                                                                                    }}
                                                                                />
                                                                            ) : attr?.Type == 3 ? (
                                                                                <Select
                                                                                    value={attributes?.[`Attr${attr?.attribute_id}[]`]?.[0]?.toString() || undefined}
                                                                                    onValueChange={(value) => {
                                                                                        setAttributes(prev => ({
                                                                                            ...prev,
                                                                                            [`Attr${attr?.attribute_id}[]`]: [value]
                                                                                        }));
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className="input-focus-style">
                                                                                        <SelectValue placeholder="select option" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="">select option</SelectItem>
                                                                                        {attr?.Masters?.map((option) => (
                                                                                            <SelectItem key={option?.ID} value={option?.ID?.toString()}>
                                                                                                {option?.N}
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            ) : null}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-4 p-4 bg-blue-50 rounded-md">
                                                                <p className="text-sm text-blue-800">No Attribute Found</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm sm:text-base"
                                    disabled={isSaving}
                                >
                                    {isSaving ? "Saving Product..." : "Save Product"}
                                </Button>
                            </div>
                        </form>
                    </Form>

                )}
            </DialogContent>
        </Dialog>
    );
};

export default ProductAddDialog;
