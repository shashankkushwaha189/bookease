import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';

export class CustomerController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
      }
      
      const { page = 1, limit = 10, search, tags } = req.query as any;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;
      
      const whereClause: any = {
        tenantId
      };
      
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        whereClause.tags = {
          hasSome: tagArray
        };
      }
      
      const customers = await prisma.customer.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limitNum
      });

      const total = await prisma.customer.count({
        where: whereClause
      });

      res.json({
        success: true,
        data: {
          items: customers,
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
      }
      
      const customer = await prisma.customer.findFirst({
        where: {
          id: req.params.id as string,
          tenantId: tenantId
        }
      });

      if (!customer) {
        return next(new AppError('Customer not found', 404, 'NOT_FOUND'));
      }

      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
      }
      
      const customer = await prisma.customer.create({
        data: {
          ...req.body,
          tenantId: tenantId
        }
      });

      res.status(201).json({
        success: true,
        data: customer
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
      }
      
      const customer = await prisma.customer.update({
        where: {
          id: req.params.id as string,
          tenantId: tenantId
        },
        data: req.body
      });

      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
      }
      
      await prisma.customer.delete({
        where: {
          id: req.params.id as string,
          tenantId: tenantId
        }
      });

      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
