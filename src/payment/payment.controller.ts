import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Headers,
  HttpCode,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentService } from './payment.service';
import type { Response } from 'express';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/user/schemas/user.schema';

import { ConfigService } from '@nestjs/config';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  // ===============================
  // USER → INITIATE PAYMENT
  // ===============================
  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async initiatePayment(@Body() dto: InitiatePaymentDto, @Req() req) {
    const gatewayUrl = await this.paymentService.processPayment(
      req.user._id,
      dto,
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Payment initiated successfully',
      data: {
        gatewayUrl,
      },
    };
  }

  // ===============================
  // GET PAYMENT INVOICE BY ID (SECURE)
  // ===============================
  @Get('invoice/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async getPaymentInvoice(@Param('id') id: string, @Req() req) {
    const payment = await this.paymentService.getPaymentById(
      id,
      req.user._id,
      req.user.role,
    );

    return {
      success: true,
      statusCode: 200,
      message: 'Invoice retrieved successfully',
      data: payment,
    };
  }

  // ===============================
  // USER → GET MY PAYMENTS
  // ===============================
  @Get('my-payments')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(200)
  async getMyPayments(@Query() query: any, @Req() req) {
    const result = await this.paymentService.getUserPayments(req.user._id, query);
    return {
      success: true,
      statusCode: 200,
      message: 'Your payments retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  // ===============================
  // ADMIN / USER → GET ALL PAYMENTS
  // ===============================
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getAllPayments(@Query() query: any) {
    return this.paymentService.getAllPayments(query);
  }

  // ===============================
  // SSL SUCCESS
  // ===============================
@Post('ssl/success')
async sslSuccess(
  @Body() body: any,
  @Res({ passthrough: true }) res: Response,
) {
  const { message } = await this.paymentService.handleSslSuccess(body);

  // 🔥 AUTH COOKIE REMOVE (if needed)
  // res.clearCookie('accessToken'); // Your cookie name
  // res.clearCookie('refreshToken'); // If exists

  const tranId = body.tran_id;
  const amount = body.amount;

  return res.redirect(
    `/payment-success.html?tranId=${tranId}&amount=${amount}&message=${message}`,
  );
}


  // ===============================
  // SSL FAIL
  // ===============================
  @Post('ssl/fail')
  async sslFail(@Body() body, @Res() res: Response) {
    await this.paymentService.handleSslFail(body);

    return res.sendFile('payment-fail.html', {
      root: 'public',
    });
  }

  // ===============================
  // SSL CANCEL
  // ===============================
  @Post('ssl/cancel')
  async sslCancel(@Body() body, @Res() res: Response) {
    await this.paymentService.handleSslCancel(body);

    return res.sendFile('payment-cancel.html', {
      root: 'public',
    });
  }

  // ===============================
  // SSL IPN (SERVER TO SERVER)
  // ===============================
  @Post('ssl/ipn')
  async sslIpn(@Body() body) {
    // 🔥 IPN only updates DB (NO HTML)
    return this.paymentService.handleSslIpn(body);
  }

  // ===============================
  // STRIPE CALLBACKS
  // ===============================

  // Stripe Checkout success redirect (optional)
  @Get('stripe/success')
  @HttpCode(302)
  async stripeSuccess(@Query('session_id') sessionId: string, @Res() res: Response) {
    if (sessionId) {
      await this.paymentService.handleStripeSuccess(sessionId);
    }
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/dashboard?status=PAID`);
  }

  // Stripe Checkout cancel redirect
  @Get('stripe/cancel')
  @HttpCode(302)
  async stripeCancel(@Res() res: Response) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/dashboard?status=CANCELLED`);
  }
  @Post('stripe/webhook')
  async stripeWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    console.log('🔥 STRIPE WEBHOOK HIT 🔥');
    console.log('Event type:', body?.type);

    return this.paymentService.handleStripeWebhook(body, signature);
  }
}
