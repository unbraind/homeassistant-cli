import type { HaService, HaServiceDefinition, HaServiceList } from "../types/api.js";

export interface FlattenedServiceSchema {
  domain: string;
  service: string;
  field_count: number;
  has_response: boolean;
}

export function getServiceNames(services: HaServiceList): string[] {
  if (Array.isArray(services)) {
    return services;
  }
  return Object.keys(services);
}

export function getServiceDefinition(
  service: HaService,
  serviceName: string
): HaServiceDefinition | undefined {
  if (Array.isArray(service.services)) {
    return undefined;
  }
  return service.services[serviceName];
}

export function flattenServices(services: HaService[]): FlattenedServiceSchema[] {
  const rows: FlattenedServiceSchema[] = [];

  for (const serviceDomain of services) {
    for (const serviceName of getServiceNames(serviceDomain.services)) {
      const definition = getServiceDefinition(serviceDomain, serviceName);
      const fieldCount = definition?.fields ? Object.keys(definition.fields).length : 0;
      rows.push({
        domain: serviceDomain.domain,
        service: serviceName,
        field_count: fieldCount,
        has_response: Boolean(definition?.response),
      });
    }
  }

  return rows.sort((a, b) => {
    if (a.domain === b.domain) {
      return a.service.localeCompare(b.service);
    }
    return a.domain.localeCompare(b.domain);
  });
}
