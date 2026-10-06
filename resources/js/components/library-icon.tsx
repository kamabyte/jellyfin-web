import {
    BookOpen,
    Clapperboard,
    Film,
    FolderOpen,
    Library,
    ListMusic,
    type LucideIcon,
    Music,
    Radio,
    Tv,
} from 'lucide-react';
import type { Library as LibraryType } from '@/types';

const ICONS: Record<string, LucideIcon> = {
    movies: Film,
    tvshows: Tv,
    music: Music,
    musicvideos: Clapperboard,
    livetv: Radio,
    books: BookOpen,
    playlists: ListMusic,
    boxsets: Library,
};

export function libraryIcon(library: LibraryType): LucideIcon {
    return ICONS[library.collectionType ?? ''] ?? FolderOpen;
}
