import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentGateway } from '../payment-gateway.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeGateway implements PaymentGateway {
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not defined in environment");
    }
    this.stripe = new Stripe(secretKey);
  }

  // ============================
  // CREATE CHECKOUT SESSION
  // ============================
async createPayment(data: {
  userId: string;
  amount: number;
  transactionId: string;
}) {
  const appUrl = this.configService.get<string>('APP_URL');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'bdt',
            product_data: {
              name: 'Foundation Contribution',
            },
            unit_amount: data.amount * 100,
          },
          quantity: 1,
        },
      ],

      metadata: {
        transactionId: data.transactionId,
        userId: data.userId,
      },

    success_url: `${appUrl}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/api/payments/stripe/cancel`,
  });

  return {
    checkoutUrl: session.url,
  };
}


  // ============================
  // VERIFY PAYMENT (via webhook / session fetch)
  // ============================
//   async verifyPayment(data: { sessionId: string }) {
//     const session = await this.stripe.checkout.sessions.retrieve(
//       data.sessionId,
//     );

//     if (session.payment_status === 'paid') {
//       return {
//         success: true,
//         amount: session.amount_total! / 100,
//         userId: session.metadata?.userId,
//       };
//     }

//     return { success: false };
//   }
}
