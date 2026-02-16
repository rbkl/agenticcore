import { Controller, Get, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('audit-log')
  @ApiOperation({ summary: 'Query audit trail' })
  getAuditLog(
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('decision') decision?: string,
  ) {
    return this.adminService.getAuditLog({ actorId, action, entityType, decision });
  }

  @Get('rules')
  @ApiOperation({ summary: 'List business rules' })
  getRules() {
    return this.adminService.getRules();
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update a business rule' })
  updateRule(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminService.updateRule(id, body as any);
  }

  @Get('authority-limits')
  @ApiOperation({ summary: 'List authority limits' })
  getAuthorityLimits() {
    return this.adminService.getAuthorityLimits();
  }

  @Put('authority-limits/:id')
  @ApiOperation({ summary: 'Update an authority limit' })
  updateAuthorityLimit(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminService.updateAuthorityLimit(id, body as any);
  }
}
