import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { ModerationStatus } from '../../common/enums/moderation-status.enum';
import { Checkpoint } from '../checkpoints/entities/checkpoint.entity';
import { Incident } from '../incidents/entities/incident.entity';
import { Report } from '../reports/entities/report.entity';
import { User } from '../users/entities/user.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from './enums/audit-action.enum';
import { AuditTargetType } from './enums/audit-target-type.enum';

type RecordAuditLogInput = {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: number;
  performedByUserId?: number | null;
  details: string;
  metadata?: Record<string, unknown> | null;
};

type WorkflowState = {
  moderationStatus?: ModerationStatus | null;
  reportStatus?: string | null;
  pendingChanges?: Record<string, unknown> | null;
  targetSnapshot?: Record<string, unknown> | null;
};

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Checkpoint)
    private readonly checkpointsRepository: Repository<Checkpoint>,

    @InjectRepository(Incident)
    private readonly incidentsRepository: Repository<Incident>,

    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
  ) {}

  async record(input: RecordAuditLogInput): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      performedByUserId: input.performedByUserId ?? null,
      details: input.details,
      metadata: input.metadata ?? null,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async findAll(query: AuditLogQueryDto = {}) {
    const {
      action,
      targetType,
      performedByUserId,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = query;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.performedBy', 'performedBy');

    if (action) {
      queryBuilder.andWhere('auditLog.action = :action', { action });
    }

    if (targetType) {
      queryBuilder.andWhere('auditLog.targetType = :targetType', {
        targetType,
      });
    }

    if (performedByUserId) {
      queryBuilder.andWhere(
        'auditLog.performedByUserId = :performedByUserId',
        {
          performedByUserId,
        },
      );
    }

    if (startDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :endDate', {
        endDate,
      });
    }

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      queryBuilder.andWhere(
        `(
          LOWER(auditLog.details) LIKE :search OR
          LOWER(auditLog.action) LIKE :search OR
          LOWER(auditLog.targetType) LIKE :search OR
          LOWER(COALESCE(performedBy.email, '')) LIKE :search OR
          LOWER(COALESCE(performedBy.firstname, '')) LIKE :search OR
          LOWER(COALESCE(performedBy.lastname, '')) LIKE :search
        )`,
        { search: normalizedSearch },
      );
    }

    queryBuilder
      .orderBy('auditLog.createdAt', 'DESC')
      .addOrderBy('auditLog.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const workflowStates = await this.loadWorkflowStates(data);

    return {
      data: data.map((entry) =>
        this.toAuditLogResponse(
          entry,
          workflowStates.get(this.workflowKey(entry.targetType, entry.targetId)),
        ),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findDashboardActors() {
    const users = await this.usersRepository.find({
      where: {
        role: In([UserRole.ADMIN]),
      },
      order: {
        firstname: 'ASC',
        lastname: 'ASC',
        email: 'ASC',
      },
    });

    return {
      data: users.map((user) => this.toActorResponse(user)),
    };
  }

  private async loadWorkflowStates(
    entries: AuditLog[],
  ): Promise<Map<string, WorkflowState>> {
    const workflowStates = new Map<string, WorkflowState>();
    const checkpointIds = this.collectTargetIds(
      entries,
      AuditTargetType.CHECKPOINT,
    );
    const incidentIds = this.collectTargetIds(entries, AuditTargetType.INCIDENT);
    const reportIds = this.collectTargetIds(entries, AuditTargetType.REPORT);

    if (checkpointIds.length > 0) {
      const checkpoints = await this.checkpointsRepository.find({
        where: { id: In(checkpointIds) },
      });

      checkpoints.forEach((checkpoint) => {
        workflowStates.set(
          this.workflowKey(AuditTargetType.CHECKPOINT, checkpoint.id),
          {
            moderationStatus: checkpoint.moderationStatus,
            pendingChanges: checkpoint.pendingChanges ?? null,
            targetSnapshot: this.toCheckpointSnapshot(checkpoint),
          },
        );
      });
    }

    if (incidentIds.length > 0) {
      const incidents = await this.incidentsRepository.find({
        where: { id: In(incidentIds) },
        relations: ['checkpoint'],
      });

      incidents.forEach((incident) => {
        workflowStates.set(
          this.workflowKey(AuditTargetType.INCIDENT, incident.id),
          {
            moderationStatus: incident.moderationStatus,
            pendingChanges: incident.pendingChanges ?? null,
            targetSnapshot: this.toIncidentSnapshot(incident),
          },
        );
      });
    }

    if (reportIds.length > 0) {
      const reports = await this.reportsRepository.find({
        where: { reportId: In(reportIds) },
        relations: ['submittedByUser'],
      });

      reports.forEach((report) => {
        workflowStates.set(
          this.workflowKey(AuditTargetType.REPORT, report.reportId),
          {
            reportStatus: report.status,
            targetSnapshot: this.toReportSnapshot(report),
          },
        );
      });
    }

    return workflowStates;
  }

  private collectTargetIds(
    entries: AuditLog[],
    targetType: AuditTargetType,
  ): number[] {
    return Array.from(
      new Set(
        entries
          .filter((entry) => entry.targetType === targetType)
          .map((entry) => entry.targetId)
          .filter((targetId) => Number.isInteger(targetId)),
      ),
    );
  }

  private workflowKey(targetType: AuditTargetType, targetId: number): string {
    return `${targetType}:${targetId}`;
  }

  private toAuditLogResponse(entry: AuditLog, workflowState?: WorkflowState) {
    const workflow = this.toWorkflowResponse(entry, workflowState);

    return {
      id: entry.id,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      performedByUserId: entry.performedByUserId ?? null,
      performedBy: entry.performedBy
        ? this.toActorResponse(entry.performedBy)
        : null,
      details: entry.details,
      metadata: entry.metadata ?? null,
      workflow,
      createdAt: entry.createdAt,
    };
  }

  private toWorkflowResponse(entry: AuditLog, workflowState?: WorkflowState) {
    if (!workflowState) {
      return null;
    }

    if (entry.targetType === AuditTargetType.REPORT) {
      return {
        moderationStatus: null,
        reportStatus: workflowState.reportStatus ?? null,
        pendingChanges: null,
        targetSnapshot: workflowState.targetSnapshot ?? null,
        canDecide: false,
        moderationAction: entry.metadata?.moderationAction ?? entry.action,
        decision: entry.action,
        notes: entry.metadata?.notes ?? null,
        previousStatus: entry.metadata?.previousStatus ?? null,
        nextStatus:
          entry.metadata?.nextStatus ?? workflowState.reportStatus ?? null,
      };
    }

    if (
      ![AuditTargetType.CHECKPOINT, AuditTargetType.INCIDENT].includes(
        entry.targetType,
      )
    ) {
      return null;
    }

    const moderationStatus = workflowState.moderationStatus ?? null;

    return {
      moderationStatus,
      pendingChanges: workflowState.pendingChanges ?? null,
      targetSnapshot: workflowState.targetSnapshot ?? null,
      canDecide: false,
    };
  }

  private toReportSnapshot(report: Report): Record<string, unknown> {
    return {
      category: report.category,
      location: report.location,
      description: report.description,
      status: report.status,
      confidenceScore: report.confidenceScore,
      duplicateOf: report.duplicateOf ?? null,
      submittedByUserId: report.submittedByUserId ?? null,
      reporterName: report.submittedByUser
        ? this.toReporterDisplayName(report.submittedByUser)
        : report.submittedByUserId
          ? `Citizen #${report.submittedByUserId}`
          : null,
      latitude: report.latitude,
      longitude: report.longitude,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  private toCheckpointSnapshot(checkpoint: Checkpoint): Record<string, unknown> {
    return {
      name: checkpoint.name,
      location: checkpoint.location,
      currentStatus: checkpoint.currentStatus,
      description: checkpoint.description ?? null,
      latitude: checkpoint.latitude,
      longitude: checkpoint.longitude,
      createdAt: checkpoint.createdAt,
      updatedAt: checkpoint.updatedAt,
    };
  }

  private toIncidentSnapshot(incident: Incident): Record<string, unknown> {
    return {
      title: incident.title,
      location: incident.location ?? null,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      isVerified: incident.isVerified,
      description: incident.description,
      checkpointId: incident.checkpoint?.id ?? incident.checkpointId ?? null,
      checkpointName: incident.checkpoint?.name ?? null,
      impactStatus: incident.impactStatus ?? null,
      latitude: incident.latitude,
      longitude: incident.longitude,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
    };
  }

  private toActorResponse(user: User) {
    const displayName =
      [user.firstname, user.lastname]
        .filter((value) => Boolean(value && value.trim()))
        .join(' ')
        .trim() ||
      user.email ||
      `User #${user.id}`;

    return {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      displayName,
    };
  }

  private toReporterDisplayName(user: User) {
    return (
      [user.firstname, user.lastname]
        .filter((value) => Boolean(value && value.trim()))
        .join(' ')
        .trim() ||
      (user.id ? `Citizen #${user.id}` : 'Community member')
    );
  }
}
