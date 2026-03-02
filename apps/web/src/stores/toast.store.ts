import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastState {
    toasts: Toast[];
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
    info: (msg: string) => void;
    dismiss: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],

    success: (msg) => addToast(set, get, 'success', msg),
    error: (msg) => addToast(set, get, 'error', msg),
    warning: (msg) => addToast(set, get, 'warning', msg),
    info: (msg) => addToast(set, get, 'info', msg),

    dismiss: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));

function addToast(
    set: any,
    get: any,
    type: ToastType,
    message: string
) {
    const id = `toast-${++toastCounter}`;
    const newToast = { id, type, message };

    set((state: ToastState) => ({
        toasts: [...state.toasts, newToast]
    }));

    // Auto-dismiss after 4s
    setTimeout(() => {
        get().dismiss(id);
    }, 4000);
}
