import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { RegisterInput } from '../validators/auth';

const BCRYPT_ROUNDS = 10;

export const userService = {
  async createUser(data: RegisterInput) {
    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    
    return prisma.user.create({
      data: {
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        password: hashedPassword,
      },
    });
  },

  async findByPhone(phone: string) {
    return prisma.user.findUnique({
      where: { phone },
    });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async validatePassword(plainPassword: string, hashedPassword: string) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  async updateOnlineStatus(id: string, isOnline: boolean) {
    return prisma.user.update({
      where: { id },
      data: {
        isOnline,
        lastSeen: new Date(),
      },
    });
  },

  async updateProfile(id: string, data: {
    firstName?: string;
    lastName?: string;
    username?: string;
    bio?: string;
    avatar?: string;
  }) {
    return prisma.user.update({
      where: { id },
      data,
    });
  },
};
