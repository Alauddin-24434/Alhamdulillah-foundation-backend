import { Body, Controller, Get, Post, Put, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NoticeService } from './notice.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/user/schemas/user.schema';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/create-notice.dto';

@ApiTags('Notices')
@ApiBearerAuth()
@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createNotice(@Body() createNoticeDto: CreateNoticeDto, @Req() req) {
    const userId = req.user?._id;
    return this.noticeService.createNotice(createNoticeDto, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateNotice(@Param('id') id: string, @Body() dto: UpdateNoticeDto) {
    return this.noticeService.updateNotice(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteNotice(@Param('id') id: string) {
    return this.noticeService.deleteNotice(id);
  }

  @Get()
  findAll() {
    return this.noticeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.noticeService.findOne(id);
  }
}
