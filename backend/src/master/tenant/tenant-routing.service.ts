import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Family } from '../families/family.entity';
import { baseDbConfig, tenantDbName, templateDbName } from '../../config/database.config';
import { Member } from '../../tenant/members/member.entity';
import { Event } from '../../tenant/events/event.entity';
import { EventVote } from '../../tenant/events/event-vote.entity';
import { Contribution } from '../../tenant/contributions/contribution.entity';
import { Allocation } from '../../tenant/allocations/allocation.entity';
import { Notification } from '../../tenant/notifications/notification.entity';
import { LoanRepayment } from '../../tenant/loans/loan-repayment.entity';
import { ExternalContribution } from '../../tenant/external/external-contribution.entity';

/**
 * Resolves a family identifier to its dedicated PostgreSQL database and
 * maintains one TypeORM DataSource per tenant.
 *
 * Why: data isolation between families is a hard requirement of the product.
 * Each family lives in its own database (`facam_<IDENTIFIER>`), cloned at
 * sign-up from the `facam_template` model.
 */
@Injectable()
export class TenantRoutingService {
  private readonly logger = new Logger(TenantRoutingService.name);
  private readonly dataSources = new Map<string, DataSource>();

  constructor(
    @InjectRepository(Family, 'master')
    private readonly familyRepo: Repository<Family>,
  ) {}

  async resolveFamily(identifier: string): Promise<Family> {
    const family = await this.familyRepo.findOne({ where: { identifier } });
    if (!family || family.status === 'deleted') {
      throw new NotFoundException(`Family "${identifier}" not found`);
    }
    return family;
  }

  async getDataSourceFor(identifier: string): Promise<DataSource> {
    const cached = this.dataSources.get(identifier);
    if (cached?.isInitialized) {
      return cached;
    }
    const family = await this.resolveFamily(identifier);
    return this.openDataSource(family.dbName, identifier);
  }

  private async openDataSource(dbName: string, identifier: string): Promise<DataSource> {
    const ds = new DataSource({
      type: 'postgres',
      ...baseDbConfig(),
      database: dbName,
      entities: [Member, Event, EventVote, Contribution, Allocation, Notification, LoanRepayment, ExternalContribution],
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
    });
    await ds.initialize();
    this.dataSources.set(identifier, ds);
    this.logger.log(`Tenant DataSource ready: ${dbName}`);
    return ds;
  }

  /**
   * Clones `facam_template` into a new tenant database. Run from the master
   * connection with WITH TEMPLATE — requires no active connections on the
   * template database.
   */
  async createTenantDatabase(identifier: string): Promise<string> {
    const dbName = tenantDbName(identifier);
    const template = templateDbName();
    const adminDs = new DataSource({
      type: 'postgres',
      ...baseDbConfig(),
      database: 'postgres',
    });
    await adminDs.initialize();
    try {
      const exists = await adminDs.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName],
      );
      if (exists.length > 0) {
        this.logger.warn(`Tenant database ${dbName} already exists, skipping create`);
        return dbName;
      }
      await adminDs.query(`CREATE DATABASE "${dbName}" WITH TEMPLATE "${template}"`);
      this.logger.log(`Tenant database ${dbName} created from template`);
    } finally {
      await adminDs.destroy();
    }
    return dbName;
  }

  async dropTenantDatabase(identifier: string): Promise<void> {
    const family = await this.resolveFamily(identifier);
    const cached = this.dataSources.get(identifier);
    if (cached?.isInitialized) {
      await cached.destroy();
      this.dataSources.delete(identifier);
    }
    const adminDs = new DataSource({
      type: 'postgres',
      ...baseDbConfig(),
      database: 'postgres',
    });
    await adminDs.initialize();
    try {
      await adminDs.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
        [family.dbName],
      );
      await adminDs.query(`DROP DATABASE IF EXISTS "${family.dbName}"`);
      this.logger.warn(`Tenant database ${family.dbName} dropped`);
    } finally {
      await adminDs.destroy();
    }
  }
}
