"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerController = exports.CustomerController = void 0;
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
class CustomerController {
    async list(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            if (!tenantId) {
                throw new errors_1.AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
            }
            const { page = 1, limit = 10, search, tags } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            const whereClause = {
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
            const customers = await prisma_1.prisma.customer.findMany({
                where: whereClause,
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limitNum
            });
            const total = await prisma_1.prisma.customer.count({
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
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            if (!tenantId) {
                throw new errors_1.AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
            }
            const customer = await prisma_1.prisma.customer.findFirst({
                where: {
                    id: req.params.id,
                    tenantId: tenantId
                }
            });
            if (!customer) {
                return next(new errors_1.AppError('Customer not found', 404, 'NOT_FOUND'));
            }
            res.json({
                success: true,
                data: customer
            });
        }
        catch (error) {
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            if (!tenantId) {
                throw new errors_1.AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
            }
            const customer = await prisma_1.prisma.customer.create({
                data: {
                    ...req.body,
                    tenantId: tenantId
                }
            });
            res.status(201).json({
                success: true,
                data: customer
            });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            if (!tenantId) {
                throw new errors_1.AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
            }
            const customer = await prisma_1.prisma.customer.update({
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
        }
        catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            if (!tenantId) {
                throw new errors_1.AppError('Tenant ID required', 400, 'MISSING_TENANT_ID');
            }
            await prisma_1.prisma.customer.delete({
                where: {
                    id: req.params.id,
                    tenantId: tenantId
                }
            });
            res.json({
                success: true,
                message: 'Customer deleted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CustomerController = CustomerController;
exports.customerController = new CustomerController();
