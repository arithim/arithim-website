// Shared by the brain (tool schema) and the webhook (banner). Kept tiny so the webhook does not bundle the knowledge pack.
export const MESSAGE_TYPES = ["enquiry", "meeting_request", "partnership", "press", "job_seeker", "vendor_pitch", "research", "speaking", "support_issue", "billing_query", "supplier_query", "do_not_contact", "privacy_request", "abuse_report", "distress", "other"];
export const UNVERIFIED_TYPES = new Set(["billing_query", "supplier_query"]);
export const DETAIL_KEYS = ["invoice_number", "company", "amount", "invoice_date", "preferred_times", "product"];
// ElevenLabs system tools we are willing to pass back. transfer_to_number etc. are deliberately absent.
export const PASS_THROUGH = new Set(["transfer_to_agent", "end_call", "skip_turn"]);

