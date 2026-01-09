import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerAddressDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

 
  async findAll(params: { page?: number; limit?: number; search?: string }) {
    const { page, limit, search } = params;
    const { skip, take } = getPagination(page, limit, 0); 

    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { firstName: { startsWith: search, mode: 'insensitive' } },
            { lastName: { startsWith: search, mode: 'insensitive' } },
            { email: { startsWith: search, mode: 'insensitive' } },
            { phone: { startsWith: search, mode: 'insensitive' } },
            { customerCode: { startsWith: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [totalItems, data] = await Promise.all([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { orders: true } },
          orders: {
            select: { amount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Calculate total spent manually or via aggregation
    const enrichedData = data.map((customer) => {
      const totalSpent = customer.orders.reduce(
        (sum, order) => sum + Number(order.amount),
        0,
      );
     
      const { orders, ...rest } = customer;
      return { ...rest, totalSpent };
    });

    const pagination = getPagination(page, limit, totalItems);

    return {
      data: enrichedData,
      meta: pagination.meta,
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { service: true, technician: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const totalSpent = customer.orders.reduce(
      (sum, order) => sum + Number(order.amount),
      0,
    );

    return { ...customer, totalSpent };
  }

  async findByUserId(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      include: { addresses: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    return this.updateCustomerRecord(
      existing.id,
      existing.userId ?? null,
      updateCustomerDto,
    );
  }

  async updateByUserId(userId: string, updateCustomerDto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    return this.updateCustomerRecord(
      existing.id,
      existing.userId ?? null,
      updateCustomerDto,
    );
  }

  // Address CRUD helpers
  async listAddresses(customerId: string) {
    await this.ensureCustomerExists(customerId);

    return this.prisma.address.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAddress(customerId: string, dto: CustomerAddressDto) {
    await this.ensureCustomerExists(customerId);

    return this.prisma.address.create({
      data: {
        ...dto,
        customerId,
      },
    });
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: CustomerAddressDto,
  ) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found for this customer');
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddress(customerId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
      select: { id: true },
    });

    if (!address) {
      throw new NotFoundException('Address not found for this customer');
    }

    await this.prisma.address.delete({
      where: { id: addressId },
    });

    return { success: true };
  }

  async listAddressesByUserId(userId: string) {
    const customerId = await this.getCustomerIdByUserId(userId);
    return this.prisma.address.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAddressByUserId(userId: string, dto: CustomerAddressDto) {
    const customerId = await this.getCustomerIdByUserId(userId);
    return this.prisma.address.create({
      data: {
        ...dto,
        customerId,
      },
    });
  }

  async updateAddressByUserId(
    userId: string,
    addressId: string,
    dto: CustomerAddressDto,
  ) {
    const customerId = await this.getCustomerIdByUserId(userId);
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found for this customer');
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddressByUserId(userId: string, addressId: string) {
    const customerId = await this.getCustomerIdByUserId(userId);
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
      select: { id: true },
    });

    if (!address) {
      throw new NotFoundException('Address not found for this customer');
    }

    await this.prisma.address.delete({
      where: { id: addressId },
    });

    return { success: true };
  }

  private async ensureCustomerExists(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
  }

  private async getCustomerIdByUserId(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer.id;
  }

  private async updateCustomerRecord(
    customerId: string,
    userId: string | null,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    const { email, ...customerData } = updateCustomerDto;

    return this.prisma.$transaction(async (tx) => {
      if (email && userId) {
        await tx.user.update({
          where: { id: userId },
          data: { email },
        });
      }

      return tx.customer.update({
        where: { id: customerId },
        data: {
          ...customerData,
          ...(email ? { email } : {}),
        },
        include: { addresses: true },
      });
    });
  }
}
