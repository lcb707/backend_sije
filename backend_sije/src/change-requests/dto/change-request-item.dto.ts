import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  registerDecorator,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { ChangeableField } from '../../common/enums/changeable-field.enum';
import {
  ChangeableValue,
  OrderSpecs,
} from '../../common/types/order-field.types';

/**
 * newValue 가 field(+path) 타입에 맞는지 검증하는 커스텀 데코레이터.
 * - QUANTITY: 양의 정수
 * - UNIT_PRICE: 0 이상의 숫자
 * - PRODUCT_NAME: 비어있지 않은 문자열
 * - DUE_DATE: YYYY-MM-DD 문자열
 * - SPECS(path 없음): 객체(문자열/숫자 값) — 사양 전체 교체
 * - SPECS(path 있음): 스칼라(문자열/숫자) — 그 사양 키 하나만 변경
 */
function IsValidChangeValue(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isValidChangeValue',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as ChangeRequestItemDto;
          return isValueValidForField(dto.field, dto.path, value);
        },
        defaultMessage(args: ValidationArguments): string {
          const dto = args.object as ChangeRequestItemDto;
          return `newValue 가 ${dto.field}${dto.path ? `.${dto.path}` : ''} 타입에 맞지 않습니다.`;
        },
      },
    });
  };
}

/** path 가 SPECS 필드에서만 허용되는지 검증한다(다른 필드에 path 지정 시 거부). */
function IsValidPath(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isValidPath',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as ChangeRequestItemDto;
          // path 미지정은 모든 필드에서 허용. 지정 시 SPECS 에서만 허용.
          return value === undefined || dto.field === ChangeableField.SPECS;
        },
        defaultMessage(): string {
          return 'path 는 specs 필드에서만 사용할 수 있습니다.';
        },
      },
    });
  };
}

function isScalar(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function isValueValidForField(
  field: ChangeableField,
  path: string | undefined,
  value: unknown,
): boolean {
  switch (field) {
    case ChangeableField.QUANTITY:
      return typeof value === 'number' && Number.isInteger(value) && value > 0;
    case ChangeableField.UNIT_PRICE:
      return typeof value === 'number' && value >= 0;
    case ChangeableField.PRODUCT_NAME:
      return typeof value === 'string' && value.trim().length > 0;
    case ChangeableField.DUE_DATE:
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    case ChangeableField.SPECS:
      // path 가 있으면 그 키의 스칼라 값, 없으면 사양 객체 전체.
      return path !== undefined ? isScalar(value) : isOrderSpecs(value);
    default:
      return false;
  }
}

function isOrderSpecs(value: unknown): value is OrderSpecs {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  // 값은 스칼라여야 한다. 키 허용 여부는 서비스에서 마스터(spec_keys) 기준으로 검증한다.
  return Object.values(value).every((val) => isScalar(val));
}

export class ChangeRequestItemDto {
  @ApiProperty({ enum: ChangeableField, example: ChangeableField.QUANTITY })
  @IsEnum(ChangeableField)
  field!: ChangeableField;

  @ApiPropertyOptional({
    example: 'color',
    description:
      'specs 의 특정 키만 변경할 때 그 키 이름. specs 필드에서만 사용. 생략 시 필드 전체 교체.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsValidPath()
  path?: string;

  @ApiProperty({
    example: 1500,
    description:
      'field(+path) 타입에 맞는 새 값. quantity=정수, dueDate=YYYY-MM-DD, specs(path 없음)=객체, specs(path 있음)=스칼라.',
  })
  @IsValidChangeValue()
  newValue!: ChangeableValue;
}
