import { CheckpointStatus } from '../../checkpoints/enums/checkpoint-status.enum';
import { CheckpointAvoidanceStrategy } from './checkpoint-avoidance.strategy';

describe('CheckpointAvoidanceStrategy', () => {
  it('keeps checkpoints eligible for avoidance even when they sit outside the straight-line corridor', async () => {
    const checkpointsService = {
      getFilteredCheckpoints: jest.fn().mockResolvedValue([
        {
          id: 1,
          latitude: 32,
          longitude: 35,
          currentStatus: CheckpointStatus.CLOSED,
          name: 'Near corridor checkpoint',
        },
        {
          id: 2,
          latitude: 32.27,
          longitude: 35.29,
          currentStatus: CheckpointStatus.RESTRICTED,
          name: 'Detour checkpoint',
        },
      ]),
    };
    const strategy = new CheckpointAvoidanceStrategy(
      checkpointsService as never,
    );

    const result = await strategy.build({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      avoidCheckpoints: true,
    });

    expect(checkpointsService.getFilteredCheckpoints).toHaveBeenCalledWith({});
    expect(result.groups).toHaveLength(2);
    expect(result.groups.map((group) => group.sourceKey)).toEqual([
      'checkpoint:1',
      'checkpoint:2',
    ]);
    expect(result.groups[0].zones).toHaveLength(1);
  });
});
