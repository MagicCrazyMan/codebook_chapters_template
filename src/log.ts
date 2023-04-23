import dayjs from "dayjs";

const time = () => `[${dayjs().toISOString()}]`;

/**
 * Log info message
 * @param msg message
 */
export const log = (msg: string) => {
  console.log(`${time()} ${msg}`);
};
