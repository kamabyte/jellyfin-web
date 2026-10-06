<?php

namespace App\Http\Requests;

use App\Jellyfin\PlayMethod;
use App\Jellyfin\Ticks;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Отчёт плеера: где остановились, на паузе ли, какие дорожки.
 */
class ReportPlaybackRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'itemId' => ['required', 'string', 'max:64'],
            'mediaSourceId' => ['required', 'string', 'max:64'],
            'playSessionId' => ['required', 'string', 'max:64'],
            'position' => ['required', 'numeric', 'min:0'],
            'paused' => ['boolean'],
            'playMethod' => ['required', Rule::enum(PlayMethod::class)],
            'audioStreamIndex' => ['nullable', 'integer'],
            'subtitleStreamIndex' => ['nullable', 'integer'],
        ];
    }

    /**
     * Тело для /Sessions/Playing*.
     *
     * @return array<string, mixed>
     */
    public function body(): array
    {
        return [
            'ItemId' => $this->string('itemId')->toString(),
            'MediaSourceId' => $this->string('mediaSourceId')->toString(),
            'PlaySessionId' => $this->string('playSessionId')->toString(),
            'PositionTicks' => Ticks::fromSeconds((float) $this->input('position')),
            'IsPaused' => $this->boolean('paused'),
            'PlayMethod' => $this->enum('playMethod', PlayMethod::class)?->value,
            'AudioStreamIndex' => $this->filled('audioStreamIndex') ? $this->integer('audioStreamIndex') : null,
            'SubtitleStreamIndex' => $this->filled('subtitleStreamIndex') ? $this->integer('subtitleStreamIndex') : -1,
            'CanSeek' => true,
        ];
    }
}
