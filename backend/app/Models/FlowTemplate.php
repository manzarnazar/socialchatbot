<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FlowTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'flow_templates';

    protected $fillable = [
        'slug',
        'name',
        'category',
        'description',
        'trigger_type',
        'trigger_keywords',
        'definition',
        'nodes_count',
        'is_published',
        'sort_order',
    ];

    protected $casts = [
        'trigger_keywords' => 'array',
        'definition' => 'array',
        'nodes_count' => 'integer',
        'is_published' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            if (is_array($model->definition) && isset($model->definition['nodes']) && is_array($model->definition['nodes'])) {
                $model->nodes_count = count($model->definition['nodes']);
            }
        });
    }
}
