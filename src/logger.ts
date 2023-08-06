import pino from "pino";

export type { Logger } from "pino";

export const logger = pino({
  transport: {
    target: "pino-pretty",
  },
});
