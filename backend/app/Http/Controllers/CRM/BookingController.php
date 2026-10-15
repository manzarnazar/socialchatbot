<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactActivity;
use App\Models\BookingLink;
use App\Models\Appointment;
use App\Models\StaffMember;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class BookingController extends Controller
{
    protected \App\Services\GoogleCalendarService $calendarService;
    protected \App\Services\MeetingService $meetingService;

    public function __construct(
        \App\Services\GoogleCalendarService $calendarService,
        \App\Services\MeetingService $meetingService
    ) {
        $this->calendarService = $calendarService;
        $this->meetingService = $meetingService;
    }
    /**
     * List scheduled appointments and staff/resources.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        
        $query = Appointment::where('tenant_id', $tenant->id)
            ->with(['contact', 'bookingLink', 'staff:id,name,email,title,type,color'])
            ->orderBy('start_time', 'asc');

        if ($request->filled('staff_id') && $request->staff_id !== 'all') {
            $query->where('staff_id', $request->staff_id);
        } elseif ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where(function($q) use ($request) {
                $q->where('staff_id', $request->user_id)->orWhere('user_id', $request->user_id);
            });
        }

        $appointments = $query->get();

        $staffMembers = StaffMember::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->select('id', 'name', 'email', 'title', 'type', 'color')
            ->orderBy('name', 'asc')
            ->get();

        $teamMembers = User::where('tenant_id', $tenant->id)
            ->select('id', 'first_name', 'last_name', 'email', 'status')
            ->orderBy('first_name', 'asc')
            ->get();

        return response()->json([
            'appointments' => $appointments,
            'staff_members' => $staffMembers,
            'team_members' => $teamMembers,
        ]);
    }

    /**
     * Create appointment manually.
     */
    public function storeAppointment(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $request->validate([
            'contact_id' => [
                'required',
                Rule::exists('contacts', 'id')->where('tenant_id', $tenant->id)
            ],
            'booking_link_id' => [
                'nullable',
                Rule::exists('booking_links', 'id')->where('tenant_id', $tenant->id)
            ],
            'staff_id' => [
                'nullable',
                Rule::exists('staff_members', 'id')->where('tenant_id', $tenant->id)
            ],
            'user_id' => [
                'nullable',
                Rule::exists('tenant_users', 'id')->where('tenant_id', $tenant->id)
            ],
            'resource_name' => 'nullable|string|max:255',
            'start_time' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $startTime = Carbon::parse($request->start_time);
        $duration = 30; // default duration

        if ($request->booking_link_id) {
            $link = BookingLink::where('tenant_id', $tenant->id)->find($request->booking_link_id);
            if ($link) {
                $duration = $link->duration;
            }
        }

        $endTime = (clone $startTime)->addMinutes($duration);
        $targetStaffId = $request->staff_id;
        $targetUserId = $request->user_id;

        // If staff_id not provided but user_id provided, check if user is linked to staff_member
        if (!$targetStaffId && $targetUserId) {
            $linkedStaff = StaffMember::where('tenant_id', $tenant->id)->where('user_id', $targetUserId)->first();
            if ($linkedStaff) {
                $targetStaffId = $linkedStaff->id;
            }
        }

        // Per-Staff Conflict Check: only conflict if same staff/resource is booked
        $conflictQuery = Appointment::where('tenant_id', $tenant->id)
            ->where('status', 'scheduled')
            ->where(function ($q) use ($startTime, $endTime) {
                $q->whereBetween('start_time', [$startTime, $endTime])
                  ->orWhereBetween('end_time', [$startTime, $endTime])
                  ->orWhere(function ($sub) use ($startTime, $endTime) {
                      $sub->where('start_time', '<=', $startTime)
                          ->where('end_time', '>=', $endTime);
                  });
            });

        if ($targetStaffId) {
            $conflictQuery->where('staff_id', $targetStaffId);
        } elseif ($targetUserId) {
            $conflictQuery->where('user_id', $targetUserId);
        } elseif (!empty($request->resource_name)) {
            $conflictQuery->where('resource_name', $request->resource_name);
        }

        $conflict = $conflictQuery->exists();

        if ($conflict) {
            return response()->json(['message' => 'Time slot conflicts with an existing appointment for this staff member / resource.'], 422);
        }

        $appointment = Appointment::create([
            'tenant_id' => $tenant->id,
            'contact_id' => $request->contact_id,
            'booking_link_id' => $request->booking_link_id,
            'staff_id' => $targetStaffId,
            'user_id' => $targetUserId,
            'resource_name' => $request->resource_name,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'status' => 'scheduled',
            'notes' => $request->notes,
        ]);

        // Add Contact Activity
        ContactActivity::create([
            'tenant_id' => $tenant->id,
            'contact_id' => $request->contact_id,
            'type' => 'appointment_scheduled',
            'description' => "Appointment scheduled manually for " . $startTime->format('M d, Y h:i A'),
            'metadata' => [
                'appointment_id' => $appointment->id,
                'user_id' => $targetUserId,
                'resource_name' => $request->resource_name,
                'start_time' => $startTime->toIso8601String(),
            ]
        ]);

        $meetLink = $this->meetingService->generateMeetingLink($appointment);
        if ($meetLink) {
            $appointment->meeting_link = $meetLink;
            $appointment->save();
        }

        $this->calendarService->syncAppointment($appointment);

        return response()->json([
            'appointment' => $appointment->load(['contact', 'staff'])
        ], 201);
    }

    /**
     * Cancel an appointment.
     */
    public function cancelAppointment(Request $request, $id): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $appointment = Appointment::where('tenant_id', $tenant->id)->findOrFail($id);

        $appointment->update(['status' => 'cancelled']);

        // Add Contact Activity
        ContactActivity::create([
            'tenant_id' => $tenant->id,
            'contact_id' => $appointment->contact_id,
            'type' => 'appointment_cancelled',
            'description' => "Appointment on " . $appointment->start_time->format('M d, Y h:i A') . " was cancelled.",
            'metadata' => [
                'appointment_id' => $appointment->id,
            ]
        ]);

        $this->calendarService->deleteEvent($appointment);
        $this->meetingService->deleteMeeting($appointment);

        return response()->json([
            'appointment' => $appointment
        ]);
    }

    /**
     * List scheduling configuration links.
     */
    public function listBookingLinks(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $links = BookingLink::where('tenant_id', $tenant->id)
            ->with('staff:id,name,email,title,type,color')
            ->get();

        $staffMembers = StaffMember::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->select('id', 'name', 'email', 'title', 'type', 'color')
            ->orderBy('name', 'asc')
            ->get();

        $teamMembers = User::where('tenant_id', $tenant->id)
            ->select('id', 'first_name', 'last_name', 'email')
            ->get();

        return response()->json([
            'booking_links' => $links,
            'staff_members' => $staffMembers,
            'team_members' => $teamMembers,
        ]);
    }

    /**
     * Store/create a booking link configuration.
     */
    public function storeBookingLink(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255',
            'staff_id' => [
                'nullable',
                Rule::exists('staff_members', 'id')->where('tenant_id', $tenant->id)
            ],
            'user_id' => [
                'nullable',
                Rule::exists('tenant_users', 'id')->where('tenant_id', $tenant->id)
            ],
            'assign_mode' => 'nullable|string|in:single,round_robin,collective,select_resource',
            'resource_pool' => 'nullable|array',
            'description' => 'nullable|string',
            'duration' => 'required|integer|min:5',
            'buffer_before' => 'nullable|integer|min:0',
            'buffer_after' => 'nullable|integer|min:0',
            'working_hours' => 'nullable|array',
            'location_type' => 'nullable|string|in:none,google_meet,zoom,teams,custom',
            'custom_location' => 'nullable|string',
        ]);

        $slug = preg_replace('/[^a-z0-9\-]/', '', strtolower($request->slug));

        // Check uniqueness per tenant
        $exists = BookingLink::where('tenant_id', $tenant->id)
            ->where('slug', $slug)
            ->where('id', '!=', $request->id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'The slug is already taken.'], 422);
        }

        $defaultWorkingHours = [
            'monday' => [['start' => '09:00', 'end' => '17:00']],
            'tuesday' => [['start' => '09:00', 'end' => '17:00']],
            'wednesday' => [['start' => '09:00', 'end' => '17:00']],
            'thursday' => [['start' => '09:00', 'end' => '17:00']],
            'friday' => [['start' => '09:00', 'end' => '17:00']],
            'saturday' => [],
            'sunday' => []
        ];

        $targetStaffId = $request->staff_id;
        $targetUserId = $request->user_id;
        if (!$targetStaffId && $targetUserId) {
            $linkedStaff = StaffMember::where('tenant_id', $tenant->id)->where('user_id', $targetUserId)->first();
            if ($linkedStaff) {
                $targetStaffId = $linkedStaff->id;
            }
        }

        $link = BookingLink::updateOrCreate(
            ['tenant_id' => $tenant->id, 'id' => $request->id],
            [
                'name' => $request->name,
                'slug' => $slug,
                'staff_id' => $targetStaffId,
                'user_id' => $targetUserId,
                'assign_mode' => $request->assign_mode ?? 'single',
                'resource_pool' => $request->resource_pool,
                'description' => $request->description,
                'duration' => $request->duration,
                'buffer_before' => $request->buffer_before ?? 0,
                'buffer_after' => $request->buffer_after ?? 0,
                'working_hours' => $request->working_hours ?? $defaultWorkingHours,
                'is_active' => $request->is_active ?? true,
                'location_type' => $request->location_type ?? 'none',
                'custom_location' => $request->custom_location,
            ]
        );

        return response()->json([
            'booking_link' => $link->load('staff:id,name,email,title,type,color')
        ]);
    }

    /**
     * Delete booking link configuration.
     */
    public function deleteBookingLink(Request $request, $id): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $link = BookingLink::where('tenant_id', $tenant->id)->findOrFail($id);
        $link->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Public show route (get links options, working hours, and available dates).
     */
    public function publicShowLink(Request $request, $slug): JsonResponse
    {
        $linkQuery = BookingLink::where('slug', $slug)->where('is_active', true);
        if ($request->filled('tenant_id')) {
            $linkQuery->where('tenant_id', $request->query('tenant_id'));
        }
        $link = $linkQuery->with('staff:id,name,email,title,type,color')->firstOrFail();

        $dateStr = $request->query('date');
        $targetStaffId = $request->query('staff_id') ?: $link->staff_id;
        $targetUserId = $request->query('user_id') ?: $link->user_id;
        $slots = [];

        if ($dateStr) {
            $date = Carbon::parse($dateStr);
            $dayOfWeek = strtolower($date->format('l'));
            $workingHours = $link->working_hours[$dayOfWeek] ?? [];

            // Get existing appointments for that tenant (and specific staff if assigned)
            $existingQuery = Appointment::where('tenant_id', $link->tenant_id)
                ->where('status', 'scheduled')
                ->whereDate('start_time', $date->toDateString());

            if ($targetStaffId) {
                $existingQuery->where('staff_id', $targetStaffId);
            } elseif ($targetUserId) {
                $existingQuery->where(function ($q) use ($targetUserId) {
                    $q->where('user_id', $targetUserId)->orWhereNull('user_id');
                });
            }

            $existing = $existingQuery->get();

            // Fetch live Google busy slots for the day (using staff calendar if configured)
            $staffCalId = 'primary';
            if ($targetStaffId) {
                $targetStaff = \App\Models\StaffMember::find($targetStaffId);
                if ($targetStaff && $targetStaff->google_sync_enabled && !empty($targetStaff->google_calendar_id)) {
                    $staffCalId = trim($targetStaff->google_calendar_id);
                }
            }
            $googleBusy = $this->calendarService->checkGoogleBusySlots($link->tenant_id, $date->copy()->startOfDay(), $date->copy()->endOfDay(), $staffCalId);

            foreach ($workingHours as $slotRange) {
                $startHour = Carbon::parse($dateStr . ' ' . $slotRange['start']);
                $endHour = Carbon::parse($dateStr . ' ' . $slotRange['end']);

                $curr = clone $startHour;
                while ($curr->copy()->addMinutes($link->duration)->lte($endHour)) {
                    $slotStart = clone $curr;
                    $slotEnd = $slotStart->copy()->addMinutes($link->duration);

                    // Conflict check with existing bookings including buffer before & after
                    $overlap = false;
                    foreach ($existing as $app) {
                        $appStart = $app->start_time->copy()->subMinutes($link->buffer_before);
                        $appEnd = $app->end_time->copy()->addMinutes($link->buffer_after);

                        if ($slotStart->lt($appEnd) && $slotEnd->gt($appStart)) {
                            $overlap = true;
                            break;
                        }
                    }

                    // Conflict check with Google busy slots
                    if (!$overlap) {
                        foreach ($googleBusy as $busy) {
                            $busyStart = $busy['start']->copy()->subMinutes($link->buffer_before);
                            $busyEnd = $busy['end']->copy()->addMinutes($link->buffer_after);

                            if ($slotStart->lt($busyEnd) && $slotEnd->gt($busyStart)) {
                                $overlap = true;
                                break;
                            }
                        }
                    }

                    if (!$overlap) {
                        $slots[] = $slotStart->toIso8601String();
                    }

                    $curr->addMinutes($link->duration);
                }
            }
        }

        // Available staff members for multi-resource public selection
        $availableStaff = [];
        if ($link->assign_mode === 'select_resource' && !empty($link->resource_pool)) {
            $availableStaff = StaffMember::where('tenant_id', $link->tenant_id)
                ->where('is_active', true)
                ->whereIn('id', $link->resource_pool)
                ->select('id', 'name', 'email', 'title', 'type', 'color')
                ->get();
        }

        return response()->json([
            'booking_link' => [
                'id' => $link->id,
                'name' => $link->name,
                'description' => $link->description,
                'duration' => $link->duration,
                'tenant_name' => $link->tenant->company_name,
                'staff' => $link->staff,
                'assign_mode' => $link->assign_mode,
                'available_staff' => $availableStaff,
            ],
            'slots' => $slots
        ]);
    }

    /**
     * Public booking creation.
     */
    public function publicBook(Request $request, $slug): JsonResponse
    {
        $linkQuery = BookingLink::where('slug', $slug)->where('is_active', true);
        if ($request->filled('tenant_id')) {
            $linkQuery->where('tenant_id', $request->input('tenant_id'));
        }
        $link = $linkQuery->firstOrFail();

        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:50',
            'start_time' => 'required|date',
            'staff_id' => [
                'nullable',
                Rule::exists('staff_members', 'id')->where('tenant_id', $link->tenant_id)
            ],
            'user_id' => [
                'nullable',
                Rule::exists('tenant_users', 'id')->where('tenant_id', $link->tenant_id)
            ],
            'notes' => 'nullable|string',
        ]);

        $startTime = Carbon::parse($request->start_time);
        $endTime = $startTime->copy()->addMinutes($link->duration);

        // Resolve staff assignment based on booking link mode
        $targetStaffId = $request->staff_id ?: $link->staff_id;
        $targetUserId = $request->user_id ?: $link->user_id;

        if (!$targetStaffId && $link->assign_mode === 'round_robin' && !empty($link->resource_pool)) {
            // Pick staff member with least upcoming appointments
            $poolIds = $link->resource_pool;
            $nextStaff = StaffMember::where('tenant_id', $link->tenant_id)
                ->where('is_active', true)
                ->whereIn('id', $poolIds)
                ->withCount(['appointments' => function ($q) {
                    $q->where('status', 'scheduled')->where('start_time', '>=', now());
                }])
                ->orderBy('appointments_count', 'asc')
                ->first();

            $targetStaffId = $nextStaff ? $nextStaff->id : null;
        }

        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $slug, $link, $startTime, $endTime, $targetStaffId, $targetUserId) {
            // Verification of slots conflicts for targeted staff with lock
            $existingQuery = Appointment::where('tenant_id', $link->tenant_id)
                ->where('status', 'scheduled')
                ->whereDate('start_time', $startTime->toDateString())
                ->lockForUpdate();

            if ($targetStaffId) {
                $existingQuery->where('staff_id', $targetStaffId);
            } elseif ($targetUserId) {
                $existingQuery->where(function ($q) use ($targetUserId) {
                    $q->where('user_id', $targetUserId)->orWhereNull('user_id');
                });
            }

            $existing = $existingQuery->get();

            $overlap = false;
            foreach ($existing as $app) {
                $appStart = $app->start_time->copy()->subMinutes($link->buffer_before);
                $appEnd = $app->end_time->copy()->addMinutes($link->buffer_after);

                if ($startTime->lt($appEnd) && $endTime->gt($appStart)) {
                    $overlap = true;
                    break;
                }
            }

            if (!$overlap) {
                $staffCalId = 'primary';
                if ($targetStaffId) {
                    $targetStaff = StaffMember::find($targetStaffId);
                    if ($targetStaff && $targetStaff->google_sync_enabled && !empty($targetStaff->google_calendar_id)) {
                        $staffCalId = trim($targetStaff->google_calendar_id);
                    }
                }
                $googleBusy = $this->calendarService->checkGoogleBusySlots($link->tenant_id, $startTime->copy()->startOfDay(), $startTime->copy()->endOfDay(), $staffCalId);
                foreach ($googleBusy as $busy) {
                    $busyStart = $busy['start']->copy()->subMinutes($link->buffer_before);
                    $busyEnd = $busy['end']->copy()->addMinutes($link->buffer_after);

                    if ($startTime->lt($busyEnd) && $endTime->gt($busyStart)) {
                        $overlap = true;
                        break;
                    }
                }
            }

            if ($overlap) {
                return response()->json(['message' => 'Selected slot is no longer available for this specialist.'], 422);
            }

            // Auto Match or Create Contact
            $contact = Contact::updateOrCreate(
                ['tenant_id' => $link->tenant_id, 'email' => $request->email],
                [
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'phone' => $request->phone,
                ]
            );

            $appointment = Appointment::create([
                'tenant_id' => $link->tenant_id,
                'contact_id' => $contact->id,
                'booking_link_id' => $link->id,
                'staff_id' => $targetStaffId,
                'user_id' => $targetUserId,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'status' => 'scheduled',
                'notes' => $request->notes,
            ]);

            // Add Contact Activity Log
            ContactActivity::create([
                'tenant_id' => $link->tenant_id,
                'contact_id' => $contact->id,
                'type' => 'appointment_scheduled',
                'description' => "Appointment booked via public link [{$link->name}] for " . $startTime->format('M d, Y h:i A'),
                'metadata' => [
                    'appointment_id' => $appointment->id,
                    'booking_link_slug' => $slug,
                    'staff_id' => $targetStaffId,
                    'user_id' => $targetUserId,
                    'start_time' => $startTime->toIso8601String(),
                ]
            ]);

            $meetLink = $this->meetingService->generateMeetingLink($appointment);
            if ($meetLink) {
                $appointment->meeting_link = $meetLink;
                $appointment->save();
            }

            $this->calendarService->syncAppointment($appointment);

            return response()->json([
                'success' => true,
                'appointment' => $appointment->load('staff')
            ]);
        });
    }
}
