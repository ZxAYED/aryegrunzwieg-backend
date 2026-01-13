import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ServiceStatus } from '@prisma/client';
import { getPagination } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createServiceDto: CreateServiceDto) {
    const name = this.normalizeText(createServiceDto.name, 'name');
    const category = this.normalizeText(createServiceDto.category, 'category');
    const basePrice = this.normalizeBasePrice(createServiceDto.basePrice);
    const commonIssues = this.normalizeIssues(createServiceDto.commonIssues);
    const status = createServiceDto.status ?? ServiceStatus.ACTIVE;
    const specializationId = this.normalizeOptionalId(
      createServiceDto.specializationId,
      'specializationId',
    );
    const specializationIds = this.normalizeSpecializationIds(
      createServiceDto.specializationIds,
    );

    if (commonIssues.length === 0) {
      throw new BadRequestException('commonIssues must not be empty');
    }

    await this.ensureSpecializationsExist(
      [specializationId, ...specializationIds].filter(
        (id): id is string => Boolean(id),
      ),
    );

    const duplicate = await this.prisma.service.findFirst({
      where: {
        name: { equals: name, mode: Prisma.QueryMode.insensitive },
        category: { equals: category, mode: Prisma.QueryMode.insensitive },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException(
        'Service with the same name and category already exists',
      );
    }

    const service = await this.prisma.service.create({
      data: {
        name,
        category,
        basePrice,
        commonIssues,
        status,
        ...(specializationId ? { specializationId } : {}),
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

    return this.flattenService(service);
  }

  async findAll(params: {
    search?: string;
    status?: ServiceStatus;
    category?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }) {
    const { search, status, category, page, limit, includeInactive } = params;
    const trimmedSearch = search?.trim();
    const trimmedCategory = category?.trim();

    const where: Prisma.ServiceWhereInput = {
      ...(status ? { status } : {}),
      ...(!status && !includeInactive ? { status: ServiceStatus.ACTIVE } : {}),
      ...(trimmedCategory
        ? {
            category: {
              equals: trimmedCategory,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
      ...(trimmedSearch
        ? {
            name: {
              contains: trimmedSearch,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };

    const usePagination = Number(page) > 0 || Number(limit) > 0;
    if (!usePagination) {
      const data = await this.prisma.service.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        include: {
          specializations: {
            include: { specialization: true },
          },
        },
      });

      return data.map((service) => this.flattenService(service));
    }

    const totalItems = await this.prisma.service.count({ where });
    const { skip, take, meta } = getPagination(page, limit, totalItems);
    const data = await this.prisma.service.findMany({
      where,
      skip,
      take,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        specializations: {
          include: { specialization: true },
        },
      },
    });

    return {
      data: data.map((service) => this.flattenService(service)),
      meta,
    };
  }

  async findOne(id: string, includeInactive = false) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        specializations: {
          include: { specialization: true },
        },
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (!includeInactive && service.status !== ServiceStatus.ACTIVE) {
      throw new NotFoundException('Service not found');
    }
    return this.flattenService(service);
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    const existing = await this.prisma.service.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Service not found');

    const data: {
      name?: string;
      category?: string;
      basePrice?: number;
      commonIssues?: string[];
      status?: ServiceStatus;
      specializationId?: string | null;
    } = {};

    if (updateServiceDto.name !== undefined) {
      data.name = this.normalizeText(updateServiceDto.name, 'name');
    }

    if (updateServiceDto.category !== undefined) {
      data.category = this.normalizeText(updateServiceDto.category, 'category');
    }

    if (updateServiceDto.basePrice !== undefined) {
      data.basePrice = this.normalizeBasePrice(updateServiceDto.basePrice);
    }

    if (updateServiceDto.commonIssues !== undefined) {
      const issues = this.normalizeIssues(updateServiceDto.commonIssues);
      if (issues.length === 0) {
        throw new BadRequestException('commonIssues must not be empty');
      }
      data.commonIssues = issues;
    }

    if (updateServiceDto.status !== undefined) {
      data.status = updateServiceDto.status;
    }

    if (updateServiceDto.specializationId !== undefined) {
      data.specializationId = this.normalizeOptionalId(
        updateServiceDto.specializationId,
        'specializationId',
      );
      await this.ensureSpecializationsExist(
        data.specializationId ? [data.specializationId] : [],
      );
    }

    const specializationIds = this.normalizeSpecializationIds(
      updateServiceDto.specializationIds,
    );
    if (updateServiceDto.specializationIds) {
      await this.ensureSpecializationsExist(specializationIds);
    }

    if (data.name || data.category) {
      const nextName = data.name ?? existing.name;
      const nextCategory = data.category ?? existing.category;
      const duplicate = await this.prisma.service.findFirst({
        where: {
          name: { equals: nextName, mode: Prisma.QueryMode.insensitive },
          category: {
            equals: nextCategory,
            mode: Prisma.QueryMode.insensitive,
          },
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          'Service with the same name and category already exists',
        );
      }
    }

    const service = await this.prisma.service.update({
      where: { id },
      data: {
        ...data,
        ...(updateServiceDto.specializationIds
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

    return this.flattenService(service);
  }

  async remove(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!service) throw new NotFoundException('Service not found');

    if (service._count.orders > 0) {
      return this.prisma.service.update({
        where: { id },
        data: { status: ServiceStatus.INACTIVE },
      });
    }

    return this.prisma.service.delete({
      where: { id },
    });
  }

  private normalizeText(value: string, field: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${field} must not be empty`);
    }
    return normalized;
  }

  private normalizeBasePrice(value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('basePrice must be greater than 0');
    }
    return value;
  }

  private normalizeIssues(value: string[]) {
    if (!Array.isArray(value)) {
      throw new BadRequestException('commonIssues must be an array of strings');
    }

    const seen = new Set<string>();
    const issues: string[] = [];

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
        issues.push(trimmed);
      }
    }

    return issues;
  }

  private normalizeOptionalId(value: string | undefined, field: string) {
    if (value === undefined || value === null) {
      return undefined;
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${field} must not be empty`);
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

  private flattenService(service: {
    specializations?: { specialization: { id: string; name: string } }[];
  }) {
    const { specializations, ...rest } = service;
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
