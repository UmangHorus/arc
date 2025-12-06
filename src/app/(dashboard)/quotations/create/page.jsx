"use client";
// src/app/(dashboard)/leads/create/page.jsx
import CreateQuotationPage from "@/components/quotation/CreateQuotationPage";
import Loading from "@/components/ui/Loading";
import { Suspense } from "react";

const Page = () => {
  return (
    <>
      <Suspense fallback={<Loading />}>
        <CreateQuotationPage />
      </Suspense>
    </>
  );
};

export default Page;
