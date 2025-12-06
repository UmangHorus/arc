import api from "./api/axios";

const AUTHORIZE_KEY = process.env.NEXT_PUBLIC_API_AUTH_KEY || "";

export const ProductService = {
  // Get Product List with Filters
  getProductListsFilter: async (token) => {
    try {
      const response = await api.post(
        "/expo_access_api/getProductListsFilter/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete Product
  deleteProduct: async (token, productId) => {
    try {
      const response = await api.post(
        "/expo_access_api/getDeleteProduct/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
          product_id: productId,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Product Category List
  getProductCategoryList: async (token) => {
    try {
      const response = await api.post(
        "/expo_access_api/getProductCategoryLists/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Product Unit List
  getProductUnitList: async (token) => {
    try {
      const response = await api.post(
        "/expo_access_api/getProductUnitMaster/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Single Product Data
  getProductSingleData: async (token, productId) => {
    try {
      const response = await api.post(
        "/expo_access_api/getProductSingleData/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
          product_id: productId,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Save Product (Add/Edit)
  saveProduct: async (token, formData) => {
    try {
      // Ensure AUTHORIZEKEY and PHPTOKEN are appended if not already
      if (!formData.has("AUTHORIZEKEY")) {
        formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
      }
      if (!formData.has("PHPTOKEN")) {
        formData.append("PHPTOKEN", token);
      }

      const response = await api.post(
        "/expo_access_api/saveProducts/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Product Gallery
  getProductGallery: async (token, productId) => {
    try {
      const response = await api.post(
        "/expo_access_api/getProductGallary/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
          product_id: productId,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete Product Gallery Image
  deleteProductGalleryImage: async (token, productId, pictureId) => {
    try {
      const response = await api.post(
        "/expo_access_api/getDeleteProductGallary/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
          product_id: productId,
          picture_id: pictureId,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Save Gallery File
  saveGalleryFile: async (token, formData) => {
    try {
        if (!formData.has("AUTHORIZEKEY")) {
            formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
        }
        if (!formData.has("PHPTOKEN")) {
            formData.append("PHPTOKEN", token);
        }
      const response = await api.post(
        "/expo_access_api/savegalleryfile/",
        formData,
        {
            headers: {
              "Content-Type": "multipart/form-data",
            },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Attribute Master
  getAttributeMaster: async (token, categoryId) => {
    try {
      const response = await api.post(
        "/expo_access_api/getAttributeMaster/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          search_by: 1,
          category_id: categoryId,
          PHPTOKEN: token,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Check Product Code Existence
  checkProductCodeExist: async (token, productId, productCode) => {
    try {
      const response = await api.post(
        "/expo_access_api/productcodepresent/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
          product_id: productId,
          productcode: productCode,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Check Product Name Existence
  checkProductNameExist: async (token, productId, productName) => {
    try {
      const response = await api.post(
        "/expo_access_api/productnamepresent/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
          product_id: productId,
          productname: productName,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Category with Sub Category
  getCategoryWithSubCategory: async (token) => {
    try {
      const response = await api.post(
        "/expo_access_api/getCategoryWithSubCategory/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get Product Price List
  getProductPriceList: async (token) => {
    try {
      const response = await api.post(
        "/expo_access_api/productPriceListMaster/",
        {
          AUTHORIZEKEY: AUTHORIZE_KEY,
          PHPTOKEN: token,
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Download Product Excel
  downloadProductExcel: async (token, formData) => {
    try {
      // If formData is passed, append token if not present
      if (formData instanceof FormData) {
          if (!formData.has("AUTHORIZEKEY")) {
              formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
          }
          if (!formData.has("PHPTOKEN")) {
              formData.append("PHPTOKEN", token);
          }
          const response = await api.post(
              "/expo_access_api/downloadProductExcel",
              formData
          );
          return response.data;
      } else {
          // Fallback for old signature if needed, but we updated usage to pass FormData
          // Assuming usage is updated to pass FormData as per previous steps
          // If not, we might need to handle (token, category, selectAll) signature
          // But based on previous step, we updated usage to pass FormData.
          // Let's stick to the FormData implementation as it's cleaner
           const response = await api.post(
              "/expo_access_api/downloadProductExcel",
              formData
          );
          return response.data;
      }
    } catch (error) {
      throw error;
    }
  },

  // Save Import Products Price List
  saveImportProductsPriceList: async (token, formData) => {
    try {
      if (!formData.has("AUTHORIZEKEY")) {
        formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
      }
      if (!formData.has("PHPTOKEN")) {
        formData.append("PHPTOKEN", token);
      }
      const response = await api.post(
        "/expo_access_api/saveImportProductsPriceList/",
        formData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Save Import Products
  saveImportProducts: async (token, formData) => {
    try {
      if (!formData.has("AUTHORIZEKEY")) {
        formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
      }
      if (!formData.has("PHPTOKEN")) {
        formData.append("PHPTOKEN", token);
      }
      const response = await api.post(
        "/expo_access_api/saveimportproducts/",
        formData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default ProductService;
