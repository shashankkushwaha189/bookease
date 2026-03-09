import { 
  TimeSlot, 
  AvailabilityRequest, 
  AvailabilityResponse, 
  DateOverride,
  TimezoneInfo,
  availabilityRequestSchema,
  timeSlotSchema 
} from './availability.schema';

export class AvailabilityEngine {
  private cache = new Map<string, any>();
  private metrics = {
    requestCount: 0,
    cacheHits: 0,
    totalGenerationTime: 0,
    concurrentRequests: 0,
    errors: 0,
    lastReset: new Date().toISOString(),
  };

  // Main availability calculation method
  async calculateAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    const startTime = Date.now();
    this.metrics.requestCount++;
    this.metrics.concurrentRequests++;

    try {
      // Validate request
      const validated = availabilityRequestSchema.parse(request);
      
      // Generate cache key
      const cacheKey = this.generateCacheKey(validated);
      
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }

      // Get timezone information
      const timezoneInfo = this.getTimezoneInfo(validated.date, validated.timezone);
      
      // Get staff working schedule for the date
      const workingSchedule = await this.getWorkingSchedule(validated.staffId, validated.date, timezoneInfo);
      
      // Get service information with buffer times
      const serviceInfo = await this.getServiceInfo(validated.serviceId);
      
      // Get time-off information
      const timeOffs = await this.getTimeOffs(validated.staffId, validated.date);
      
      // Get date overrides
      const dateOverrides = await this.getDateOverrides(validated.staffId, validated.date);
      
      // Generate slots
      const slots = this.generateSlots({
        request: validated,
        workingSchedule,
        serviceInfo,
        timeOffs,
        dateOverrides,
        timezoneInfo,
      });

      // Create response
      const response: AvailabilityResponse = {
        staffId: validated.staffId,
        serviceId: validated.serviceId,
        date: validated.date,
        timezone: validated.timezone,
        slots,
        workingHours: workingSchedule,
        totalSlots: slots.length,
        availableSlots: slots.filter(slot => slot.available).length,
        generatedAt: new Date().toISOString(),
        cacheKey,
      };

      // Cache the result
      this.setCache(cacheKey, response);

      // Update metrics
      const generationTime = Date.now() - startTime;
      this.metrics.totalGenerationTime += generationTime;

