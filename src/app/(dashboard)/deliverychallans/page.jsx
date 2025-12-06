"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DeliveryChallansIndexRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace("/deliverychallans/planning");
  }, [router]);
  return null;
};

export default DeliveryChallansIndexRedirect;


