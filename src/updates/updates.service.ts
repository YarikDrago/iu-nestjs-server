import { Injectable } from '@nestjs/common';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class UpdatesService {
  private readonly lastUpdateAtSubject = new BehaviorSubject<string | null>(
    null,
  );

  readonly lastUpdateAt: Observable<string | null> =
    this.lastUpdateAtSubject.asObservable();

  getLastUpdateAt(): string | null {
    return this.lastUpdateAtSubject.getValue();
  }
}
