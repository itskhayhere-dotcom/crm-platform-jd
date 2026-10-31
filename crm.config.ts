/**
 * crm.config.ts — the single source of truth for what this CRM collects.
 *
 * Everything client-specific lives here: the pipeline stages, their labels and order,
 * the fields on each stage, and the fields on a client record. The website and the
 * mobile app both RENDER from this file, and the API VALIDATES against it, so to fit a
 * new client you edit this config — not the UI and not the backend.
 *
 * For per-client / multi-tenant setups, expose `getConfig(orgId)` that returns a
 * different CrmConfig per organization; the API and forms already accept a config.
 */

import type { CrmConfig } from "./packages/core/src/types";

export const crmConfig: CrmConfig = {
  product: "Jabal Dreams · Project Desk",
  currency: "OMR",

  // Fields stored on the client record itself (not stage-specific).
  clientFields: [
    { key: "name", label: "Company", type: "text", required: true },
    { key: "contact", label: "Contact person", type: "text" },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "email", label: "Email", type: "email" },
    {
      key: "division",
      label: "Division",
      type: "select",
      options: ["Construction", "Events", "Interiors"],
    },
    { key: "location", label: "Location", type: "text" },
  ],

  // The pipeline. Order here is the order shown in the UI.
  // Each stage's `fields` define the form for that stage.
  stages: [
    {
      key: "enquiry",
      label: "New enquiry",
      description: "Fresh requests from clients.",
      fields: [
        { key: "requirement", label: "What does the client need?", type: "textarea", required: true },
        { key: "value", label: "Estimated value", type: "currency" },
        { key: "source", label: "How did they find us?", type: "select",
          options: ["Website", "Referral", "Repeat client", "Walk-in", "Other"] },
        { key: "handler", label: "Handled by", type: "text" },
      ],
    },
    {
      key: "quotation",
      label: "Quotation",
      description: "Quote prepared and sent.",
      fields: [
        { key: "quoteNo", label: "Quotation no.", type: "text" },
        { key: "amount", label: "Quoted amount", type: "currency", required: true },
        { key: "status", label: "Status", type: "select",
          options: ["Preparing quotation", "Sent to client", "Under negotiation", "Revised quotation sent"] },
        { key: "sentTo", label: "Sent to", type: "text" },
      ],
    },
    {
      key: "ongoing",
      label: "Ongoing project",
      fields: [
        { key: "contractValue", label: "Contract value", type: "currency", required: true },
        { key: "progress", label: "Work completed (%)", type: "number" },
        { key: "startDate", label: "Start date", type: "date" },
      ],
    },
    {
      key: "hold",
      label: "On hold",
      fields: [{ key: "holdReason", label: "On hold because", type: "textarea", required: true }],
    },
    {
      key: "completed",
      label: "Completed",
      fields: [{ key: "completedDate", label: "Completed on", type: "date" }],
    },
    {
      key: "cancelled",
      label: "Cancelled",
      fields: [
        { key: "from", label: "Cancelled from", type: "select", options: ["Enquiry", "Quotation", "Ongoing"] },
        { key: "reason", label: "Reason", type: "textarea", required: true },
      ],
    },
  ],
};

export default crmConfig;
