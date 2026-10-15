<?php

namespace App\Observers;

use App\Models\Contact;
use App\Jobs\SyncContactToCrmJob;

class ContactObserver
{
    public static bool $bypass = false;

    /**
     * Handle the Contact "created" event.
     */
    public function created(Contact $contact): void
    {
        if (self::$bypass) {
            return;
        }

        SyncContactToCrmJob::dispatch($contact);
    }

    /**
     * Handle the Contact "updated" event.
     */
    public function updated(Contact $contact): void
    {
        if (self::$bypass) {
            return;
        }

        SyncContactToCrmJob::dispatch($contact);
    }
}
