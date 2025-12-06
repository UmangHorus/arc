"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePunchStatus } from "@/hooks/usePunchStatus";
import { Button } from "@/components/ui/button";
import { punchService } from "@/lib/punchService";
import { usePunchStore } from "@/stores/punch.store";
import { useLoginStore } from "@/stores/auth.store";
import { Coffee, AlarmClock, Clock } from "lucide-react";

const PunchSystem = () => {
  const {
    punchIn,
    punchOut,
    breakIn,
    breakOut,
    attrId,
    breakId,
    setPunchIn,
    setPunchOut,
    setBreakIn,
    setBreakOut,
    setAttrId,
    setBreakId,
  } = usePunchStore();

  const queryClient = useQueryClient();
  const { user } = useLoginStore();
  const loggedInUserId = user?.id;

  const [punchInBtn, setPunchInBtn] = useState(false);
  const [breakInBtn, setBreakInBtn] = useState(false);
  const [breakOutBtn, setBreakOutBtn] = useState(false);

  const { refetch: getAttrID } = usePunchStatus(attrId);

  const punchInMutation = useMutation({
    mutationFn: async () => {
      return await punchService.employeePunchIn({
        employee_id: loggedInUserId,
        datetime: format(new Date(), "dd-MM-yy h:mm a"),
      });
    },
    onSuccess: (data) => {
      if (
        data &&
        data[0]?.STATUS == "success" &&
        data[0]?.MSG == "Punch in Successfully"
      ) {
        setAttrId(data[0]?.Id);
        setPunchOut(true);
        setPunchIn(false);
        setBreakIn(true);
        queryClient.refetchQueries({ queryKey: ["punchStatus"] });
        toast.success("Punch in Successfully!", {
          position: "top-right",
          duration: 3000,
        });
      } else {
        toast.error(
          "You have already PUNCHED OUT for the day. Punch IN is not allowed after Punch OUT",
          {
            position: "top-right",
            duration: 3000,
          }
        );
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error while punching in!", {
        position: "top-right",
        duration: 3000,
      });
    },
    onSettled: () => {
      setPunchInBtn(false);
    },
  });

  const breakInMutation = useMutation({
    mutationFn: async () => {
      return await punchService.employeeBreakInOut({
        att_id: attrId,
        break_type: "in",
        datetime: format(new Date(), "dd-MM-yy h:mm a"),
      });
    },
    onSuccess: (data) => {
      if (
        data &&
        data[0]?.STATUS === "success" &&
        data[0]?.MSG === "successfully Break in"
      ) {
        setBreakIn(false);
        setBreakOut(true);
        setBreakId(data[0]?.id_break);
        toast.success("Break in Successfully!", {
          position: "top-right",
          duration: 3000,
        });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error while breaking in!", {
        position: "top-right",
        duration: 3000,
      });
    },
    onSettled: () => {
      setBreakInBtn(false);
    },
  });

  const breakOutMutation = useMutation({
    mutationFn: async () => {
      return await punchService.employeeBreakInOut({
        id: breakId,
        att_id: attrId,
        break_type: "out",
        datetime: format(new Date(), "dd-MM-yy h:mm a"),
      });
    },
    onSuccess: (data) => {
      if (
        data &&
        data[0]?.STATUS === "success" &&
        data[0]?.MSG === "successfully Break out"
      ) {
        setBreakIn(true);
        setBreakOut(false);
        setBreakId(null);
        toast.success("Break out Successfully!", {
          position: "top-right",
          duration: 3000,
        });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error while breaking out!", {
        position: "top-right",
        duration: 3000,
      });
    },
    onSettled: () => {
      setBreakOutBtn(false);
    },
  });

  const handlePunchIn = async () => {
    try {
      setPunchInBtn(true);
      // No need to call checkAndRequestLocation here - punchService handles it internally
      punchInMutation.mutate();
    } catch (error) {
      toast.error(error.message, {
        position: "top-right",
        duration: 3000,
      });
      setPunchInBtn(false);
    }
  };

  const handleBreakIn = async () => {
    try {
      setBreakInBtn(true);
      // No location required for break-in
      breakInMutation.mutate();
    } catch (error) {
      toast.error(error.message || "Error while breaking in!", {
        position: "top-right",
        duration: 3000,
      });
      setBreakInBtn(false);
    }
  };

  const handleBreakOut = async () => {
    try {
      setBreakOutBtn(true);
      // No location required for break-out
      breakOutMutation.mutate();
    } catch (error) {
      toast.error(error.message || "Error while breaking out!", {
        position: "top-right",
        duration: 3000,
      });
      setBreakOutBtn(false);
    }
  };

  return (
    <div className="flex flex-nowrap gap-1.5">
      {punchIn && (
        <Button
          id="punchin"
          className="flex items-center gap-1.5 bg-[#287f71] hover:bg-[#20665a] text-white font-medium py-1.5 px-2 rounded-md text-xs"
          onClick={handlePunchIn}
          disabled={punchInBtn}
        >
          <Clock className="h-4 w-4" />
          {punchInBtn ? "Processing..." : "Punch-In"}
        </Button>
      )}

      {breakIn && (
        <Button
          className="flex items-center gap-1.5 bg-[#ec344c] hover:bg-[#d42f44] text-white font-medium py-1.5 px-2 rounded-md text-xs"
          onClick={handleBreakIn}
          disabled={breakInBtn}
        >
          <Coffee className="h-4 w-4" />
          {breakInBtn ? "Processing..." : "Break-In"}
        </Button>
      )}

      {breakOut && (
        <Button
          className="flex items-center gap-1.5 bg-[#ec344c] hover:bg-[#d42f44] text-white font-medium py-1.5 px-2 rounded-md text-xs"
          onClick={handleBreakOut}
          disabled={breakOutBtn}
        >
          <AlarmClock className="h-4 w-4" />
          {breakOutBtn ? "Processing..." : "Break-Out"}
        </Button>
      )}
    </div>
  );
};

export default PunchSystem;