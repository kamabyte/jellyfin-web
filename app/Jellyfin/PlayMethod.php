<?php

namespace App\Jellyfin;

/** Как идёт поток; то же значение плеер сообщает серверу в отчётах. */
enum PlayMethod: string
{
    case DirectPlay = 'DirectPlay';
    case Transcode = 'Transcode';
}
