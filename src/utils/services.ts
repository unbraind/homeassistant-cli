import type { HaService, HaServiceDefinition, HaServiceList } from "../types/api.js";

export interface FlattenedServiceSchema {
  domain: string;
  service: string;
  field_count: number;
  has_response: boolean;
}

export interface NormalizedServiceSchema {
  domain: string;
  service: string;
  accepts_target: boolean;
  has_response: boolean;
  required_fields: string[];
  optional_fields: string[];
}

export interface ServiceDataValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  required_fields: string[];
  known_fields: string[];
}

interface ServiceFieldDefinition {
  required?: boolean;
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

export function findServiceDefinition(
  services: HaService[],
  domain: string,
  serviceName: string
): HaServiceDefinition | undefined {
  const serviceDomain = services.find((item) => item.domain === domain);
  if (!serviceDomain) {
    return undefined;
  }
  return getServiceDefinition(serviceDomain, serviceName);
}

function toFieldMap(fields: unknown): Record<string, ServiceFieldDefinition> {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return {};
  }
  return fields as Record<string, ServiceFieldDefinition>;
}

function getRequiredAndOptionalFields(definition?: HaServiceDefinition): {
  required: string[];
  optional: string[];
} {
  const fields = toFieldMap(definition?.fields);
  const required: string[] = [];
  const optional: string[] = [];
  for (const [field, value] of Object.entries(fields)) {
    if (value?.required) {
      required.push(field);
    } else {
      optional.push(field);
    }
  }
  required.sort();
  optional.sort();
  return { required, optional };
}

export function normalizeServices(services: HaService[]): NormalizedServiceSchema[] {
  const rows: NormalizedServiceSchema[] = [];
  for (const serviceDomain of services) {
    const serviceNames = getServiceNames(serviceDomain.services).sort((a, b) => a.localeCompare(b));
    for (const serviceName of serviceNames) {
      const definition = getServiceDefinition(serviceDomain, serviceName);
      const fields = getRequiredAndOptionalFields(definition);
      rows.push({
        domain: serviceDomain.domain,
        service: serviceName,
        accepts_target: Boolean(definition?.target),
        has_response: Boolean(definition?.response),
        required_fields: fields.required,
        optional_fields: fields.optional,
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

export function validateServiceData(
  definition: HaServiceDefinition | undefined,
  data: Record<string, unknown> | undefined,
  strict = false
): ServiceDataValidationResult {
  if (!definition) {
    return {
      ok: true,
      errors: [],
      warnings: ["No structured schema available for this service; skipping input validation."],
      required_fields: [],
      known_fields: [],
    };
  }

  const payload = data ?? {};
  const fields = toFieldMap(definition.fields);
  const knownFields = Object.keys(fields).sort();
  const requiredFields = knownFields.filter((field) => fields[field]?.required);
  const allowedExtraFields = new Set(["entity_id"]);
  if (definition.target) {
    allowedExtraFields.add("target");
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of requiredFields) {
    if (!(field in payload)) {
      errors.push(`Missing required field: '${field}'`);
    }
  }

  for (const key of Object.keys(payload)) {
    if (knownFields.includes(key) || allowedExtraFields.has(key)) {
      continue;
    }
    const msg = `Unknown field: '${key}'`;
    if (strict) {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    required_fields: requiredFields,
    known_fields: knownFields,
  };
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
