"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const prisma_1 = require("../../lib/prisma");
const env_1 = require("../../config/env");
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const errors_1 = require("../../lib/errors");
class AuthService {
    saltRounds = 12;
    async login(tenantId, input) {
        // Since schema doesn't have tenantSlug in User, we check if user exists in that tenant
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                tenantId,
                email: input.email,
            }
        });
        if (!user || !user.passwordHash) {
            throw new errors_1.AppError('Invalid credentials', 401, 'UNAUTHORIZED');
        }
        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isValid) {
            throw new errors_1.AppError('Invalid credentials', 401, 'UNAUTHORIZED');
        }
        const token = jwt.sign({
            sub: user.id, // Using 'sub' to match AuthMiddleware expected decoded token
            role: user.role,
            tenantId: user.tenantId
        }, env_1.env.JWT_SECRET, { expiresIn: '24h' });
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId
            }
        };
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
