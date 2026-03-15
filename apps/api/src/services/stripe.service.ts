import Stripe from 'stripe';
import { config } from '../config';

export const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

export const stripeService = {
  async createPaymentIntent(
    amountCents: number,
    currency = 'usd',
    metadata: Record<string, string> = {}
  ): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  },

  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    await stripe.paymentIntents.cancel(paymentIntentId);
  },

  /** Create a Stripe Connect account for store/driver onboarding */
  async createConnectAccount(email: string): Promise<string> {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    return account.id;
  },

  /** Generate onboarding link for Stripe Connect */
  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const link = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: 'account_onboarding',
    });
    return link.url;
  },

  /** Transfer payout to a connected account */
  async transfer(
    amountCents: number,
    destinationAccountId: string,
    metadata: Record<string, string> = {}
  ): Promise<Stripe.Transfer> {
    return stripe.transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: destinationAccountId,
      metadata,
    });
  },

  /** Verify webhook signature — ALWAYS use this, never trust raw payload */
  constructWebhookEvent(payload: Buffer | string, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      config.STRIPE_WEBHOOK_SECRET
    );
  },
};
