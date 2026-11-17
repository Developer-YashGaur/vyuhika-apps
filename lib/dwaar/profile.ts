import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ProfileInput } from "@/lib/dwaar/profile-form";

// Reading and saving a person's Dwaar profile. The database's row-level security makes sure a person
// can only touch their own row, even if this code had a bug.

type Db = SupabaseClient<Database>;

export type Profile = Database["public"]["Tables"]["dwaar_profiles"]["Row"];
export type CompanyOption = { id: string; name: string };
export type SaveResult = { ok: true } | { ok: false; message: string };

const GENERIC = "Something went wrong while saving. Please try again.";

// Turns a database error into a sentence a person can act on.
export function friendlyDbError(error: { code?: string; message?: string } | null): string {
  if (!error) return GENERIC;
  switch (error.code) {
    case "23514":
      if (error.message?.includes("work email")) {
        return "That email does not belong to the company you chose. Use your work email, like name@yourcompany.com. If your company is missing its email domain, write to support@vyuhika.com.";
      }
      if (error.message?.includes("linkedin") || error.message?.includes("phone") || error.message?.includes("links") || error.message?.includes("skills")) {
        return "One of your details is not in the right format. Please check your LinkedIn link, phone number, links and skills.";
      }
      return GENERIC;
    case "23505":
      return "That work email is already linked to another account.";
    case "23503":
      return "That company is no longer available. Please choose another.";
    case "42501":
      return "You are not allowed to do that. Please sign in again.";
    default:
      return GENERIC;
  }
}

export async function getMyProfile(supabase: Db, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("dwaar_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Could not load your profile.");
  return data;
}

// The dropdown list: id and name of active companies (the database view hides everything else).
export async function listCompanyOptions(supabase: Db): Promise<CompanyOption[]> {
  const { data, error } = await supabase.from("company_options").select("id, name").order("name");
  if (error) throw new Error("Could not load the company list.");
  const options: CompanyOption[] = [];
  for (const row of data ?? []) {
    if (row.id && row.name) options.push({ id: row.id, name: row.name });
  }
  return options;
}

// Creates the profile (isNew) or updates it. The consent version is stored only when the profile is created.
export async function saveMyProfile(
  supabase: Db,
  userId: string,
  input: ProfileInput,
  options: { isNew: boolean; consentVersion: string },
): Promise<SaveResult> {
  const fields = {
    display_name: input.displayName,
    headline: input.headline,
    is_candidate: input.isCandidate,
    is_provider: input.isProvider,
    provider_company_id: input.isProvider ? input.companyId : null,
    provider_work_email: input.isProvider ? input.workEmail : null,
    accepts_requests: input.isProvider && input.acceptsRequests,
    weekly_request_limit: input.weeklyLimit,
    linkedin_url: input.linkedinUrl,
    phone: input.phone,
    other_links: input.otherLinks,
    skills: input.skills,
  };

  const { error } = options.isNew
    ? await supabase.from("dwaar_profiles").insert({ ...fields, user_id: userId, consent_version: options.consentVersion })
    : await supabase.from("dwaar_profiles").update(fields).eq("user_id", userId);

  return error ? { ok: false, message: friendlyDbError(error) } : { ok: true };
}

export async function deleteMyProfile(supabase: Db, userId: string): Promise<SaveResult> {
  const { error } = await supabase.from("dwaar_profiles").delete().eq("user_id", userId);
  return error ? { ok: false, message: friendlyDbError(error) } : { ok: true };
}
