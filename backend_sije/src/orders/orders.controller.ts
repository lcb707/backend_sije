import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  ApiCreateOrder,
  ApiFindAllOrders,
  ApiFindOneOrder,
  ApiUpdateOrderStatus,
} from './orders.api-docs';
import { OrdersService } from './orders.service';

// 인증/인가는 전역 가드(AuthUserGuard + RolesGuard)가 처리한다. @Roles 로 허용 역할만 표시.
@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.BUYER)
  @ApiCreateOrder()
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.create(dto, user.userId);
    return OrderResponseDto.fromEntity(order);
  }

  @Get()
  @ApiFindAllOrders()
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<OrderResponseDto>> {
    const [orders, total] = await this.ordersService.findAll(
      query.limit,
      query.offset,
    );
    return PaginatedResponseDto.of(
      orders.map((order) => OrderResponseDto.fromEntity(order)),
      total,
      query.limit,
      query.offset,
    );
  }

  @Get(':id')
  @ApiFindOneOrder()
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.findOne(id);
    return OrderResponseDto.fromEntity(order);
  }

  @Patch(':id/status')
  @Roles(UserRole.BUYER, UserRole.SOURCING)
  @ApiUpdateOrderStatus()
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.updateStatus(id, dto.status, {
      role: user.role,
      userId: user.userId,
    });
    return OrderResponseDto.fromEntity(order);
  }
}
