import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { AuditLogModel } from '@radflow/ddd';
import { DataSource } from 'typeorm';
import { RecordAuditRequestDto } from './dto/record-audit.request.dto';

/**
 * Audit trail: reads are exposed to admins through the gateway; POST lets
 * internal callers without their own database (the gateway) append entries,
 * e.g. denied write attempts.
 */
@Controller('audit')
export class AuditController {
  constructor(private readonly dataSource: DataSource) {}

  @Post()
  @HttpCode(204)
  async record(@Body() dto: RecordAuditRequestDto): Promise<void> {
    const entry = new AuditLogModel();
    entry.auditId = crypto.randomUUID();
    entry.actor = dto.actor;
    entry.action = dto.action;
    entry.entityType = dto.entityType;
    entry.entityId = dto.entityId;
    entry.detail = dto.detail ?? null;
    entry.origin = dto.origin;
    entry.occurredOn = new Date();
    await this.dataSource.getRepository(AuditLogModel).save(entry);
  }

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
