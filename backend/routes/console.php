<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

Schedule::command('quota:reconcile')->daily()->withoutOverlapping();
Schedule::command('imap:poll')->everyTwoMinutes()->withoutOverlapping();
Schedule::command('campaigns:dispatch')->everyMinute()->withoutOverlapping();
Schedule::command('flows:resume')->everyMinute()->withoutOverlapping();
Schedule::command('social-posts:dispatch-scheduled')->everyMinute()->withoutOverlapping();

