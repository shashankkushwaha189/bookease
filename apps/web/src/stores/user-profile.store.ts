import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/auth';
import { authApi } from '../api/auth';

interface UserProfileState {
  user: User | null;
  isLoading: boolean;
  isUpdating: boolean;
  updateError: string | null;
  
  // Actions
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    timezone?: string;
    language?: string;
    notifications?: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  }) => Promise<void>;
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  deleteAvatar: () => Promise<void>;
  deactivateAccount: (password: string) => Promise<void>;
  clearUser: () => void;
  refreshUser: () => Promise<void>;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isUpdating: false,
      updateError: null,

      setUser: (user) => set({ user }),

      updateUser: (updates) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      updateProfile: async (data) => {
        set({ isUpdating: true, updateError: null });
        try {
          const response = await authApi.updateProfile(data) as any;
          
          if (response.data?.success) {
            const updatedUser = response.data.data.user;
            get().setUser(updatedUser);
            set({ updateError: null });
          } else {
            throw new Error(response.data?.message || 'Failed to update profile');
          }
        } catch (error: any) {
          console.error('Profile update error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to update profile';
          set({ updateError: errorMessage });
          throw error;
        } finally {
          set({ isUpdating: false });
        }
      },

      changePassword: async (data) => {
        set({ isUpdating: true, updateError: null });
        try {
          const response = await authApi.changePassword(data) as any;
          
          if (response.data?.success) {
            set({ updateError: null });
          } else {
            throw new Error(response.data?.message || 'Failed to change password');
          }
        } catch (error: any) {
          console.error('Password change error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to change password';
          set({ updateError: errorMessage });
          throw error;
        } finally {
          set({ isUpdating: false });
        }
      },

      uploadAvatar: async (file: File) => {
        set({ isUpdating: true, updateError: null });
        try {
          const formData = new FormData();
          formData.append('avatar', file);
          
          const response = await authApi.uploadAvatar(formData) as any;
          
          if (response.data?.success) {
            const avatarUrl = response.data.data.avatarUrl;
            get().updateUser({ avatar: avatarUrl });
            set({ updateError: null });
            return avatarUrl;
          } else {
            throw new Error(response.data?.message || 'Failed to upload avatar');
          }
        } catch (error: any) {
          console.error('Avatar upload error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to upload avatar';
          set({ updateError: errorMessage });
          throw error;
        } finally {
          set({ isUpdating: false });
        }
      },

      deleteAvatar: async () => {
        set({ isUpdating: true, updateError: null });
        try {
          const response = await authApi.deleteAvatar() as any;
          
          if (response.data?.success) {
            get().updateUser({ avatar: null });
            set({ updateError: null });
          } else {
            throw new Error(response.data?.message || 'Failed to delete avatar');
          }
        } catch (error: any) {
          console.error('Avatar deletion error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to delete avatar';
          set({ updateError: errorMessage });
          throw error;
        } finally {
          set({ isUpdating: false });
        }
      },

      deactivateAccount: async (password) => {
        set({ isUpdating: true, updateError: null });
        try {
          const response = await authApi.deactivateAccount({ password }) as any;
          
          if (response.data?.success) {
            set({ updateError: null });
          } else {
            throw new Error(response.data?.message || 'Failed to deactivate account');
          }
        } catch (error: any) {
          console.error('Account deactivation error:', error);
          const errorMessage = error.response?.data?.message || 'Failed to deactivate account';
          set({ updateError: errorMessage });
          throw error;
        } finally {
          set({ isUpdating: false });
        }
      },

      clearUser: () => set({ user: null, updateError: null }),

      refreshUser: async () => {
        set({ isLoading: true });
        try {
          const response = await authApi.getProfile() as any;
          
          if (response.data?.success) {
            const user = response.data.data.user;
            set({ user, isLoading: false });
          } else {
            throw new Error(response.data?.message || 'Failed to fetch profile');
          }
        } catch (error: any) {
          console.error('Profile fetch error:', error);
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'user-profile-store',
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);
