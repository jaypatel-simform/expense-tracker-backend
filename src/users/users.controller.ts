import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @Patch('me')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateUserDto) {
    return this.users.update(user.id, dto);
  }
}
