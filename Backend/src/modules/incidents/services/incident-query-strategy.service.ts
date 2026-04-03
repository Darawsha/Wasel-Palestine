import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';

import { IncidentQueryDto } from '../dto/incident-query.dto';
import { Incident } from '../entities/incident.entity';
import { CheckpointStrategy } from '../strategies/checkpoint.strategy';
import { SeverityStrategy } from '../strategies/severity.strategy';
import { SortStrategy } from '../strategies/sort.strategy';
import { StatusStrategy } from '../strategies/status.strategy';
import { TypeStrategy } from '../strategies/type.strategy';

@Injectable()
export class IncidentQueryStrategyService {
  apply(
    queryBuilder: SelectQueryBuilder<Incident>,
    query: Pick<
      IncidentQueryDto,
      'status' | 'type' | 'severity' | 'checkpointId' | 'sortBy' | 'sortOrder'
    >,
  ): void {
    StatusStrategy.apply(queryBuilder, query.status);
    TypeStrategy.apply(queryBuilder, query.type);
    SeverityStrategy.apply(queryBuilder, query.severity);
    CheckpointStrategy.apply(queryBuilder, query.checkpointId);
    SortStrategy.apply(queryBuilder, query.sortBy, query.sortOrder);
  }
}
