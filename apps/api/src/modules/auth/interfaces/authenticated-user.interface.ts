export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  workspaceId: string;
  organizationId: string;
  role: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  workspaceId: string;
  organizationId: string;
  role: string;
}
