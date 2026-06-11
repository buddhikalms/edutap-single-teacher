import { apiRequest } from "@/api/client";
import type { ApiUser } from "@/types/api";

export type LoginResponse = {
  ok: true;
  token: string;
  expiresAt: string;
  user: ApiUser;
};

export function loginRequest(input: { email: string; password: string; apiUrl: string }) {
  return apiRequest<LoginResponse>("/api/mobile/auth/login", {
    method: "POST",
    apiUrl: input.apiUrl,
    token: null,
    body: {
      email: input.email,
      password: input.password
    }
  });
}
