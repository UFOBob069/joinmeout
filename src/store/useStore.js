import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // Auth state
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearUser: () => set({ user: null, isAuthenticated: false }),

      // UI state
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // Filters state
      filters: {
        category: 'all',
        timeRange: 'today',
        location: '',
        searchQuery: '',
      },
      setFilters: (filters) => set({ filters: { ...filters } }),

      // Plans state
      plans: [],
      setPlans: (plans) => set({ plans }),

      // Selected plan
      selectedPlan: null,
      setSelectedPlan: (plan) => set({ selectedPlan: plan }),

      // User preferences
      preferences: {
        notifications: true,
        locationSharing: true,
        showProfileTo: 'all',
      },
      setPreferences: (preferences) => set({ preferences: { ...preferences } }),

      // Notifications
      notifications: [],
      addNotification: (notification) =>
        set((state) => ({
          notifications: [...state.notifications, notification],
        })),
      clearNotifications: () => set({ notifications: [] }),

      // Loading states
      isLoading: false,
      setLoading: (isLoading) => set({ isLoading }),

      // Error state
      error: null,
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'joinmeout-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        preferences: state.preferences,
      }),
    }
  )
);

export default useStore; 