// Re-export the compatibility hook from authStore so existing callers
// (Header, etc.) continue to work without changes.
export { useAuth } from "@/store/authStore";
