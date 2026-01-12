import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, TechnicianStatus } from '@prisma/client';
import { getPagination } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { CreateSpecializationDto } from './dto/create-specialization.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async createSpecialization(dto: CreateSpecializationDto) {
    const name = this.normalizeText(dto.name, 'name');
    const existing = await this.prisma.specialization.findFirst({
      where: { name: { equals: name, mode: Prisma.QueryMode.insensitive } },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Specialization already exists');
    }

    return this.prisma.specialization.create({
      data: { name },
    });
  }

  async listSpecializations(search?: string) {
    const trimmed = search?.trim();
    return this.prisma.specialization.findMany({
      where: trimmed
        ? { name: { contains: trimmed, mode: Prisma.QueryMode.insensitive } }
        : {},
      orderBy: { name: 'asc' },
    });
  }

  async getSpecialization(id: string) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id },
    });
    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }
    return specialization;
  }

  async deleteSpecialization(id: string) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    await this.prisma.specialization.delete({
      where: { id },
    });

    return { success: true, id };
  }

  async create(createTechnicianDto: CreateTechnicianDto) {
    const name = this.normalizeText(createTechnicianDto.name, 'name');
    const email = this.normalizeEmail(createTechnicianDto.email);
    const phone = createTechnicianDto.phone?.trim();
    const status = createTechnicianDto.status ?? TechnicianStatus.OFFLINE;
    const specializationIds = this.normalizeSpecializationIds(
      createTechnicianDto.specializationIds,
    );
    await this.ensureSpecializationsExist(specializationIds);

    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: Prisma.QueryMode.insensitive } },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const existingTech = await this.prisma.technician.findFirst({
      where: { email: { equals: email, mode: Prisma.QueryMode.insensitive } },
      select: { id: true },
    });
    if (existingTech) {
      throw new ConflictException('Technician already exists');
    }

    const passwordHash = await bcrypt.hash(
      createTechnicianDto.password,
      12,
    );

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: Role.TECHNICIAN,
          isVerified: true,
        },
        select: { id: true },
      });

      const technician = await tx.technician.create({
        data: {
          userId: user.id,
          name,
          email,
          phone,
          status,
          isVerified: true,
          ...(specializationIds.length
            ? {
                specializations: {
                  create: specializationIds.map((id) => ({
                    specialization: {
                      connect: { id },
                    },
                  })),
                },
              }
            : {}),
        },
        include: {
          specializations: {
            include: { specialization: true },
          },
        },
      });

      return this.flattenTechnician(technician);
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: TechnicianStatus;
    verified?: boolean;
  }) {
    const { page, limit, search, status, verified } = params;
    const { skip, take } = getPagination(page, limit, 0);

    const where: Prisma.TechnicianWhereInput = {
      ...(status ? { status } : {}),
      ...(verified !== undefined ? { isVerified: verified } : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                email: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          }
        : {}),
    };

    const [totalItems, data] = await Promise.all([
      this.prisma.technician.count({ where }),
      this.prisma.technician.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          specializations: {
            include: { specialization: true },
          },
        },
      }),
    ]);

    const pagination = getPagination(page, limit, totalItems);

    return {
      data: data.map((technician) => this.flattenTechnician(technician)),
      meta: pagination.meta,
    };
  }

  async findOne(id: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id },
      include: {
        specializations: {
          include: { specialization: true },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    return this.flattenTechnician(technician);
  }

  async update(id: string, updateTechnicianDto: UpdateTechnicianDto) {
    const existing = await this.prisma.technician.findUnique({
      where: { id },
      select: { id: true, userId: true, email: true },
    });
    if (!existing) {
      throw new NotFoundException('Technician not found');
    }

    const data: {
      name?: string;
      email?: string;
      phone?: string;
      status?: TechnicianStatus;
      isVerified?: boolean;
    } = {};

    if (updateTechnicianDto.name !== undefined) {
      data.name = this.normalizeText(updateTechnicianDto.name, 'name');
    }

    if (updateTechnicianDto.email !== undefined) {
      const email = this.normalizeEmail(updateTechnicianDto.email);
      const duplicate = await this.prisma.technician.findFirst({
        where: {
          email: { equals: email, mode: Prisma.QueryMode.insensitive },
          NOT: { id },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException('Email already in use');
      }
      data.email = email;
    }

    if (updateTechnicianDto.phone !== undefined) {
      data.phone = updateTechnicianDto.phone?.trim();
    }

    if (updateTechnicianDto.status !== undefined) {
      data.status = updateTechnicianDto.status;
    }

    if (updateTechnicianDto.isVerified !== undefined) {
      data.isVerified = updateTechnicianDto.isVerified;
    }

    const specializationIds = this.normalizeSpecializationIds(
      updateTechnicianDto.specializationIds,
    );
    if (updateTechnicianDto.specializationIds) {
      await this.ensureSpecializationsExist(specializationIds);
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.email && existing.userId) {
        const userDuplicate = await tx.user.findFirst({
          where: {
            email: { equals: data.email, mode: Prisma.QueryMode.insensitive },
            NOT: { id: existing.userId },
          },
          select: { id: true },
        });
        if (userDuplicate) {
          throw new ConflictException('Email already in use');
        }

        await tx.user.update({
          where: { id: existing.userId },
          data: { email: data.email },
        });
      }

      if (
        updateTechnicianDto.isVerified !== undefined &&
        existing.userId
      ) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { isVerified: updateTechnicianDto.isVerified },
        });
      }

      const technician = await tx.technician.update({
        where: { id },
        data: {
          ...data,
          ...(updateTechnicianDto.specializationIds
            ? {
                specializations: {
                  deleteMany: {},
                  ...(specializationIds.length
                    ? {
                        create: specializationIds.map((id) => ({
                          specialization: {
                            connect: { id },
                          },
                        })),
                      }
                    : {}),
                },
              }
            : {}),
        },
        include: {
          specializations: {
            include: { specialization: true },
          },
        },
      });

      return this.flattenTechnician(technician);
    });
  }

  async remove(id: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    return this.prisma.$transaction(async (tx) => {
      if (technician.userId) {
        await tx.user.update({
          where: { id: technician.userId },
          data: { isDeleted: true },
        });
      }

      await tx.technician.delete({
        where: { id: technician.id },
      });

      return { success: true, id: technician.id };
    });
  }

  private normalizeText(value: string, field: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${field} must not be empty`);
    }
    return normalized;
  }

  private normalizeEmail(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException('email must not be empty');
    }
    return normalized;
  }

  private normalizeSpecializationIds(value?: string[]) {
    if (!value) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException(
        'specializationIds must be an array of strings',
      );
    }

    const seen = new Set<string>();
    const result: string[] = [];

    for (const item of value) {
      if (typeof item !== 'string') {
        continue;
      }
      const trimmed = item.trim();
      if (!trimmed) {
        continue;
      }
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(trimmed);
      }
    }

    return result;
  }

  private flattenTechnician(technician: {
    specializations?: { specialization: { id: string; name: string } }[];
  }) {
    const { specializations, ...rest } = technician;
    return {
      ...rest,
      specializations: specializations?.map((item) => item.specialization) ?? [],
    };
  }

  private async ensureSpecializationsExist(ids: string[]) {
    if (ids.length === 0) {
      return;
    }

    const existing = await this.prisma.specialization.count({
      where: { id: { in: ids } },
    });

    if (existing !== ids.length) {
      throw new BadRequestException('Invalid specializationIds');
    }
  }
}
