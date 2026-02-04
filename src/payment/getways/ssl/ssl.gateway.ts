import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway } from '../payment-gateway.interface';
import SSLCommerzPayment from 'sslcommerz-lts';

@Injectable()
export class SslGateway implements PaymentGateway {
  private sslcz: SSLCommerzPayment;

  constructor(private readonly configService: ConfigService) {
    const storeId =
      this.configService.get<string>('SSLCOMMERZ_STORE_ID');
    const storePass =
      this.configService.get<string>('SSLCOMMERZ_STORE_PASS');
    const isLive =
      this.configService.get<string>('SSLCOMMERZ_IS_LIVE') ===
      'true';


if (!storeId || !storePass) {
  throw new InternalServerErrorException(
    'SSLCommerz credentials not configured',
  );
}

    this.sslcz = new SSLCommerzPayment(
      storeId,
      storePass,
      isLive,
    );
  }

    async createPayment(data: any) {
    
    const appUrl =
      this.configService.get<string>('APP_URL');

    const paymentData = {
      total_amount: data.amount,
      currency: 'BDT',
      tran_id: data.transactionId,

      success_url: `${appUrl}/api/payments/ssl/success`,
      fail_url: `${appUrl}/api/payments/ssl/fail`,
      cancel_url: `${appUrl}/api/payments/ssl/cancel`,
      ipn_url: `${appUrl}/api/payments/ssl/ipn`,

      shipping_method: 'NO',
      product_name: data.purpose || 'Foundation Fund',
      product_category: 'Fund',
      product_profile: 'general',

      cus_name: data.user.name || 'Anonymous',
      cus_email: data.user.email || 'guest@example.com',
      cus_phone: data.user.phone || '01700000000',
      cus_add1: 'Dhaka',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
    };

      const response = await this.sslcz.init(paymentData);
      console.log('SSLCommerz Init Response:', response);

    if (response?.status !== 'SUCCESS') {
      console.error('SSLCommerz Init Error:', response?.failedreason || response);
      throw new Error(
        `Failed to initialize SSLCommerz payment: ${response?.failedreason || 'Unknown error'}`,
      );
    }

    if (!response?.GatewayPageURL) {
      throw new Error(
        'Failed to initialize SSLCommerz payment: Gateway URL missing',
      );
    }

    return {
      gatewayUrl: response.GatewayPageURL,
    };
  }

  async verifyPayment(data: any) {
    // IPN / validation later
  }
}
