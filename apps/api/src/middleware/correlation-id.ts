import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { storage } from '@bookease/logger';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

    // Set in response headers
    res.setHeader('x-correlation-id', correlationId);

    // Run the rest of the request within the AsyncLocalStorage context
    storage.run({ correlationId }, () => {
        next();
    });
};
