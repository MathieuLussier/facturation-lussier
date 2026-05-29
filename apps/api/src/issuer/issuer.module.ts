import { Module } from '@nestjs/common';
import { IssuerController } from './issuer.controller';
import { IssuerService } from './issuer.service';

@Module({
  controllers: [IssuerController],
  providers: [IssuerService],
  exports: [IssuerService],
})
export class IssuerModule {}
