/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { getPagination } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { uploadFileToSupabase } from '../utils/supabase/uploadFileToSupabase';
import {
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
} from './dto/customer-address.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

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

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    file?: UploadedImageFile,
  ) {
    const existing = await this.prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    return this.updateCustomerRecord(existing.id, updateCustomerDto, file);
  }

  async updateByUserId(
    userId: string,
    updateCustomerDto: UpdateCustomerDto,
    file?: UploadedImageFile,
  ) {
    const existing = await this.prisma.customer.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    return this.updateCustomerRecord(existing.id, updateCustomerDto, file);
  }

  // Address CRUD helpers
  async listAddresses(customerId: string) {
    await this.ensureCustomerExists(customerId);

    return this.prisma.address.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAddress(customerId: string, dto: CreateCustomerAddressDto) {
    await this.ensureCustomerExists(customerId);

    const { isDefault, ...data } = dto;
    const createData = {
      ...data,
      ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
    };

    if (isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });

        return tx.address.create({
          data: {
            ...createData,
            customerId,
            isDefault: true,
          },
        });
      });
    }

    return this.prisma.address.create({
      data: {
        ...createData,
        customerId,
      },
    });
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found for this customer');
    }

    const { isDefault, ...data } = dto;
    const updateData = {
      ...data,
      ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
    };

    if (isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { customerId, NOT: { id: addressId } },
          data: { isDefault: false },
        });

        return tx.address.update({
          where: { id: addressId },
          data: { ...updateData, isDefault: true },
        });
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: updateData,
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
      // select: {
      //   id: true,
      //   label: true,
      //   addressLine: true,
      //   apartment: true,
      //   city: true,
      //   state: true,
      //   zip: true,
      // }
    });
  }

  async createAddressByUserId(userId: string, dto: CreateCustomerAddressDto) {
    const customerId = await this.getCustomerIdByUserId(userId);
    const { isDefault, ...data } = dto;
    const createData = {
      ...data,
      ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
    };

    if (isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });

        return tx.address.create({
          data: {
            ...createData,
            customerId,
            isDefault: true,
          },
        });
      });
    }

    return this.prisma.address.create({
      data: {
        ...createData,
        customerId,
      },
    });
  }

  async updateAddressByUserId(
    userId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    const customerId = await this.getCustomerIdByUserId(userId);
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found for this customer');
    }

    const { isDefault, ...data } = dto;
    const updateData = {
      ...data,
      ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
    };

    if (isDefault) {
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { customerId, NOT: { id: addressId } },
          data: { isDefault: false },
        });

        return tx.address.update({
          where: { id: addressId },
          data: { ...updateData, isDefault: true },
        });
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: updateData,
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
    updateCustomerDto: UpdateCustomerDto,
    file?: UploadedImageFile,
  ) {
    const { addressLine, apartment, city, state, zip, ...customerData } =
      updateCustomerDto;
    let profileImage: string | undefined;

    if (file) {
      const upload = await uploadFileToSupabase(
        file,
        this.configService,
        'customers',
      );
      profileImage = upload.fileUrl;
    }

    const addressUpdate: {
      addressLine?: string;
      apartment?: string;
      city?: string;
      state?: string;
      zip?: string;
    } = {};

    if (addressLine !== undefined) addressUpdate.addressLine = addressLine;
    if (apartment !== undefined) addressUpdate.apartment = apartment;
    if (city !== undefined) addressUpdate.city = city;
    if (state !== undefined) addressUpdate.state = state;
    if (zip !== undefined) addressUpdate.zip = zip;

    const hasAddressPayload = Object.keys(addressUpdate).length > 0;

    return this.prisma.$transaction(async (tx) => {
      if (hasAddressPayload) {
        const defaultAddress = await tx.address.findFirst({
          where: { customerId, isDefault: true },
          select: { id: true },
        });

        if (defaultAddress) {
          await tx.address.updateMany({
            where: { customerId, NOT: { id: defaultAddress.id } },
            data: { isDefault: false },
          });

          await tx.address.update({
            where: { id: defaultAddress.id },
            data: { ...addressUpdate, isDefault: true },
          });
        } else if (addressLine && city && state && zip) {
          await tx.address.updateMany({
            where: { customerId },
            data: { isDefault: false },
          });

          await tx.address.create({
            data: {
              addressLine,
              apartment,
              city,
              state,
              zip,
              customerId,
              isDefault: true,
            },
          });
        }
      }

      return tx.customer.update({
        where: { id: customerId },
        data: {
          ...customerData,
          ...(profileImage ? { profileImage } : {}),
        },
        include: { addresses: true },
      });
    });
  }
}

type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
};
