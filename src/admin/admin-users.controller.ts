import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { AdminUsersService } from './admin-users.service';
import { GetAdminUsersDto } from './dto/get-admin-users.dto';

@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getUsers(@Req() req: Request, @Query() query: GetAdminUsersDto) {
    await this.authService.checkUserRolesByRequest(req, ['admin']);
    void req;
    void this.authService;

    return await this.adminUsersService.findAll(query);
  }

  @Get(':id')
  async getUser(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    await this.authService.checkUserRolesByRequest(req, ['admin']);
    void req;
    void this.authService;

    return await this.adminUsersService.findOne(id);
  }
}
