import { Link } from '@inertiajs/react';
import { Shelf } from '@/components/shelf';
import { initials } from '@/lib/format';
import items from '@/routes/items';
import type { Person } from '@/types';

export function PeopleShelf({ people }: { people: Person[] }) {
    if (people.length === 0) return null;

    return (
        <Shelf title="В ролях и съёмочная группа">
            {people.map((person, index) => (
                <Link
                    key={`${person.id}-${index}`}
                    href={items.show(person.id)}
                    prefetch
                    className="group w-28 shrink-0 snap-start text-center md:w-32"
                >
                    <div className="mx-auto mb-2.5 size-24 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/10 transition group-hover:ring-white/40 md:size-28">
                        {person.image ? (
                            <img
                                src={person.image}
                                alt=""
                                loading="lazy"
                                className="size-full object-cover"
                            />
                        ) : (
                            <div className="flex size-full items-center justify-center text-xl font-semibold text-muted-foreground">
                                {initials(person.name)}
                            </div>
                        )}
                    </div>
                    <div className="truncate text-sm font-medium">
                        {person.name}
                    </div>
                    {person.role && (
                        <div className="truncate text-xs text-muted-foreground">
                            {person.role}
                        </div>
                    )}
                </Link>
            ))}
        </Shelf>
    );
}
