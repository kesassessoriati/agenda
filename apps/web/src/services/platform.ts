import { api } from "../lib/api";
import type { CompanyPlan, PlatformCompanyDetail, PlatformCompanyOverview } from "../types";

export async function fetchPlatformCompanies() {
  const { data } = await api.get<{ companies: PlatformCompanyOverview[] }>("/platform/companies");
  return data;
}

export async function fetchPlatformCompanyDetails(companyId: string) {
  const { data } = await api.get<{ company: PlatformCompanyDetail }>(`/platform/companies/${companyId}`);
  return data;
}

export async function createPlatformCompany(payload: {
  companyName: string;
  companySlug?: string;
  timezone?: string;
  plan: CompanyPlan;
  planExpiresAt?: string | null;
  ownerName?: string;
  ownerEmail: string;
  ownerPassword?: string;
}) {
  const { data } = await api.post<{ company: PlatformCompanyDetail }>("/platform/companies", payload);
  return data;
}

export async function updatePlatformCompany(
  companyId: string,
  payload: {
    companyName?: string;
    companySlug?: string;
    timezone?: string;
    plan?: CompanyPlan;
    planExpiresAt?: string | null;
  },
) {
  const { data } = await api.patch<{ company: PlatformCompanyDetail }>(`/platform/companies/${companyId}`, payload);
  return data;
}

export async function deletePlatformCompany(companyId: string) {
  const { data } = await api.delete<{ success: boolean }>(`/platform/companies/${companyId}`);
  return data;
}
