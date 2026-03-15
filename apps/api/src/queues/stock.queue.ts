import { Queue, Worker } from 'bullmq';
import { bullmqRedis as redis } from '../redis';
import { productRepository } from '../repositories/product.repository';
import { orderRepository } from '../repositories/order.repository';
import { stripeService } from '../services/stripe.service';

interface StockRestoreJob {
  order_id: string;
  payment_intent_id: string;
  items: { product_id: string; quantity: number }[];
}

export const stockRestoreQueue = new Queue<StockRestoreJob>('stock-restore', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

/** Worker — runs in the same process for the MVP; extract to separate process in prod */
export const stockRestoreWorker = new Worker<StockRestoreJob>(
  'stock-restore',
  async (job) => {
    const { order_id, payment_intent_id, items } = job.data;

    // Check if payment was confirmed before the timeout
    const order = await orderRepository.findById(order_id);
    if (!order) return;

    if (order.stripe_payment_status === 'succeeded') {
      // Payment went through — nothing to restore
      return;
    }

    // Payment didn't succeed — restore stock and cancel the PaymentIntent
    await Promise.all(
      items.map(({ product_id, quantity }) =>
        productRepository.incrementStock(product_id, quantity)
      )
    );

    // Cancel the PaymentIntent if it's still open
    try {
      await stripeService.cancelPaymentIntent(payment_intent_id);
    } catch {
      // PaymentIntent may already be cancelled or expired — safe to ignore
    }
  },
  { connection: redis }
);

stockRestoreWorker.on('failed', (job, err) => {
  console.error(`Stock restore job ${job?.id} failed:`, err);
});
