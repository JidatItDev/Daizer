export type role = "admin" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: role;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  userLoggedIn: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: (message?: string) => void;
}
