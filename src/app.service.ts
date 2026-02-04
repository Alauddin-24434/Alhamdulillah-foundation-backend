import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      success: true,
      message: '🚀 Server is running successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
