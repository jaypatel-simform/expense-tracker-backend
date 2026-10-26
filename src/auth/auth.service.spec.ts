import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };

  beforeEach(async () => {
    jest.clearAllMocks();
    jwt.signAsync.mockResolvedValue('signed-token');
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  describe('signup', () => {
    it('hashes the password, issues a token and hides the hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }) => ({
        id: 'u1',
        defaultCurrency: 'USD',
        ...data,
      }));

      const res = await service.signup({
        email: 'a@b.com',
        password: 'password123',
        name: 'A',
      });

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', data.passwordHash)).toBe(true);
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'a@b.com',
      });
      expect(res.accessToken).toBe('signed-token');
      expect(res.user).not.toHaveProperty('passwordHash');
      expect(res.user.email).toBe('a@b.com');
    });

    it('rejects a duplicate email with Conflict', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(
        service.signup({ email: 'a@b.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash,
      });
      const res = await service.login({
        email: 'a@b.com',
        password: 'password123',
      });
      expect(res.accessToken).toBe('signed-token');
      expect(res.user).not.toHaveProperty('passwordHash');
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash,
      });
      await expect(
        service.login({ email: 'a@b.com', password: 'nope-nope' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'x@y.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
