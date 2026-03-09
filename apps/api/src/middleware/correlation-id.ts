import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

    // Set in response headers
    res.setHeader('x-correlation-id', correlationId);

    // Set correlation ID on request for logging
    (req as any).correlationId = correlationId;
    
    next();
};
