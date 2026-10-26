import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  defaultCurrency: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  update(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, defaultCurrency: dto.defaultCurrency },
      select: PUBLIC_SELECT,
    });
  }
}
