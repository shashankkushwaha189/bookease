"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const prisma_1 = require("../../lib/prisma");
const errors_1 = require("../../lib/errors");
class CustomerController {
    async list(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
            const customers = await prisma_1.prisma.customer.findMany({
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
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const tenantId = req.headers['x-tenant-id'];
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
