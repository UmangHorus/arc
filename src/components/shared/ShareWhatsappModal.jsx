"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import OrderProcessingService from "@/lib/OrderProcessingService";
import { useLoginStore } from "@/stores/auth.store";

const ShareWhatsappModal = ({
  open,
  onOpenChange,
  shareParams,
  setIsSharing,
  companyDetails,
}) => {
  const { token } = useLoginStore();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && shareParams) {
      fetchSubordinates();
    }
    return () => {
      if (!open) {
        setContacts([]);
        setSelectedContact(null);
        setLoading(false);
      }
    };
  }, [open, shareParams]);

  const fetchSubordinates = async () => {
    try {
      const response = await OrderProcessingService.getSubordinateContactRawcontact({
        token,
        contactId: shareParams.contact_id,
        contactType: shareParams.contact_type || "",
      });

      const responseData = Array.isArray(response) ? response[0] : response;

      if (responseData?.STATUS == "SUCCESS") {
        const contactList = [
          {
            id: shareParams.contact_id,
            type: shareParams.contact_type || "",
            name: shareParams.contact_name || "Unknown",
            mobile_no: shareParams.mobile_no || "",
          },
          ...(responseData?.DATA || []).map((sub) => ({
            id: sub.subordinate_id,
            type: sub.type || "",
            name: sub.name || "Unknown",
            mobile_no: sub.mobile_no || "",
          })),
        ].filter((contact) => contact.mobile_no);

        setContacts(contactList);
      } else {
        const originalContact = {
          id: shareParams.contact_id,
          type: shareParams.contact_type || "",
          name: shareParams.contact_name || "Unknown",
          mobile_no: shareParams.mobile_no || "",
        };
        setContacts(originalContact.mobile_no ? [originalContact] : []);
        toast.error("Failed to fetch subordinate contacts");
      }
    } catch (error) {
      const originalContact = {
        id: shareParams.contact_id,
        type: shareParams.contact_type || "",
        name: shareParams.contact_name || "Unknown",
        mobile_no: shareParams.mobile_no || "",
      };
      setContacts(originalContact.mobile_no ? [originalContact] : []);
      toast.error("Error fetching subordinate contacts");
      console.error(error);
    }
  };

  const handleSelectChange = (value) => {
    const selected = contacts.find((contact) => contact.id == value);
    setSelectedContact(selected);
  };

  const handleSend = async () => {
    if (!selectedContact) {
      toast.error("Please select a contact");
      return;
    }

    if (!companyDetails?.iswhatsappwebon) {
      toast.error("WhatsApp web module is not on");
      return;
    }

    if (!companyDetails?.WA_WEB_INSTANCEID) {
      toast.error("Instance ID for transaction is not set");
      return;
    }

    if (!selectedContact.mobile_no) {
      toast.error("Mobile number is not available");
      return;
    }

    setIsSharing((prev) => ({
      ...prev,
      [shareParams.rowId]: true,
    }));

    setLoading(true);

    try {
      const response = await OrderProcessingService.shareTemplateViaWhatsApp({
        token,
        transactionId: shareParams.transaction_id,
        transactionType: shareParams.transaction_type,
        templateId: shareParams.template_id,
        contactId: selectedContact.id,
        contactType: selectedContact.type || "",
        mobileNo: selectedContact.mobile_no,
        mobileIsdNo: shareParams.mobile_isd_no || "",
      });

      const result = Array.isArray(response) ? response[0] : response;

      if (result?.STATUS == "SUCCESS") {
        if (result?.DATA?.whatspp?.status == "error") {
          throw new Error(result?.DATA?.whatspp?.msg);
        }

        const successMessage =
          shareParams.transaction_type == "25"
            ? `DC shared successfully to ${selectedContact.name} (${selectedContact.mobile_no})!`
            : shareParams.transaction_type == "22"
              ? `Invoice shared successfully to ${selectedContact.name} (${selectedContact.mobile_no})!`
              : `Message sent successfully to ${selectedContact.name} (${selectedContact.mobile_no})!`;

        toast.success(successMessage);
        onOpenChange(false);
      } else {
        throw new Error("API response status is not SUCCESS");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to share via WhatsApp. Please try again.";
      toast.error(errorMessage);
      console.error(errorMessage);
    } finally {
      setIsSharing((prev) => ({
        ...prev,
        [shareParams.rowId]: false,
      }));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle>Share via WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {contacts.length == 0 ? (
            <p>No valid WhatsApp numbers available.</p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="contactSelect">
                Choose a single WhatsApp number to send message
              </Label>
              <Select
                value={selectedContact?.id?.toString() || ""}
                onValueChange={handleSelectChange}
              >
                <SelectTrigger id="contactSelect" className="w-full bg-white">
                  <SelectValue placeholder="Choose a WhatsApp number" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id.toString()}>
                      {`${contact.name} ${contact.type == 1
                        ? "(C)"
                        : contact.type == 6
                          ? "(RC)"
                          : ""
                        } (${contact.mobile_no})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || !selectedContact}
            className="px-6 bg-[#287F71] hover:bg-[#1a5c4d] text-white"
          >
            {loading ? "Sending..." : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareWhatsappModal;

