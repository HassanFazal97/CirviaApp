import { Resend } from 'resend';
import { config } from '../config';
import { Order, User } from '@cirvia/types';
import { formatCents } from '@cirvia/utils';

const resend = new Resend(config.RESEND_API_KEY);

export const emailService = {
  async sendOrderConfirmation(user: User, order: Order): Promise<void> {
    await resend.emails.send({
      from: 'Cirvia <orders@cirvia.com>',
      to: user.email,
      subject: `Order Confirmed — #${order.id.slice(0, 8).toUpperCase()}`,
      html: `
        <h2>Your order has been confirmed!</h2>
        <p>Hi ${user.full_name},</p>
        <p>Your order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> has been placed successfully.</p>
        <p><strong>Total: ${formatCents(order.total_cents)}</strong></p>
        <p>We'll notify you when your order is ready for pickup.</p>
        <br>
        <p>The Cirvia Team</p>
      `,
    });
  },

  async sendDeliveryUpdate(user: User, order: Order, message: string): Promise<void> {
    await resend.emails.send({
      from: 'Cirvia <orders@cirvia.com>',
      to: user.email,
      subject: `Order Update — #${order.id.slice(0, 8).toUpperCase()}`,
      html: `
        <h2>Order Update</h2>
        <p>Hi ${user.full_name},</p>
        <p>${message}</p>
        <p>Order: <strong>#${order.id.slice(0, 8).toUpperCase()}</strong></p>
        <br>
        <p>The Cirvia Team</p>
      `,
    });
  },
};
