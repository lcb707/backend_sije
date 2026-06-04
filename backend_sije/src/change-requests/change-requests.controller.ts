import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  ApiApproveChangeRequest,
  ApiRejectChangeRequest,
} from './change-requests.api-docs';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequestResponseDto } from './dto/change-request-response.dto';
import { ReviewDto } from './dto/review.dto';

/** 변경요청 승인/반려(소싱). 인증/인가는 전역 가드가 처리. */
@ApiTags('change-requests')
@Controller('change-requests')
export class ChangeRequestsController {
  constructor(private readonly service: ChangeRequestsService) {}

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SOURCING)
  @ApiApproveChangeRequest()
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeRequestResponseDto> {
    const cr = await this.service.approve(id, dto.reviewComment, user);
    return ChangeRequestResponseDto.fromEntity(cr);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SOURCING)
  @ApiRejectChangeRequest()
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeRequestResponseDto> {
    const cr = await this.service.reject(id, dto.reviewComment, user);
    return ChangeRequestResponseDto.fromEntity(cr);
  }
}
