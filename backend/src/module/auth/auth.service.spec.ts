import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../database/prisma.service.js';
import type { SignInService } from '@nestjs/authentication';
import type { PasswordService } from './password.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const user = {
    id: 1,
    email: 'admin@example.com',
    passwordHash: 'encoded-password',
    firstName: 'Store',
    lastName: 'Admin',
    role: UserRole.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let service: AuthService;
  let findUnique: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let verify: ReturnType<typeof vi.fn>;
  let needsRehash: ReturnType<typeof vi.fn>;
  let hash: ReturnType<typeof vi.fn>;
  let signIn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    findUnique = vi.fn().mockResolvedValue(user);
    update = vi.fn().mockResolvedValue(user);
    verify = vi.fn().mockResolvedValue(true);
    needsRehash = vi.fn().mockReturnValue(false);
    hash = vi.fn().mockResolvedValue('new-password-hash');
    signIn = vi.fn().mockResolvedValue(undefined);

    const prisma = {
      user: { findUnique, update },
    } as unknown as PrismaService;
    const passwordService = {
      verify,
      needsRehash,
      hash,
    } as unknown as PasswordService;
    const signInService = { signIn } as unknown as SignInService;

    service = new AuthService(prisma, passwordService, signInService);
  });

  it('signs an admin in without returning their password hash', async () => {
    const result = await service.signIn({
      email: ' ADMIN@example.com ',
      password: 'correct-password',
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@example.com' },
    });
    expect(signIn).toHaveBeenCalledWith('1', { method: 'password' });
    expect(result.user).toEqual({
      id: '1',
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: UserRole.ADMIN,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('upgrades old password hashes after a successful sign in', async () => {
    needsRehash.mockReturnValue(true);

    await service.signIn({
      email: user.email,
      password: 'correct-password',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { passwordHash: 'new-password-hash' },
    });
  });

  it('rejects non-admin users with the same credential error', async () => {
    findUnique.mockResolvedValue({ ...user, role: UserRole.CUSTOMER });

    await expect(
      service.signIn({ email: user.email, password: 'correct-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('performs a dummy password verification when the email is unknown', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      service.signIn({ email: user.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).toHaveBeenCalledWith('wrong-password', undefined);
  });

  it('rejects malformed credentials before querying users', async () => {
    await expect(service.signIn({ email: 'invalid', password: 'pass' })).rejects
      .toBeInstanceOf(BadRequestException);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
