<?php

namespace App\Services;

use App\Models\TenantGoogleToken;
use App\Models\Appointment;
use Google\Service\Calendar as GoogleCalendarApi;
use Google\Service\Calendar\Event as GoogleEvent;
use Google\Service\Calendar\EventDateTime as GoogleEventDateTime;
use Google\Service\Calendar\FreeBusyRequest as GoogleFreeBusyRequest;
use Google\Service\Calendar\FreeBusyRequestItem as GoogleFreeBusyRequestItem;
use Exception;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GoogleCalendarService
{
    protected GoogleSheetsService $sheetsService;

    public function __construct(GoogleSheetsService $sheetsService)
    {
        $this->sheetsService = $sheetsService;
    }

    /**
     * Determine the Google Calendar ID to sync to.
     * Uses staff member's google_calendar_id if configured and sync enabled, otherwise 'primary'.
     */
    public function getTargetCalendarId(Appointment $appointment): string
    {
        if ($appointment->staff && $appointment->staff->google_sync_enabled && !empty($appointment->staff->google_calendar_id)) {
            return trim($appointment->staff->google_calendar_id);
        }

        return 'primary';
    }

    /**
     * Synchronize a WhatsOmni appointment with Google Calendar (create or update).
     */
    public function syncAppointment(Appointment $appointment, ?string $targetCalendarId = null): void
    {
        try {
            $tokenModel = TenantGoogleToken::where('tenant_id', $appointment->tenant_id)->where('type', 'calendar')->first();
            if (!$tokenModel) {
                return;
            }

            $client = $this->sheetsService->getClient($tokenModel, 'calendar');
            $service = new GoogleCalendarApi($client);

            $calendarId = $targetCalendarId ?: $this->getTargetCalendarId($appointment);

            $contactName = $appointment->contact 
                ? "{$appointment->contact->first_name} {$appointment->contact->last_name}" 
                : 'Client';

            $summary = "WhatsOmni Booking: " . $contactName;
            if ($appointment->bookingLink) {
                $summary = "{$appointment->bookingLink->name} - " . $contactName;
            }
            if ($appointment->staff) {
                $summary .= " (Staff: {$appointment->staff->name})";
            }

            $description = "WhatsOmni Scheduled Appointment\n";
            if ($appointment->staff) {
                $description .= "Staff: {$appointment->staff->name}" . ($appointment->staff->title ? " ({$appointment->staff->title})" : "") . "\n";
            }
            $description .= "Contact: " . ($appointment->contact ? "{$appointment->contact->first_name} {$appointment->contact->last_name} ({$appointment->contact->email} / {$appointment->contact->phone})" : 'Unknown') . "\n";
            if ($appointment->meeting_link) {
                $description .= "Join Meeting: " . $appointment->meeting_link . "\n";
            }
            if ($appointment->notes) {
                $description .= "Client Notes: " . $appointment->notes . "\n";
            }

            $eventData = [
                'summary' => $summary,
                'description' => $description,
                'start' => new GoogleEventDateTime([
                    'dateTime' => $appointment->start_time->toIso8601String(),
                    'timeZone' => 'UTC',
                ]),
                'end' => new GoogleEventDateTime([
                    'dateTime' => $appointment->end_time->toIso8601String(),
                    'timeZone' => 'UTC',
                ]),
            ];

            $isGoogleMeet = $appointment->bookingLink && $appointment->bookingLink->location_type === 'google_meet';

            if ($isGoogleMeet) {
                $eventData['conferenceData'] = [
                    'createRequest' => [
                        'requestId' => uniqid(),
                        'conferenceSolutionKey' => [
                            'type' => 'hangoutsMeet'
                        ]
                    ]
                ];
            }

            if ($appointment->contact && !empty($appointment->contact->email)) {
                $attendee = new \Google\Service\Calendar\EventAttendee([
                    'email' => $appointment->contact->email,
                    'displayName' => trim("{$appointment->contact->first_name} {$appointment->contact->last_name}") ?: null,
                    'responseStatus' => 'needsAction',
                ]);
                $eventData['attendees'] = [$attendee];
            }

            $event = new GoogleEvent($eventData);

            $optParams = [
                'sendUpdates' => 'all',
            ];
            if ($isGoogleMeet) {
                $optParams['conferenceDataVersion'] = 1;
            }

            if ($appointment->google_event_id) {
                try {
                    $updatedEvent = $service->events->update($calendarId, $appointment->google_event_id, $event, $optParams);
                    if ($isGoogleMeet && $updatedEvent->getHangoutLink()) {
                        $appointment->meeting_link = $updatedEvent->getHangoutLink();
                        $appointment->saveQuietly();
                    }
                    return;
                } catch (Exception $e) {
                    Log::warning("Google Calendar update failed for [{$calendarId}], trying to recreate: " . $e->getMessage());
                }
            }

            // Create new event
            $newEvent = $service->events->insert($calendarId, $event, $optParams);
            
            // Save without triggers to avoid infinite loops
            $appointment->google_event_id = $newEvent->getId();
            
            if ($isGoogleMeet && $newEvent->getHangoutLink()) {
                $appointment->meeting_link = $newEvent->getHangoutLink();
            }
            
            $appointment->saveQuietly();

        } catch (Exception $e) {
            Log::error("Google Calendar Sync Error for staff calendar: " . $e->getMessage());
        }
    }

    /**
     * Delete a Google Calendar event.
     */
    public function deleteEvent(Appointment $appointment, ?string $targetCalendarId = null): void
    {
        try {
            if (!$appointment->google_event_id) {
                return;
            }

            $tokenModel = TenantGoogleToken::where('tenant_id', $appointment->tenant_id)->where('type', 'calendar')->first();
            if (!$tokenModel) {
                return;
            }

            $client = $this->sheetsService->getClient($tokenModel, 'calendar');
            $service = new GoogleCalendarApi($client);

            $calendarId = $targetCalendarId ?: $this->getTargetCalendarId($appointment);

            try {
                $service->events->delete($calendarId, $appointment->google_event_id);
            } catch (Exception $e) {
                Log::warning("Google Calendar Event delete failed on [{$calendarId}] (might be already deleted): " . $e->getMessage());
            }

            $appointment->google_event_id = null;
            $appointment->saveQuietly();

        } catch (Exception $e) {
            Log::error("Google Calendar Delete Event Error: " . $e->getMessage());
        }
    }

    /**
     * Check busy slots of a tenant's or staff member's Google Calendar.
     * Returns an array of busy intervals: [['start' => Carbon, 'end' => Carbon]]
     */
    public function checkGoogleBusySlots(int $tenantId, Carbon $start, Carbon $end, string $calendarId = 'primary'): array
    {
        try {
            $tokenModel = TenantGoogleToken::where('tenant_id', $tenantId)->where('type', 'calendar')->first();
            if (!$tokenModel) {
                return [];
            }

            $client = $this->sheetsService->getClient($tokenModel, 'calendar');
            $service = new GoogleCalendarApi($client);

            $calId = trim($calendarId) ?: 'primary';

            $request = new GoogleFreeBusyRequest();
            $request->setTimeMin($start->toIso8601String());
            $request->setTimeMax($end->toIso8601String());
            
            $item = new GoogleFreeBusyRequestItem();
            $item->setId($calId);
            $request->setItems([$item]);

            $query = $service->freebusy->query($request);
            $calendars = $query->getCalendars();
            $targetCal = $calendars[$calId] ?? $calendars['primary'] ?? null;

            if (!$targetCal) {
                return [];
            }

            if (!empty($targetCal->getErrors())) {
                Log::warning("Google Calendar FreeBusy reported errors for [{$calId}]: " . json_encode($targetCal->getErrors()));
            }

            $busyIntervals = [];
            foreach ($targetCal->getBusy() as $interval) {
                $busyIntervals[] = [
                    'start' => Carbon::parse($interval->getStart()),
                    'end' => Carbon::parse($interval->getEnd()),
                ];
            }

            return $busyIntervals;

        } catch (Exception $e) {
            Log::error("Google Calendar Busy Slots Query Error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Verify if the tenant's connected Google Account can access the specified Calendar ID.
     */
    public function verifyCalendarAccess(int $tenantId, string $calendarId): array
    {
        try {
            $tokenModel = TenantGoogleToken::where('tenant_id', $tenantId)->where('type', 'calendar')->first();
            if (!$tokenModel) {
                return [
                    'success' => false,
                    'message' => 'No Google Calendar account is connected to this workspace. Please connect Google Calendar in Settings > Integrations.'
                ];
            }

            $client = $this->sheetsService->getClient($tokenModel, 'calendar');
            $service = new GoogleCalendarApi($client);

            $calId = trim($calendarId) ?: 'primary';
            $cal = $service->calendars->get($calId);

            return [
                'success' => true,
                'message' => "Successfully connected to Google Calendar: " . ($cal->getSummary() ?: $calId),
                'summary' => $cal->getSummary(),
                'timeZone' => $cal->getTimeZone(),
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => "Google Calendar connection failed: " . $e->getMessage()
            ];
        }
    }
}
