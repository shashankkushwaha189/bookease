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
      
      const customers = await prisma.customer.findMany({
        where: {
          tenantId: tenantId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: customers
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
          id: req.params.id,
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
          id: req.params.id,
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
          id: req.params.id,
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
