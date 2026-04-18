export const safeArr = <T,>(v: T[] | undefined | null): T[] => Array.isArray(v) ? v : [];
