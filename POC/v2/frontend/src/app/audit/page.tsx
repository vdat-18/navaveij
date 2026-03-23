import { redirect } from "next/navigation";

export default function AuditPage() {
  // Legacy alias route kept for old bookmarks and deep links after page merge.
  redirect("/access-monitoring");
}
