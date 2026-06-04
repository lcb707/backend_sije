import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UserRole } from '../common/enums/user-role.enum';
import {
  ApiCreateChangeRequest,
  ApiListChangeRequests,
} from './change-requests.api-docs';
import { ChangeRequestsService } from './change-requests.service';
import { ChangeRequestResponseDto } from './dto/change-request-response.dto';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';

/** 발주서 하위 경로의 변경요청 생성/목록. 인증/인가는 전역 가드가 처리. */
@ApiTags('change-requests')
@Controller('orders/:orderId/change-requests')
export class OrderChangeRequestsController {
  constructor(private readonly service: ChangeRequestsService) {}

  @Post()
  @Roles(UserRole.BUYER)
  @ApiCreateChangeRequest()
  async create(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateChangeRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeRequestResponseDto> {
    const cr = await this.service.create(orderId, dto, user.userId);
    return ChangeRequestResponseDto.fromEntity(cr);
  }

  @Get()
  @ApiListChangeRequests()
  async list(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ChangeRequestResponseDto>> {
    const [list, total] = await this.service.listByOrder(
      orderId,
      query.limit,
      query.offset,
    );
    return PaginatedResponseDto.of(
      list.map((cr) => ChangeRequestResponseDto.fromEntity(cr)),
      total,
      query.limit,
      query.offset,
    );
  }
}
