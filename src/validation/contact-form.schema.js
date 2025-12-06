import { z } from "zod";

export const createContactFormSchema = (appConfig, stateList = []) => {
  const validStateCodes = [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "10",
    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
    "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
    "31", "32", "33", "34", "35", "36", "37",
    "38", // Ladakh
    "97", // Other Territory
    "99"  // Centre Jurisdiction
  ];

  return z
    .object({
      title: z.string().trim().min(1, "Title is required"),
      name: z
        .string()
        .trim()
        .min(1, "Name is required")
        .regex(/^[A-Za-z\s]+$/, "Name should only contain letters"),
      routes: z.array(z.string()).default([]),
      Email:
        appConfig?.contact_required_email === "Y"
          ? z
              .string()
              .trim()
              .min(1, "Email is required")
              .email("Invalid email address")
          : z
              .string()
              .trim()
              .optional()
              .refine(
                (value) =>
                  !value ||
                  (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
                    z.string().email().safeParse(value).success),
                { message: "Invalid email address" }
              ),
      mobile: z
        .string()
        .trim()
        .min(10, "Mobile number must be 10 digits")
        .max(10, "Mobile number must be 10 digits")
        .regex(/^\d+$/, "Only numbers are allowed"),
      address:
        appConfig?.required_add1 === "Y"
          ? z.string().trim().min(1, "Address is required")
          : z.string().trim().optional(),
      area:
        appConfig?.contact_required_area === "Y"
          ? z.string().trim().min(1, "Area is required")
          : z.string().trim().optional(),
      pincode:
        appConfig?.required_pincode === "Y"
          ? z
              .string()
              .trim()
              .min(1, "Pincode is required")
              .regex(/^\d{6}$/, "Pincode must be 6 digits")
          : z
              .string()
              .trim()
              .regex(/^\d{0,6}$/, "Pincode must be up to 6 digits")
              .optional(),
      city:
        appConfig?.contact_required_city === "Y"
          ? z.string().trim().min(1, "City is required")
          : z.string().trim().optional(),
      industry: z.string().trim().optional(),
      country: z.string().trim().min(1, "Country is required"),
      state: z.string().trim().min(1, "State is required"),
      registrationType: z.enum(["1", "2", "3", "4"]).optional(),
      gstno: z.string().trim().optional(),
      panno: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
      const gst = data.gstno?.trim();
      const pan = data.panno?.trim();

      if (gst) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        if (gst.length !== 15 || !gstRegex.test(gst)) {
          ctx.addIssue({
            path: ["gstno"],
            message: "GSTIN must be 15 characters with valid format",
          });
        } else {
          const stateCode = gst.substring(0, 2);
          if (!validStateCodes.includes(stateCode)) {
            ctx.addIssue({
              path: ["gstno"],
              message: "Invalid GST state code",
            });
          }

          if (!data.state?.trim()) {
            ctx.addIssue({
              path: ["gstno"],
              message: "Please select State first before entering GST Number",
            });
          } else if (stateList?.length > 0) {
            const selectedState = stateList.find(
              (s) => s.state_name === data.state
            );
            if (
              selectedState &&
              selectedState.state_code &&
              selectedState.state_code !== stateCode
            ) {
              ctx.addIssue({
                path: ["gstno"],
                message: "GST state code must match the selected state",
              });
            }
          }

          if (pan && gst.substring(2, 12) !== pan) {
            ctx.addIssue({
              path: ["panno"],
              message: "PAN must match the middle 10 characters of GSTIN",
            });
          }
        }
      }

      if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
        ctx.addIssue({
          path: ["panno"],
          message: "PAN must be 10 characters in valid format (e.g., AABCU9603R)",
        });
      }
    });
};