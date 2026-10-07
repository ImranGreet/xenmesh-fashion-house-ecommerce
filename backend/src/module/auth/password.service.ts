import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';

@Injectable()
export class PasswordService {
  constructor(
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async hash(password: string): Promise<string> {
    return this.passwordHasher.hash(password);
  }

  async verify(
    password: string,
    storedHash: string | undefined,
  ): Promise<boolean> {
    return this.passwordHasher.verify(password, storedHash);
  }

  needsRehash(storedHash: string): boolean {
    return this.passwordHasher.needsRehash(storedHash);
  }
}