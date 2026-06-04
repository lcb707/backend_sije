import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';

/**
 * PaginatedResponseDto<Model> 형태의 200 응답을 Swagger 에 표현한다.
 * 제네릭은 런타임 타입 정보가 없으므로 allOf + items.$ref 로 봉투+항목을 합성한다.
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
): ReturnType<typeof applyDecorators> =>
  applyDecorators(
    ApiExtraModels(PaginatedResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
