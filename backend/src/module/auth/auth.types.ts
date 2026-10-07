export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'ADMIN';
}

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: AdminUser;
  }
}
