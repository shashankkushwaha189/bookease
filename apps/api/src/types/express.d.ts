import { Tenant, User } from '../generated/client';

declare global {
    namespace Express {
        interface Request {
            tenant?: Tenant;
            tenantId?: string;
            user?: User;
        }
    }
}
