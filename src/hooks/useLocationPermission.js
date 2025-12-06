import { requestLocationPermission, getCurrentLocation } from "@/utils/location";
import { useCallback } from "react";

const useLocationPermission = () => {
  const checkAndRequestLocation = useCallback(async (context = "operation") => {
    try {
      const permission = await requestLocationPermission();
      
      if (permission === "denied") {
        throw new Error(
          `Location access is required for ${context}. Please enable location permissions in your browser settings.`
        );
      }
      
      // Get fresh location every time - no caching
      const location = await getCurrentLocation();
      return location;
    } catch (error) {
      throw error;
    }
  }, []);

  return checkAndRequestLocation;
};

export default useLocationPermission;