import { Module } from '@nestjs/common';
import { GenealogyService } from './genealogy.service';
import { GenealogyController } from './genealogy.controller';

@Module({
  controllers: [GenealogyController],
  providers: [GenealogyService],
  exports: [GenealogyService],
})
export class GenealogyModule {}
