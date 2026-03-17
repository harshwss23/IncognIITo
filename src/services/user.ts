import { fetchJsonWithAuth } from "./auth";

export type UserProfile = {
  id: number;
  email: string;
  displayName: string;
  verified: boolean;
  interests: string[];
  avatarUrl: string;
  totalChats: number;
  totalReports: number;
  rating: number;
  isBanned: boolean;
};

export type UpdateUserProfileInput = {
  displayName?: string;
  interests?: string[];
  avatarUrl?: string;
};

type ApiUserProfile = {
  id: number;
  email: string;
  display_name: string | null;
  verified: boolean;
  interests: string[] | null;
  avatar_url: string | null;
  total_chats: number | null;
  total_reports: number | null;
  rating: string | number | null;
  is_banned: boolean | null;
};

type UserProfileResponse = {
  success: boolean;
  data: { user: ApiUserProfile };
};

function mapUserProfile(apiUser: ApiUserProfile): UserProfile {
  return {
    id: apiUser.id,
    email: apiUser.email,
    displayName: apiUser.display_name ?? apiUser.email,
    verified: apiUser.verified,
    interests: apiUser.interests ?? [],
    avatarUrl: apiUser.avatar_url ?? "",
    totalChats: apiUser.total_chats ?? 0,
    totalReports: apiUser.total_reports ?? 0,
    rating: apiUser.rating ? Number(apiUser.rating) : 0,
    isBanned: Boolean(apiUser.is_banned),
  };
}

export async function getUserProfile(): Promise<UserProfile> {
  const response = await fetchJsonWithAuth<UserProfileResponse>("/api/users/profile");
  return mapUserProfile(response.data.user);
}

export async function updateUserProfile(payload: UpdateUserProfileInput): Promise<void> {
  await fetchJsonWithAuth("/api/users/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
