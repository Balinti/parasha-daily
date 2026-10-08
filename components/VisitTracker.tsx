"use client";

import { useEffect } from "react";
import { recordVisit } from "@/lib/visits";

/** Renders nothing; counts the visit once the page is open. */
export default function VisitTracker() {
  useEffect(() => {
    recordVisit();
  }, []);
  return null;
}
