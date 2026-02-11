import { Injectable } from '@nestjs/common';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class UpdatesService {
  private readonly lastUpdateAtSubject = new BehaviorSubject<string | null>(
    null,
  );

  readonly lastUpdateAt$: Observable<string | null> =
    this.lastUpdateAtSubject.asObservable();

  getLastUpdateAt(): string | null {
    return this.lastUpdateAtSubject.getValue();
  }

  setLastUpdateNow(): string {
    const iso = new Date().toISOString();
    this.lastUpdateAtSubject.next(iso);
    return iso;
  }

  setLastUpdate(isoString: string): void {
    this.lastUpdateAtSubject.next(isoString);
  }
}
