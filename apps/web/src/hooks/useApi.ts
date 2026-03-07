import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Lazy imports out of global scope avoiding circular evaluation mapping
        const { useAuthStore } = await import('../stores/auth.store');
        const { useTenantStore } = await import('../stores/tenant.store');

        // 1. Inject Authentication
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }

        // 2. Inject Multi-Tenant ID
        const tenantId = useTenantStore.getState().tenantId;
        if (tenantId) {
            config.headers.set('X-Tenant-ID', tenantId);
        }

        // 3. Inject Correlation Tracing UUID
        config.headers.set('X-Correlation-ID', uuidv4());

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const { useAuthStore } = await import('../stores/auth.store');
        const { useToastStore } = await import('../stores/toast.store');

        const { logout } = useAuthStore.getState();
        const { error: triggerError } = useToastStore.getState();

        if (error.response) {
            const status = error.response.status;

            switch (status) {
                case 401:
                    logout();
                    triggerErrorToast('Your session has expired. Please login again.');
                    break;
                case 403:
                    triggerErrorToast('Access denied: You do not have permission for this action.');
                    break;
                case 422:
                case 400:
                    const serverMsg = error.response.data?.error?.message;
                    if (serverMsg) triggerErrorToast(serverMsg);
                    break;
                case 500:
                case 502:
                case 503:
                case 504:
                    triggerErrorToast('Something went wrong on our end. Please try again later.');
                    break;
                default:
                    triggerErrorToast('Network error: Unable to reach the servers.');
                    break;
            }
        } else {
            triggerErrorToast('Network error: Unable to reach the servers.');
        }

        return Promise.reject(error);
    }
);

/**
 * Extracted strongly-typed fetch helpers capturing <T> payload shapes natively
 */
const api = {
    get: <T>(url: string, params?: object) =>
        axiosInstance.get<T>(url, { params }),

    post: <T>(url: string, body?: unknown, config?: any) =>
        axiosInstance.post<T>(url, body, config),

    patch: <T>(url: string, body?: unknown) =>
        axiosInstance.patch<T>(url, body),

    put: <T>(url: string, body?: unknown) =>
        axiosInstance.put<T>(url, body),

    delete: <T>(url: string) =>
        axiosInstance.delete<T>(url),
};

export default api;
