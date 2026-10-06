import type { Library, User } from '@/types';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: { user: User | null };
            libraries?: Library[];
            builtIn?: {
                home: string;
                preferences: string;
                dashboard: string | null;
            };
            [key: string]: unknown;
        };
        flashDataType: {
            toast?: import('@/types').Toast;
        };
    }
}
