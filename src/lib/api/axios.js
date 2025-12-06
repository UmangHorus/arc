import axios from "axios";

const API_CONFIG = {
  FALLBACK_1: process.env.NEXT_PUBLIC_API_BASE_URL_FALLBACK,
  FALLBACK_2: process.env.NEXT_PUBLIC_API_BASE_URL_FALLBACK_2,
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_API,
};

// Create axios instance with fallback URL from the start
const api = axios.create({
  baseURL: API_CONFIG.FALLBACK_1,
  timeout: 60000, // 60 seconds
});

// Track initialization state
let isInitialized = false;
let initializationPromise = null;
let currentBaseURL = API_CONFIG.FALLBACK_1;

async function fetchConnectionLink() {
  try {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", process.env.NEXT_PUBLIC_API_AUTH_KEY);
    formData.append("PHPTOKEN", process.env.NEXT_PUBLIC_PHP_TOKEN);
    formData.append(
      "hostName",
      typeof window !== "undefined" ? window.location.hostname : ""
    );

    const response = await axios.post(
      `${API_CONFIG.ADMIN}/expo_access_api/getconnection`,
      formData,
      { timeout: 8000 } // Increased timeout
    );

    if (response.data?.STATUS === "SUCCESS" && response.data?.DATA) {
      let domain = response.data.DATA.trim();
      if (!/^https?:\/\//i.test(domain)) {
        domain = `https://${domain}`;
      }
      console.log("Fetched dynamic API URL:", domain);
      return domain;
    }
    return API_CONFIG.FALLBACK_1;
  } catch (error) {
    console.error("Failed to fetch connection URL:", error);
    return API_CONFIG.FALLBACK_1;
  }
}

async function initializeApi() {
  if (typeof window === "undefined") {
    return API_CONFIG.FALLBACK_1;
  }

  const { hostname } = window.location;
  const isLocalOrDev =
    hostname.includes(".vercel.app") ||
    hostname === "34.93.160.102" ||
    hostname === "localhost";

  if (isLocalOrDev || !API_CONFIG.ADMIN) {
    console.log("Using fallback URL for local/dev environment");
    currentBaseURL = API_CONFIG.FALLBACK_1;
    return API_CONFIG.FALLBACK_1;
  }

  try {
    const dynamicUrl = await fetchConnectionLink();
    currentBaseURL = dynamicUrl;
    api.defaults.baseURL = dynamicUrl;
    console.log("API base URL set to:", dynamicUrl);
    return dynamicUrl;
  } catch (error) {
    console.error("Failed to initialize API URL:", error);
    currentBaseURL = API_CONFIG.FALLBACK_1;
    api.defaults.baseURL = API_CONFIG.FALLBACK_1;
    return API_CONFIG.FALLBACK_1;
  }
}

// Enhanced initialization with retry mechanism
function ensureInitialized() {
  if (isInitialized) {
    return Promise.resolve(currentBaseURL);
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  if (typeof window === "undefined") {
    return Promise.resolve(API_CONFIG.FALLBACK_1);
  }

  initializationPromise = initializeApi()
    .then((url) => {
      isInitialized = true;
      return url;
    })
    .catch((error) => {
      console.error("API initialization failed:", error);
      // Reset promise so it can be retried
      initializationPromise = null;
      isInitialized = false;
      return API_CONFIG.FALLBACK_1;
    });

  return initializationPromise;
}

// Force re-initialization (useful for testing or manual reset)
function resetInitialization() {
  isInitialized = false;
  initializationPromise = null;
  currentBaseURL = API_CONFIG.FALLBACK_1;
  api.defaults.baseURL = API_CONFIG.FALLBACK_1;
}

// Get current base URL without triggering initialization
function getCurrentBaseURL() {
  return currentBaseURL;
}

// Enhanced request interceptor
api.interceptors.request.use(
  async (config) => {
    try {
      // Always ensure initialization before making requests
      const baseURL = await ensureInitialized();

      // Update the config with the current base URL
      if (baseURL && baseURL !== config.baseURL) {
        config.baseURL = baseURL;
      }

      if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      }

      return config;
    } catch (error) {
      console.error("Request interceptor error:", error);
      // Fallback to default behavior
      return config;
    }
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with better fallback handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If request failed and we haven't already retried with fallback
    if (error.response?.status >= 400 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log(
        "API request failed, switching to fallback URL:",
        API_CONFIG.FALLBACK_1
      );

      // Update both the api instance and current tracking
      currentBaseURL = API_CONFIG.FALLBACK_1;
      api.defaults.baseURL = API_CONFIG.FALLBACK_1;
      originalRequest.baseURL = API_CONFIG.FALLBACK_1;

      try {
        return await api(originalRequest);
      } catch (retryError) {
        console.error("Fallback request also failed:", retryError);
        return Promise.reject(retryError);
      }
    }

    return Promise.reject(error);
  }
);

// Enhanced API wrapper for consistent usage across your app
const apiService = {
  // GET request
  get: async (url, config = {}) => {
    await ensureInitialized();
    return api.get(url, config);
  },

  // POST request
  post: async (url, data, config = {}) => {
    await ensureInitialized();
    return api.post(url, data, config);
  },

  // PUT request
  put: async (url, data, config = {}) => {
    await ensureInitialized();
    return api.put(url, data, config);
  },

  // DELETE request
  delete: async (url, config = {}) => {
    await ensureInitialized();
    return api.delete(url, config);
  },

  // PATCH request
  patch: async (url, data, config = {}) => {
    await ensureInitialized();
    return api.patch(url, data, config);
  },
};

export default api;
export {
  ensureInitialized,
  resetInitialization,
  getCurrentBaseURL,
  apiService,
  API_CONFIG,
};