      return response;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    } finally {
      this.metrics.concurrentRequests--;
    }
  }

  // Generate time slots based on all constraints
  private generateSlots(params: {
    request: AvailabilityRequest;
    workingSchedule: any;
    serviceInfo: any;
    timeOffs: any[];
    dateOverrides: any[];
    timezoneInfo: TimezoneInfo;
  }): TimeSlot[] {
    const { request, workingSchedule, serviceInfo, timeOffs, dateOverrides, timezoneInfo } = params;

    // Check if staff is working on this date
    if (!this.isWorkingDay(workingSchedule, dateOverrides)) {
      return [];
    }

    // Get effective working hours (considering date overrides)
    const effectiveHours = this.getEffectiveWorkingHours(workingSchedule, dateOverrides);
    
    if (!effectiveHours) {
      return [];
    }

    // Calculate total service duration with buffers
    const totalDuration = this.calculateTotalDuration(serviceInfo, request);
    
    // Convert working hours to minutes for easier calculation
    const workStartMinutes = this.timeToMinutes(effectiveHours.start);
    const workEndMinutes = this.timeToMinutes(effectiveHours.end);
    
    // Generate initial slots
    const slots: TimeSlot[] = [];
    let currentTime = workStartMinutes;
    
    while (currentTime + totalDuration <= workEndMinutes && slots.length < (request.maxSlots || 20)) {
      const slotEnd = currentTime + totalDuration;
      
      // Check if slot conflicts with breaks
      if (this.conflictsWithBreaks(currentTime, slotEnd, workingSchedule.breaks || [])) {
        currentTime = this.getNextAvailableTime(currentTime, workingSchedule.breaks || []);
        continue;
      }
      
      // Check if slot conflicts with time-offs
      if (this.conflictsWithTimeOffs(currentTime, slotEnd, timeOffs)) {
        currentTime = this.getNextAvailableTimeAfterTimeOff(currentTime, timeOffs);
        continue;
      }
      
      // Check if slot is in the past
      if (this.isSlotInPast(currentTime, request.date, timezoneInfo)) {
        currentTime = Math.max(currentTime + 15, this.getCurrentTimeInMinutes());
        continue;
      }
      
      // Add valid slot
      slots.push({
        start: this.minutesToTime(currentTime),
        end: this.minutesToTime(slotEnd),
        available: true,
      });
      
      // Move to next slot (with 15-minute gap between slots)
      currentTime = slotEnd + 15;
    }

    return slots;
  }

  // Calculate total duration including buffers
  private calculateTotalDuration(serviceInfo: any, request: AvailabilityRequest): number {
    const bufferBefore = request.bufferBefore ?? serviceInfo.bufferBefore ?? 0;
    const bufferAfter = request.bufferAfter ?? serviceInfo.bufferAfter ?? 0;
    
    if (request.includeBufferInSlot) {
      return request.duration + bufferBefore + bufferAfter;
    }
    
    return request.duration;
  }

  // Check if time conflicts with breaks
  private conflictsWithBreaks(start: number, end: number, breaks: any[]): boolean {
    return breaks.some((breakItem: any) => {
      const breakStart = this.timeToMinutes(breakItem.startTime);
      const breakEnd = this.timeToMinutes(breakItem.endTime);
      
      // Check for any overlap
      return (start < breakEnd && end > breakStart);
    });
  }

  // Check if time conflicts with time-offs
  private conflictsWithTimeOffs(start: number, end: number, timeOffs: any[]): boolean {
    return timeOffs.some((timeOff: any) => {
      const timeOffStart = this.timeToMinutes(timeOff.startTime);
      const timeOffEnd = this.timeToMinutes(timeOff.endTime);
      
      // Check for any overlap
      return (start < timeOffEnd && end > timeOffStart);
    });
  }

  // Get next available time after break
  private getNextAvailableTime(currentTime: number, breaks: any[]): number {
    let nextTime = currentTime;
    
    for (const breakItem of breaks) {
      const breakStart = this.timeToMinutes(breakItem.startTime);
      const breakEnd = this.timeToMinutes(breakItem.endTime);
      
      if (currentTime < breakEnd && currentTime >= breakStart) {
        nextTime = Math.max(nextTime, breakEnd);
      }
    }
    
    return nextTime;
  }

  // Get next available time after time-off
  private getNextAvailableTimeAfterTimeOff(currentTime: number, timeOffs: any[]): number {
    let nextTime = currentTime;
    
    for (const timeOff of timeOffs) {
      const timeOffStart = this.timeToMinutes(timeOff.startTime);
      const timeOffEnd = this.timeToMinutes(timeOff.endTime);
      
      if (currentTime < timeOffEnd && currentTime >= timeOffStart) {
        nextTime = Math.max(nextTime, timeOffEnd);
      }
    }
    
    return nextTime;
  }

  // Check if staff is working on this date
  private isWorkingDay(workingSchedule: any, dateOverrides: any[]): boolean {
    // Check for date override first
    const override = dateOverrides.find(override => 
      new Date(override.date).toDateString() === new Date().toDateString()
    );
    
    if (override) {
      return override.isWorking === true;
    }
    
    return workingSchedule.isWorking === true;
  }

  // Get effective working hours considering date overrides
  private getEffectiveWorkingHours(workingSchedule: any, dateOverrides: any[]): any {
    // Check for date override first
    const override = dateOverrides.find(override => 
      new Date(override.date).toDateString() === new Date().toDateString()
    );
    
    if (override && override.isWorking === true && override.startTime && override.endTime) {
      return {
        start: override.startTime,
        end: override.endTime,
        isWorking: true,
      };
    }
    
    if (workingSchedule.isWorking === true && workingSchedule.startTime && workingSchedule.endTime) {
      return {
        start: workingSchedule.startTime,
        end: workingSchedule.endTime,
        isWorking: true,
      };
    }
    
    return null;
  }

  // Check if slot is in the past
  private isSlotInPast(slotStartMinutes: number, date: string, timezoneInfo: TimezoneInfo): boolean {
    const now = new Date();
    const slotDate = new Date(date);
    
    // Convert current time to the target timezone
    const currentTimeInTimezone = this.convertTimeToTimezone(now, timezoneInfo.timezone);
    const currentMinutes = this.timeToMinutes(currentTimeInTimezone);
    
    // If slot is for today and start time is before current time
    if (slotDate.toDateString() === now.toDateString()) {
      return slotStartMinutes < currentMinutes;
    }
    
    return false;
  }

  // Get current time in minutes
  private getCurrentTimeInMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  // Convert time string to minutes
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Convert minutes to time string
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Get timezone information
  private getTimezoneInfo(date: string, timezone: string): TimezoneInfo {
    try {
      const targetDate = new Date(date);
      
      // Use Intl API to get timezone information
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
      });
      
      const parts = formatter.formatToParts(targetDate);
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value;
      
      // Get timezone offset
      const utcDate = new Date(targetDate.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }));
      const offsetMs = tzDate.getTime() - utcDate.getTime();
      const offsetHours = Math.floor(offsetMs / (1000 * 60 * 60));
      const offsetMinutes = Math.floor((offsetMs % (1000 * 60 * 60)) / (1000 * 60));
      
      const offset = `${offsetHours >= 0 ? '+' : '-'}${Math.abs(offsetHours).toString().padStart(2, '0')}:${Math.abs(offsetMinutes).toString().padStart(2, '0')}`;
      
      // Check if DST is active (simplified check)
      const isDST = timeZoneName?.includes('DT') || timeZoneName?.includes('Daylight');
      
      return {
        timezone,
        offset,
        isDST,
      };
    } catch (error) {
      // Fallback to UTC
      return {
        timezone: 'UTC',
        offset: '+00:00',
        isDST: false,
      };
    }
  }

  // Convert time to timezone
  private convertTimeToTimezone(date: Date, timezone: string): string {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Generate cache key
  private generateCacheKey(request: AvailabilityRequest): string {
    const key = `${request.staffId}-${request.serviceId}-${request.date}-${request.timezone}-${request.duration}-${request.bufferBefore || 0}-${request.bufferAfter || 0}-${request.includeBufferInSlot}`;
    return Buffer.from(key).toString('base64');
  }

  // Cache operations
  private getFromCache(key: string): AvailabilityResponse | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > new Date()) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: AvailabilityResponse): void {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    this.cache.set(key, {
      data,
      expiresAt,
    });
  }

  // Mock methods (to be replaced with actual database calls)
  private async getWorkingSchedule(staffId: string, date: string, timezoneInfo: TimezoneInfo): Promise<any> {
    // Mock implementation - would query database
    const dayOfWeek = new Date(date).getDay();
    return {
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isWorking: dayOfWeek >= 1 && dayOfWeek <= 5, // Monday to Friday
      breaks: [
        { startTime: '12:00', endTime: '13:00' },
      ],
    };
  }

  private async getServiceInfo(serviceId: string): Promise<any> {
    // Mock implementation - would query database
    return {
      id: serviceId,
      durationMinutes: 60,
      bufferBefore: 15,
      bufferAfter: 15,
    };
  }

  private async getTimeOffs(staffId: string, date: string): Promise<any[]> {
    // Mock implementation - would query database
    return [];
  }

  private async getDateOverrides(staffId: string, date: string): Promise<any[]> {
    // Mock implementation - would query database
    return [];
  }

  // Get performance metrics
  getMetrics() {
    const cacheHitRate = this.metrics.requestCount > 0 
      ? this.metrics.cacheHits / this.metrics.requestCount 
      : 0;
    
    const averageGenerationTime = this.metrics.requestCount > 0
      ? this.metrics.totalGenerationTime / this.metrics.requestCount
      : 0;

    return {
      requestCount: this.metrics.requestCount,
      cacheHitRate,
      averageGenerationTime,
      concurrentRequests: this.metrics.concurrentRequests,
      errorRate: this.metrics.requestCount > 0 
        ? this.metrics.errors / this.metrics.requestCount 
        : 0,
      lastReset: this.metrics.lastReset,
    };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      cacheHits: 0,
      totalGenerationTime: 0,
      concurrentRequests: 0,
      errors: 0,
      lastReset: new Date().toISOString(),
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}
