export const NAVAVEJ_BASE_URL = "https://navavej.com";

/** URL for a health checkup package page, e.g. "Premium" → /health-checkup/premium */
export function getPackageUrl(tier: string): string {
  const slug = tier.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `${NAVAVEJ_BASE_URL}/health-checkup/${slug}`;
}

/** URL for a specific service/add-on page, e.g. "ECG-01" → /services/ecg-01 */
export function getServiceUrl(itemCode: string): string {
  const slug = itemCode.toLowerCase().replace(/[^a-z0-9]/g, "-");
  return `${NAVAVEJ_BASE_URL}/services/${slug}`;
}
