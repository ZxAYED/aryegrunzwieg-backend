import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    // Generate a customer ID if not provided
    const count = await this.prisma.customer.count();
    const customerCode = `CUST-${count + 1}`;

    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        customerCode,
      },
    });
  }

  async findAll(params: { page?: number; limit?: number; search?: string }) {
    const { page, limit, search } = params;
    const { skip, take } = getPagination(page, limit, 0); // initial dummy call

    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { customerCode: { contains: search, mode: 'insensitive' } },
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    await this.findOne(id); // Ensure exists
    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }
}
