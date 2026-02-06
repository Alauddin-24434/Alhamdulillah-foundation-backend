import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  HttpCode,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentService } from './payment.service';

import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/user/schemas/user.schema';
import { ConfigService } from '@nestjs/config';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  private readonly frontendUrl: string;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

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
      data: { gatewayUrl },
    };
  }

  // ===============================
  // GET PAYMENT INVOICE BY ID
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
    const { data, meta } = await this.paymentService.getUserPayments(req.user._id, query);

    return {
      success: true,
      statusCode: 200,
      message: 'Your payments retrieved successfully',
      data,
      meta,
    };
  }
  // ===============================
  // ADMIN → GET ALL PAYMENTS
  // ===============================
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getAllPayments(@Query() query: any) {
    return this.paymentService.getAllPayments(query);
  }

// ===============================
// Payment Controller: SSL SUCCESS
// ===============================
@Post('ssl/success')
async sslSuccess(@Body() body: any, @Res() res: Response) {
  console.log('[SSL SUCCESS RECEIVED]', body);

  try {
    const result = await this.paymentService.handleSslSuccess(body);
    console.log('[SSL SUCCESS RESULT]', result);

    const tranId = body.tran_id;
    const amount = body.amount;

    res.setHeader('Content-Type', 'text/html');
    return res.send(this.successHtml(tranId, amount));
  } catch (error) {
    console.error('[SSL SUCCESS ERROR]', error);
    res.setHeader('Content-Type', 'text/html');
    return res.send(this.failHtml(body.tran_id, body.amount));
  }
}

  // ===============================
  // SSL FAIL
  // ===============================
@Post('ssl/fail')
async sslFail(@Body() body: any, @Res() res: Response) {
  await this.paymentService.handleSslFail(body);

  const tranId = body.tran_id;
  const amount = body.amount;

  res.setHeader('Content-Type', 'text/html');
  return res.send(this.failHtml(tranId, amount));
}

  // ===============================
  // SSL CANCEL
  // ===============================
  @Post('ssl/cancel')
  async sslCancel(@Body() body: any, @Res() res: Response) {
    await this.paymentService.handleSslCancel(body);

    res.setHeader('Content-Type', 'text/html');
    return res.send(this.cancelHtml());
  }

  // ===============================
  // SSL IPN
  // ===============================
  @Post('ssl/ipn')
  async sslIpn(@Body() body: any) {
    return this.paymentService.handleSslIpn(body);
  }

  // ===============================
  // HTML TEMPLATES
  // ===============================
  private successHtml(tranId: string, amount: string) {
    return `
<!DOCTYPE html>
<html>
<head>
<title>Payment Successful</title>
<style>
body{font-family:Arial;background:#f4f6f8;display:flex;justify-content:center;align-items:center;height:100vh}
.card{background:#fff;padding:40px;border-radius:12px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,.1)}
a{background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<div class="card">
<h1 style="color:#16a34a">Payment Successful ✅</h1>
<p>Transaction ID: <b>${tranId}</b></p>
<p>Amount: <b>${amount}</b></p>
<a href="${this.frontendUrl}/dashboard">Go to Dashboard</a>
</div>
</body>
</html>`;
  }

 private failHtml(tranId?: string, amount?: string) {
  return `
<!DOCTYPE html>
<html>
<head>
<title>Payment Failed</title>
<style>
body {
  font-family: Arial;
  background: #fef2f2;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.card {
  background: #fff;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,.1);
}
a {
  background: #dc2626;
  color: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
}
</style>
</head>
<body>
<div class="card">
<h1 style="color:#dc2626">Payment Failed ❌</h1>
${tranId ? `<p>Transaction ID: <b>${tranId}</b></p>` : ''}
${amount ? `<p>Amount: <b>${amount}</b></p>` : ''}
<a href="${this.frontendUrl}/dashboard">Go Back</a>
</div>
</body>
</html>`;
}

  private cancelHtml() {
    return `
<!DOCTYPE html>
<html>
<head>
<title>Payment Cancelled</title>
<style>
body{font-family:Arial;background:#fffbeb;display:flex;justify-content:center;align-items:center;height:100vh}
.card{background:#fff;padding:40px;border-radius:12px;text-align:center}
a{background:#f59e0b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none}
</style>
</head>
<body>
<div class="card">
<h1 style="color:#f59e0b">Payment Cancelled ⚠️</h1>
<a href="${this.frontendUrl}/dashboard">Go Back</a>
</div>
</body>
</html>`;
  }
}
