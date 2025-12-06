"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import ContactDetails from "@/components/contacts/ContactDetails";
import { useLoginStore } from "@/stores/auth.store";

export default function ContactDetailsPage({ params }) {
  const resolvedParams = use(params);
  const { contactId } = resolvedParams;
  const searchParams = useSearchParams();
  const contactType = searchParams.get("type");

  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">{contactLabel} Details</h1>
      <ContactDetails contactId={contactId} contactType={contactType} />
    </div>
  );
}
