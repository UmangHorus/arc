import { z } from "zod";

export const createProductFormSchema = () => {
  return z.object({
    category_id: z.string().trim().min(1, "Category is required"),
    product_name: z.string().trim().min(1, "Product Name is required"),
    product_code: z.string().trim().optional(),
    unit_id: z.string().trim().min(1, "Unit is required"),
    price: z.string().trim().min(1, "Price is required"),
    mrp_price: z.string().trim().optional(),
    description: z.string().trim().optional(),
    hsn_code: z.string().trim().optional().refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Allow empty
        // HSN code should be numeric and 4, 6, or 8 digits
        const numericRegex = /^\d+$/;
        if (!numericRegex.test(val)) return false;
        const length = val.length;
        return length === 4 || length === 6 || length === 8;
      },
      {
        message: "HSN/SAC Code must be 4, 6, or 8 digits",
      }
    ),
    batch_controlled: z.enum(["Y", "N"]).default("N"),
    serialized: z.enum(["Y", "N"]).default("N"),
    child_categories: z.preprocess(
      (val) => {
        if (!Array.isArray(val)) return [];
        // Accept both array of numbers/strings (from MultiSelect) or array of objects (from API)
        return val.map(item => {
          if (typeof item === 'object' && item !== null) {
            // Already in {value, label} format - extract value
            return item.value?.toString() || item.category_id?.toString();
          }
          // Keep as string to match Select component format
          return item?.toString();
        }).filter(item => item);
      },
      z.array(z.string()).default([])
    ),
    vol_length: z.string().trim().optional(),
    vol_breath: z.string().trim().optional(),
    vol_height: z.string().trim().optional(),
    vol_weight: z.string().trim().optional(),
    product_image: z.any().optional(),
  });
};
