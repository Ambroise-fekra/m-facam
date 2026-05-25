import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { baseDbConfig, masterDbName } from '../config/database.config';
import { Family } from './families/family.entity';
import { Subscription } from './subscriptions/subscription.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: 'master',
      useFactory: () => ({
        type: 'postgres',
        ...baseDbConfig(),
        database: masterDbName(),
        entities: [Family, Subscription],
        synchronize: false,
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    TypeOrmModule.forFeature([Family, Subscription], 'master'),
  ],
  exports: [TypeOrmModule],
})
export class MasterDatabaseModule {}
