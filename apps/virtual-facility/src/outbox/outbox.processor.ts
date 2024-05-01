import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RmqRecord } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WORKFLOWS_SERVICE } from '../constants';
import { Outbox } from './entities/outbox.entity';
import { OutboxService } from './outbox.service';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    private readonly outboxService: OutboxService,
    @Inject(WORKFLOWS_SERVICE)
    private readonly workflowsService: ClientProxy,
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
  ) {}

  /**
   * This method will be executed every 10 seconds.
   * Production-ready applications should use a more reasonable interval.
   * Also, in the real-world system, we would rather use "@nestjs/bull" instead of "@nestjs/schedule"
   * because it provides more sophisticated features (e.g. locking, supports multiple nodes running in parallel etc.).
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutboxMessages() {
    this.logger.debug(`Processing outbox messages`);

    const messages = await this.outboxService.getUnprocessedMessages({
      target: WORKFLOWS_SERVICE.description,
      take: 100,
    });
    // eslint-disable-next-line no-console
    console.log('messages', messages);
    await Promise.all(
      messages.map(async (message) => {
        await this.dispatchWorkflowEvent(message);
        // Instead of removing the message from the database, we could also update the message status to "processed".
        // However, for simplicity sake, we'll just remove the message from the database.
        await this.outboxRepository.delete(message.id);
      }),
    );
  }

  async dispatchWorkflowEvent(outbox: Outbox) {
    const rmqRecord = new RmqRecord(outbox.payload, {
      messageId: outbox.id.toString(),
    });
    await lastValueFrom(this.workflowsService.emit(outbox.type, rmqRecord));
  }
}
