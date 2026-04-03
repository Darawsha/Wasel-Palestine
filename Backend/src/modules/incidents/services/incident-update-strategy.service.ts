import { Injectable } from '@nestjs/common';

import { UpdateIncidentDto } from '../dto/update-incident.dto';
import { Incident } from '../entities/incident.entity';
import { DescriptionStrategy } from '../strategies/description.strategy';
import { SeverityUpdateStrategy } from '../strategies/severity.strategy';
import { TitleStrategy } from '../strategies/title.strategy';
import { TypeUpdateStrategy } from '../strategies/type-update.strategy';

@Injectable()
export class IncidentUpdateStrategyService {
  apply(incident: Incident, updateIncidentDto: UpdateIncidentDto): void {
    TitleStrategy.apply(incident, updateIncidentDto);
    DescriptionStrategy.apply(incident, updateIncidentDto);
    TypeUpdateStrategy.apply(incident, updateIncidentDto);
    SeverityUpdateStrategy.apply(incident, updateIncidentDto);

    if (updateIncidentDto.location !== undefined) {
      incident.location = updateIncidentDto.location ?? undefined;
    }

    if (
      updateIncidentDto.latitude !== undefined ||
      updateIncidentDto.longitude !== undefined
    ) {
      incident.latitude = updateIncidentDto.latitude;
      incident.longitude = updateIncidentDto.longitude;
    }

    if (updateIncidentDto.impactStatus !== undefined) {
      incident.impactStatus = updateIncidentDto.impactStatus;
    }
  }
}
