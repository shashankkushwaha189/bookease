export class AppError extends Error {
    constructor(
        public message: string,
        public status: number = 500,
        public code: string = 'INTERNAL_SERVER_ERROR',
        public details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
