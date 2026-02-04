import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // console.log('🟡 JwtAuthGuard → canActivate() START');

    const req = context.switchToHttp().getRequest();
    // console.log('🟡 Headers:', req.headers);

    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    // console.log('🟠 JwtAuthGuard → handleRequest()');

    if (err) {
      // console.log('🔴 Error from strategy:', err);
    }

    if (info) {
      // console.log('🟠 Info from passport:', info);
      // Passport often puts the reason for failure in 'info'
      if (info.message === 'jwt expired') {
        console.log('❌ Token expired');
      }
    }

    if (!user) {
      // console.log('❌ No user attached to request. Reason:', info?.message || 'Unknown');
      throw (
        err ||
        new UnauthorizedException(info?.message || 'Invalid or missing token')
      );
    }

    // console.log('🟢 User authenticated:', user);
    return user;
  }
}
