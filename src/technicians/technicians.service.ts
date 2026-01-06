import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TechnicianStatus } from '@prisma/client';
import { getPagination } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';

@Injectable()
export class TechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTechnicianDto: CreateTechnicianDto) {
    const { specializations, ...rest } = createTechnicianDto;

    return this.prisma.technician.create({
      data: {
        ...rest,
        specializations: {
          create: specializations?.map((spec) => ({
            specialization: {
              connectOrCreate: {
                where: { name: spec },
                create: { name: spec },
              },
            },
          })),
        },
      },
      include: {
        specializations: {
          include: { specialization: true },
        },
      },
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
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
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
      }),
    ]);

    const pagination = getPagination(page, limit, totalItems);

    return {
      data,
      meta: pagination.meta,
    };
  }

  async findOne(id: string) {
    const technician = await this.prisma.technician.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!technician) {
      throw new NotFoundException('Technician not found');
    }

    return technician;
  }

  async update(id: string, updateTechnicianDto: UpdateTechnicianDto) {
    await this.findOne(id);
    const { specializations, ...rest } = updateTechnicianDto;

    return this.prisma.technician.update({
      where: { id },
      data: {
        ...rest,
        ...(specializations
          ? {
              specializations: {
                deleteMany: {},
                create: specializations.map((spec) => ({
                  specialization: {
                    connectOrCreate: {
                      where: { name: spec },
                      create: { name: spec },
                    },
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
  }

  async verify(id: string) {
    await this.findOne(id);
    return this.prisma.technician.update({
      where: { id },
      data: { isVerified: true },
    });
  }
}
