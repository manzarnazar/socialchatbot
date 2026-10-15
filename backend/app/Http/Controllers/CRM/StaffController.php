<?php

namespace App\Http\Controllers\CRM;

use App\Http\Controllers\Controller;
use App\Models\StaffMember;
use App\Models\Appointment;
use App\Models\BookingLink;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    protected GoogleCalendarService $calendarService;

    public function __construct(GoogleCalendarService $calendarService)
    {
        $this->calendarService = $calendarService;
    }

    public function index(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        
        $query = StaffMember::where('tenant_id', $tenantId);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        } else {
            $query->where('type', 'staff');
        }

        if ($request->has('is_active') && $request->is_active !== null && $request->is_active !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('title', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%")
                  ->orWhere('google_calendar_id', 'like', "%{$s}%");
            });
        }

        $staff = $query->with('user:id,first_name,last_name,email')
                       ->orderBy('name', 'asc')
                       ->get();

        // Calculate stats
        $totalStaff = StaffMember::where('tenant_id', $tenantId)->where('type', 'staff')->count();
        $activeCount = StaffMember::where('tenant_id', $tenantId)->where('type', 'staff')->where('is_active', true)->count();
        $bookedAppointments = Appointment::where('tenant_id', $tenantId)
            ->whereNotNull('staff_id')
            ->where('status', 'scheduled')
            ->count();

        return response()->json([
            'staff' => $staff,
            'stats' => [
                'total_staff' => $totalStaff,
                'active_count' => $activeCount,
                'booked_appointments' => $bookedAppointments,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'title' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:30',
            'avatar_url' => 'nullable|string|max:500',
            'working_hours' => 'nullable|array',
            'google_calendar_id' => 'nullable|string|max:255',
            'google_sync_enabled' => 'nullable|boolean',
            'user_id' => 'nullable|exists:tenant_users,id',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['tenant_id'] = $tenantId;
        $validated['type'] = $validated['type'] ?? 'staff';
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['google_sync_enabled'] = $validated['google_sync_enabled'] ?? false;
        if (empty($validated['color'])) {
            $validated['color'] = '#10B981';
        }

        $staffMember = StaffMember::create($validated);

        return response()->json([
            'message' => 'Staff member created successfully',
            'staff' => $staffMember->load('user:id,first_name,last_name,email')
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $staffMember = StaffMember::where('tenant_id', $tenantId)
            ->with(['user:id,first_name,last_name,email'])
            ->findOrFail($id);

        return response()->json([
            'staff' => $staffMember
        ]);
    }

    public function update(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $staffMember = StaffMember::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'title' => 'nullable|string|max:255',
            'type' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:30',
            'avatar_url' => 'nullable|string|max:500',
            'working_hours' => 'nullable|array',
            'google_calendar_id' => 'nullable|string|max:255',
            'google_sync_enabled' => 'nullable|boolean',
            'user_id' => 'nullable|exists:tenant_users,id',
            'is_active' => 'nullable|boolean',
        ]);

        $staffMember->update($validated);

        return response()->json([
            'message' => 'Staff member updated successfully',
            'staff' => $staffMember->load('user:id,first_name,last_name,email')
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $staffMember = StaffMember::where('tenant_id', $tenantId)->findOrFail($id);

        // Nullify foreign key references in past appointments / booking links
        Appointment::where('tenant_id', $tenantId)->where('staff_id', $id)->update(['staff_id' => null]);
        BookingLink::where('tenant_id', $tenantId)->where('staff_id', $id)->update(['staff_id' => null]);

        $staffMember->delete();

        return response()->json([
            'message' => 'Staff member removed successfully'
        ]);
    }

    public function toggleStatus(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $staffMember = StaffMember::where('tenant_id', $tenantId)->findOrFail($id);

        $staffMember->is_active = !$staffMember->is_active;
        $staffMember->save();

        return response()->json([
            'message' => 'Staff status updated successfully',
            'is_active' => $staffMember->is_active
        ]);
    }

    public function testGoogleCalendar(Request $request, $id)
    {
        $tenantId = $request->user()->tenant_id;
        $staffMember = StaffMember::where('tenant_id', $tenantId)->findOrFail($id);

        $calendarId = $request->input('google_calendar_id', $staffMember->google_calendar_id) ?: 'primary';
        $result = $this->calendarService->verifyCalendarAccess($tenantId, $calendarId);

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function verifyGoogleCalendar(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $request->validate([
            'google_calendar_id' => 'required|string|max:255'
        ]);

        $calendarId = $request->input('google_calendar_id');
        $result = $this->calendarService->verifyCalendarAccess($tenantId, $calendarId);

        return response()->json($result, $result['success'] ? 200 : 422);
    }
}
