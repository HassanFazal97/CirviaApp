import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../plugins/auth.plugin';
import { driverRepository } from '../repositories/driver.repository';

let io: SocketIOServer | null = null;

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // JWT auth middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as JwtPayload;

    // Buyer joins their order rooms
    socket.on('order:subscribe', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('order:unsubscribe', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    // Store joins their store room
    if (user.role === 'store_owner') {
      socket.on('store:subscribe', (storeId: string) => {
        socket.join(`store:${storeId}`);
      });
    }

    // Driver: join driver room + stream location updates
    if (user.role === 'driver') {
      socket.join(`driver:${user.sub}`);

      socket.on('driver:location_update', async (data: { delivery_id: string; lat: number; lng: number }) => {
        // Forward to the relevant order room (buyers watching this delivery)
        const delivery = await driverRepository.findDeliveryById(data.delivery_id);
        if (delivery?.order_id) {
          io!.to(`order:${delivery.order_id}`).emit('driver:location_update', {
            delivery_id: data.delivery_id,
            driver_id: user.sub,
            lat: data.lat,
            lng: data.lng,
            timestamp: new Date().toISOString(),
          });
        }

        // Persist location to DB
        const driver = await driverRepository.findByUserId(user.sub);
        if (driver) {
          await driverRepository.updateLocation(driver.id, data.lat, data.lng);
        }
      });
    }

    socket.on('disconnect', () => {
      // Cleanup handled by Socket.io automatically
    });
  });

  return io;
}
