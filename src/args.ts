import commandLineArgs, { OptionDefinition } from "command-line-args";

const optionDefinitions: OptionDefinition[] = [
  { name: "src", alias: "s", type: String, defaultValue: "./examples" },
  { name: "dist", alias: "d", type: String, defaultValue: "./dist" },
  { name: "serve", type: Boolean, defaultValue: false },
  { name: "server_address", type: String, defaultValue: "127.0.0.1" },
  { name: "server_port", type: Number, defaultValue: 8110 },
  { name: "server_base_url", type: String, defaultValue: "/" },
];

export type Options = {
  src: string;
  dist: string;
  serve: boolean;
  server_address: string;
  server_base_url: string;
  server_port: number;
}

export const options = commandLineArgs(optionDefinitions) as Options;
