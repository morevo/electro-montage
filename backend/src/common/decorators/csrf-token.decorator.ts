import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CsrfToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-csrf-token'] || request.headers['x-xsrf-token'];
  },
);