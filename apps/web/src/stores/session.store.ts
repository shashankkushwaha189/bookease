import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionInfo {
  id: string;
  userId: string;
  email: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
  deviceInfo?: {
    platform: string;
    browser: string;
    os: string;
  };
  location?: {
    country: string;
    city: string;
  };
}

interface SessionState {
  sessions: SessionInfo[];
  currentSession: SessionInfo | null;
  isLoading: boolean;
  
  // Actions
  setSessions: (sessions: SessionInfo[]) => void;
  addSession: (session: SessionInfo) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<SessionInfo>) => void;
  setCurrentSession: (session: SessionInfo | null) => void;
  clearSessions: () => void;
  refreshSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllOtherSessions: () => Promise<void>;
  extendSession: (sessionId: string) => Promise<void>;
  checkSessionValidity: () => boolean;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSession: null,
      isLoading: false,

      setSessions: (sessions) => set({ sessions }),

      addSession: (session) => set((state) => ({ 
        sessions: [...state.sessions, session] 
      })),

      removeSession: (sessionId) => set((state) => ({
        sessions: state.sessions.filter(s => s.id !== sessionId),
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession
      })),

      updateSession: (sessionId, updates) => set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === sessionId ? { ...s, ...updates } : s
        ),
        currentSession: state.currentSession?.id === sessionId 
          ? { ...state.currentSession, ...updates }
          : state.currentSession
      })),

      setCurrentSession: (session) => set({ currentSession: session }),

      clearSessions: () => set({ sessions: [], currentSession: null }),

      refreshSessions: async () => {
        set({ isLoading: true });
        try {
          // This would be an API call to fetch active sessions
          // const response = await sessionApi.getActiveSessions();
          // set({ sessions: response.data.sessions });
          console.log('Refreshing sessions...');
        } catch (error) {
          console.error('Failed to refresh sessions:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      revokeSession: async (sessionId) => {
        try {
          // API call to revoke specific session
          // await sessionApi.revokeSession(sessionId);
          get().removeSession(sessionId);
          console.log('Session revoked:', sessionId);
        } catch (error) {
          console.error('Failed to revoke session:', error);
          throw error;
        }
      },

      revokeAllOtherSessions: async () => {
        try {
          // API call to revoke all other sessions
          // await sessionApi.revokeAllOtherSessions();
          const currentSessionId = get().currentSession?.id;
          if (currentSessionId) {
            set((state) => ({
              sessions: state.sessions.filter(s => s.id === currentSessionId)
            }));
          }
          console.log('All other sessions revoked');
        } catch (error) {
          console.error('Failed to revoke other sessions:', error);
          throw error;
        }
      },

      extendSession: async (sessionId) => {
        try {
          // API call to extend session
          // await sessionApi.extendSession(sessionId);
          const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          get().updateSession(sessionId, { expiresAt: newExpiresAt });
          console.log('Session extended:', sessionId);
        } catch (error) {
          console.error('Failed to extend session:', error);
          throw error;
        }
      },

      checkSessionValidity: () => {
        const { currentSession } = get();
        if (!currentSession) return false;
        
        const now = new Date();
        const expiresAt = new Date(currentSession.expiresAt);
        const lastActivity = new Date(currentSession.lastActivity);
        
        // Check if session is expired
        if (now > expiresAt) {
          set({ currentSession: null });
          return false;
        }
        
        // Check if session is inactive for too long (e.g., 30 minutes)
        const maxInactivity = 30 * 60 * 1000; // 30 minutes
        if (now.getTime() - lastActivity.getTime() > maxInactivity) {
          set({ currentSession: null });
          return false;
        }
        
        return true;
      },
    }),
    {
      name: 'session-store',
      partialize: (state) => ({
        sessions: state.sessions,
        currentSession: state.currentSession,
      }),
    }
  )
);
