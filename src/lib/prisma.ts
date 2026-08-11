import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { requiredEnv } from "./env";

let client: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: requiredEnv("DATABASE_URL") }),
    });
  }
  return client;
}
