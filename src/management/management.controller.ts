import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ManagementService } from './management.service';
import {
  CreateManagementDto,
  ManagementQueryDto,
} from './dto/create-management.dto';
import { UpdateManagementDto } from './dto/update-management.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('management')
@ApiBearerAuth()
@Controller('management')
export class ManagementController {
  constructor(private readonly managementService: ManagementService) {}

  @Post()
  create(@Body() dto: CreateManagementDto) {
    return this.managementService.create(dto);
  }

  @Get()
  findAll(@Query() query: ManagementQueryDto) {
    return this.managementService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.managementService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateManagementDto,
  ) {
    return this.managementService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.managementService.remove(id);
  }
}
