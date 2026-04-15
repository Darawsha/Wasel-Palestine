import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateAlertPreferenceDto } from './create-alert-preference.dto';

describe('CreateAlertPreferenceDto', () => {
  it('normalizes location input and incident category values', async () => {
    const dto = plainToInstance(CreateAlertPreferenceDto, {
      geographicArea: '  Hebron   Governorate  ',
      incidentCategory: ' weather_hazard ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.geographicArea).toBe('Hebron Governorate');
    expect(dto.incidentCategory).toBe('WEATHER_HAZARD');
  });

  it('rejects unsupported incident categories', async () => {
    const dto = plainToInstance(CreateAlertPreferenceDto, {
      geographicArea: 'Nablus',
      incidentCategory: 'ROADBLOCK',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('incidentCategory');
  });
});
