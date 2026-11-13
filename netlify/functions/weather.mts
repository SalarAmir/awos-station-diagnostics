import { weatherResponse } from "../../server/weather.ts";

export default async function handler(): Promise<Response> {
  return weatherResponse();
}

export const config = {
  path: "/api/weather",
  method: "GET",
};
