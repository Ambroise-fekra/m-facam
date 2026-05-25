import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface FamilyContext {
  familyId: string;
  identifier: string;
  memberId: string;
  isAdmin: boolean;
}

export const CurrentFamily = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): FamilyContext => {
    const req = ctx.switchToHttp().getRequest();
    return req.familyContext;
  },
);
