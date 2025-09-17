import { CrudServiceConfig } from "@eicrud/core/crud";

export async function msConfig(): Promise<Partial<CrudServiceConfig>> {
    return {
        orm: undefined,
    };
}