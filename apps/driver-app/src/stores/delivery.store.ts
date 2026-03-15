import { create } from 'zustand';
import type { Delivery, DriverStatus } from '@cirvia/types';

interface DeliveryState {
  activeDelivery: Delivery | null;
  driverStatus: DriverStatus;
  setActiveDelivery: (delivery: Delivery) => void;
  clearDelivery: () => void;
  setDriverStatus: (status: DriverStatus) => void;
}

export const useDeliveryStore = create<DeliveryState>((set) => ({
  activeDelivery: null,
  driverStatus: 'offline',

  setActiveDelivery: (delivery) =>
    set({ activeDelivery: delivery, driverStatus: 'on_delivery' }),

  clearDelivery: () =>
    set({ activeDelivery: null, driverStatus: 'online' }),

  setDriverStatus: (status) => set({ driverStatus: status }),
}));
