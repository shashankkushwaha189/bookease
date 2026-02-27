export interface User {
    id: string;
    email: string;
    name?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

export interface AppConfig {
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
    databaseUrl: string;
    jwtSecret: string;
    corsOrigin: string;
}
