// Plain data, importable from both the Server Component (flag lookup) and the
// Client Component (rendering) — kept out of the "use client" file because a
// Server Component importing a named export from a client module gets a
// client-reference proxy back, not the actual value.
export const MODULE_KEYS = ['events', 'hackathons', 'iconcoders', 'codequest', 'career', 'blogs'] as const;
