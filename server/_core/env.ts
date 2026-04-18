export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // === Routing Hardening ===
  useVRP: (process.env.USE_VRP ?? "false").toLowerCase() === "true",
  arcgisVrpUrl: process.env.ARCGIS_VRP_URL ?? "https://route-api.arcgis.com/arcgis/rest/services/World/VehicleRoutingProblem/NAServer/VehicleRoutingProblem_World/solveVehicleRoutingProblem",
  arcgisApiKey: process.env.ARCGIS_API_KEY ?? process.env.ARCGIS_TOKEN ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  cacheTtlMatrix: parseInt(process.env.CACHE_TTL_MATRIX ?? "86400", 10),
  cacheTtlGeocode: parseInt(process.env.CACHE_TTL_GEOCODE ?? "604800", 10),
  cacheTtlRouteseq: parseInt(process.env.CACHE_TTL_ROUTESEQ ?? "3600", 10),
};
