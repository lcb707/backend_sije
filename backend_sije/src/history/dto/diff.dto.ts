import { ApiProperty } from '@nestjs/swagger';
import { ChangeableField } from '../../common/enums/changeable-field.enum';
import { ChangeableValue } from '../../common/types/order-field.types';

/** 두 버전 간 한 필드(또는 specs 한 키)의 차이. */
export class DiffEntryDto {
  @ApiProperty({ enum: ChangeableField, example: ChangeableField.QUANTITY })
  field!: ChangeableField;

  @ApiProperty({
    nullable: true,
    example: 'color',
    description: 'specs 의 특정 키가 달라진 경우 그 키(아니면 null)',
  })
  path!: string | null;

  @ApiProperty({
    nullable: true,
    example: 1000,
    description: 'from 버전의 값(to 에서 새로 생긴 사양 키면 null)',
  })
  from!: ChangeableValue | null;

  @ApiProperty({
    nullable: true,
    example: 1500,
    description: 'to 버전의 값(from 에만 있던 사양 키면 null)',
  })
  to!: ChangeableValue | null;
}

/** 버전 비교 응답. */
export class DiffResponseDto {
  @ApiProperty({ example: 1 })
  fromVersion!: number;

  @ApiProperty({ example: 3 })
  toVersion!: number;

  @ApiProperty({
    type: [DiffEntryDto],
    description: '달라진 필드만. 같으면 빈 배열',
  })
  differences!: DiffEntryDto[];
}
