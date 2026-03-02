"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consentRepository = exports.ConsentRepository = void 0;
const prisma_1 = require("../../lib/prisma");
class ConsentRepository {
    async create(data) {
        return prisma_1.prisma.consentRecord.create({
            data
        });
    }
    async findLatest(tenantId, customerEmail) {
        return prisma_1.prisma.consentRecord.findFirst({
            where: { tenantId, customerEmail },
            orderBy: { givenAt: 'desc' }
        });
    }
}
exports.ConsentRepository = ConsentRepository;
exports.consentRepository = new ConsentRepository();
