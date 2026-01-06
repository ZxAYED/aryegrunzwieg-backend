import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { getPagination } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    // Get service base price if amount not provided
    let amount = createOrderDto.amount;
    if (amount === undefined) {
      const service = await this.prisma.service.findUnique({
        where: { id: createOrderDto.serviceId },
      });
      if (!service) throw new NotFoundException('Service not found');
      amount = Number(service.basePrice);
    }

    const count = await this.prisma.order.count();
    const orderNumber = `ORD-${1284 + count}`;

    const { addressId, ...rest } = createOrderDto;

    return this.prisma.order.create({
      data: {
        ...rest,
        amount,
        orderNumber,
        status: OrderStatus.PENDING_CONFIRMATION,
        ...(addressId ? { address: { connect: { id: addressId } } } : {}),
      } as unknown as Prisma.OrderCreateInput,
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: OrderStatus;
    customerId?: string;
    technicianId?: string;
    from?: string;
    to?: string;
  }) {
    const { page, limit, search, status, customerId, technicianId, from, to } =
      params;
    const { skip, take } = getPagination(page, limit, 0);

    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(technicianId ? { technicianId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
              { service: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [totalItems, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, name: true } },
          technician: { select: { id: true, name: true } },
        },
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
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        service: true,
        technician: true,
        equipment: {
          include: { floors: true },
        },
        media: true,
        transactions: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    await this.findOne(id);

    const { addressId, ...rest } = updateOrderDto;

    return this.prisma.order.update({
      where: { id },
      data: {
        ...rest,
        ...(addressId ? { address: { connect: { id: addressId } } } : {}),
      } as Prisma.OrderUpdateInput,
    });
  }

  async confirm(id: string) {
    const order = await this.findOne(id);
    if (order.status !== OrderStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException('Order is not pending confirmation');
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CONFIRMED },
    });
  }

  async updateEquipment(id: string, dto: UpdateEquipmentDto) {
    await this.findOne(id);

    // Upsert equipment details
    const equipment = await this.prisma.orderEquipmentSnapshot.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        manufacturer: dto.manufacturer,
        modelNumber: dto.modelNumber,
        serialNumber: dto.serialNumber,
        systemType: dto.systemType,
      },
      update: {
        manufacturer: dto.manufacturer,
        modelNumber: dto.modelNumber,
        serialNumber: dto.serialNumber,
        systemType: dto.systemType,
      },
    });

    if (dto.floors) {
      // Replace floors
      await this.prisma.orderEquipmentFloorInlet.deleteMany({
        where: { snapshotId: equipment.id },
      });

      if (dto.floors.length > 0) {
        await this.prisma.orderEquipmentFloorInlet.createMany({
          data: dto.floors.map((f) => ({
            snapshotId: equipment.id,
            floorName: f.floorName,
            inletCount: f.inletCount,
          })),
        });
      }
    }

    return this.findOne(id);
  }

  async addMedia(id: string, dto: CreateMediaDto) {
    await this.findOne(id);
    return this.prisma.orderMedia.create({
      data: {
        orderId: id,
        ...dto,
        // Added missing fields to satisfy type
        bucket: 'orders', // Default bucket
        objectKey: `${id}/${Date.now()}`, // Dummy key
      },
    });
  }

  async getTransactions(id: string) {
    await this.findOne(id);
    return this.prisma.transaction.findMany({
      where: { orderId: id },
      orderBy: { date: 'desc' },
    });
  }
}
