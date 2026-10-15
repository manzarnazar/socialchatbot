<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class OnboardingController extends Controller
{
    /**
     * Step 1: Save Company Details and progress to Step 2.
     */
    public function saveStep1(Request $request): JsonResponse
    {
        $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'team_size' => ['required', 'string', 'max:255'],
            'industry_category' => ['required', 'string', 'max:255'],
        ]);

        $tenant = $request->user()->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        $tenant->update([
            'company_name' => $request->company_name,
            'team_size' => $request->team_size,
            'industry_category' => $request->industry_category,
            'onboarding_step' => '2',
        ]);

        return response()->json([
            'message' => 'Workspace profile saved. Progressing to integration step.',
            'tenant' => $tenant,
        ]);
    }

    public function saveStep2(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        $tenant->update([
            'onboarding_step' => '3',
            'status' => 'trial', // default status on free trial
        ]);

        return response()->json([
            'message' => 'Workspace onboarding finished successfully.',
            'tenant' => $tenant,
        ]);
    }

    /**
     * Step 3: Complete Onboarding (e.g. bypass subscription checkouts or default trialing tier).
     */
    public function saveStep3(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        if (!$tenant) {
            return response()->json(['message' => 'Workspace context not resolved.'], 404);
        }

        $tenant->update([
            'onboarding_step' => 'complete',
            'status' => 'trial', // default status on free trial finish if no Stripe subscription completes
            'trial_ends_at' => $tenant->trial_ends_at ?: now()->addDays(14),
        ]);

        return response()->json([
            'message' => 'Workspace onboarding finished successfully.',
            'tenant' => $tenant,
        ]);
    }
}
