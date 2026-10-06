<?php

namespace App\Http\Requests;

use App\Jellyfin\DeviceProfile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Плеер спрашивает, как играть: что умеет браузер, с какого места и с какими
 * дорожками. Неизвестные кодеки отбрасываются — профиль из них не строится.
 */
class PlaybackRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'codecs' => ['required', 'array'],
            'codecs.*' => ['string', 'max:20'],
            'containers' => ['array'],
            'containers.*' => ['string', Rule::in(DeviceProfile::CONTAINERS)],
            'dolbyVision' => ['boolean'],
            'directPlay' => ['boolean'],
            'audioTrackSwitching' => ['boolean'],
            'startAt' => ['nullable', 'numeric', 'min:0'],
            'mediaSourceId' => ['nullable', 'string', 'max:64'],
            'audioStreamIndex' => ['nullable', 'integer', 'min:0'],
            'burnSubtitleIndex' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return list<string>
     */
    public function codecs(): array
    {
        /** @var list<string> $codecs */
        $codecs = $this->array('codecs');

        return array_values(array_intersect($codecs, [...DeviceProfile::VIDEO_CODECS, ...DeviceProfile::AUDIO_CODECS]));
    }

    /**
     * @return list<string>
     */
    public function containers(): array
    {
        /** @var list<string> $containers */
        $containers = $this->array('containers');

        return $containers;
    }

    public function dolbyVision(): bool
    {
        return $this->boolean('dolbyVision');
    }

    /**
     * false — файл как есть не открылся, хотя браузер обещал: просим
     * перепаковку или перекодирование.
     */
    public function directPlay(): bool
    {
        return $this->boolean('directPlay', true);
    }

    /**
     * Умеет ли браузер переключать дорожки звука внутри файла (Safari).
     * Остальные играют только дорожку по умолчанию.
     */
    public function audioTrackSwitching(): bool
    {
        return $this->boolean('audioTrackSwitching');
    }

    public function startAt(): float
    {
        return (float) $this->input('startAt', 0);
    }

    public function mediaSourceId(): ?string
    {
        return $this->filled('mediaSourceId') ? $this->string('mediaSourceId')->toString() : null;
    }

    public function audioStreamIndex(): ?int
    {
        return $this->filled('audioStreamIndex') ? $this->integer('audioStreamIndex') : null;
    }

    /**
     * Картиночные субтитры, которые придётся вшить в видео. Текстовые
     * плеер показывает сам и о них не спрашивает.
     */
    public function burnSubtitleIndex(): ?int
    {
        return $this->filled('burnSubtitleIndex') ? $this->integer('burnSubtitleIndex') : null;
    }
}
