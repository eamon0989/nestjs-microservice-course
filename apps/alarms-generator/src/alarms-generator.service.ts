import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ALARMS_SERVICE } from './constants';

@Injectable()
export class AlarmsGeneratorService {
  private readonly logger = new Logger(AlarmsGeneratorService.name);

  constructor(
    @Inject(ALARMS_SERVICE)
    private readonly alarmsService: ClientProxy,
  ) {}

  // @Interval(10000)
  generateAlarm() {
    const alarmCreatedEvent = {
      name: 'Alarm #' + Math.floor(Math.random() * 1000) + 1,
      // random number from 1-100,
      buildingId: Math.floor(Math.random() * 100) + 1,
    };
    this.logger.log(`Emitting alarm: ${JSON.stringify(alarmCreatedEvent)}`);
    this.alarmsService.emit('alarm.created', alarmCreatedEvent); // 👈 (emit not send for Events)
  }
}
