export function categoryLabel(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export const OTHER_CATEGORY = "__other__";

export function apiErrorMessage(error: unknown, fallback: string): string {
    if (
        error !== null &&
        typeof error === "object" &&
        "data" in error &&
        error.data !== null &&
        typeof error.data === "object"
    ) {
        const data = error.data as Record<string, unknown>;
        if (typeof data.error === "string") {
            return data.error;
        }
        if (typeof data.detail === "string") {
            return data.detail;
        }
        if (Array.isArray(data.non_field_errors) && typeof data.non_field_errors[0] === "string") {
            return data.non_field_errors[0];
        }
        for (const value of Object.values(data)) {
            if (Array.isArray(value) && typeof value[0] === "string") {
                return value[0];
            }
        }
    }
    return fallback;
}


export function todayDateValue(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function toDateBought(date: string): string {
    return `${date}T00:00:00`;
}

export function toDateInputValue(dateBought: string): string {
    return dateBought.slice(0, 10);
}