import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogModel } from '@radflow/ddd';
import { DataSource } from 'typeorm';

/** Read-only audit trail (exposed to admins through the gateway). */
@Controller('audit')
export class AuditController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async list(@Query('limit') limit?: string) {
    const rows = await this.dataSource.getRepository(AuditLogModel).find({
      order: { occurredOn: 'DESC' },
      take: Math.min(Number(limit) || 100, 500),
    });
    return rows.map((row) => ({
      auditId: row.auditId,
      actor: row.actor,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      detail: row.detail,
      origin: row.origin,
      occurredOn: row.occurredOn.toISOString(),
    }));
  }
}
