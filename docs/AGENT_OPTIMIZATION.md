# Agent/LLM Optimization Guide

This document describes how the Home Assistant CLI is optimized for agent and LLM consumption, and provides best practices for using the CLI in automated workflows.

## TOON Format (Default)

The CLI uses **TOON (Token-Oriented Object Notation)** as the default output format, providing approximately **40% token reduction** compared to JSON.

### Example Comparison

**JSON format (234 tokens):**
```json
[
  {
    "entity_id": "light.living_room",
    "state": "on",
    "attributes": {
      "brightness": 255,
      "color_temp": 400
    },
    "last_changed": "2024-01-01T00:00:00Z"
  }
]
```

**TOON format (140 tokens):**
```
states[1]{entity_id,state,last_changed,attributes{brightness,color_temp}}:
  light.living_room,on,"2024-01-01T00:00:00Z",255,400
```

### Token Savings

| Format | Tokens | Savings vs JSON |
|--------|--------|-----------------|
| JSON | 234 | - |
| JSON-compact | 198 | 15% |
| TOON | 140 | **40%** |
| YAML | 210 | 10% |

## Output Formats for Different Use Cases

### 1. LLM/Agent Consumption (Default)

```bash
hassio states
hassio services --count
hassio summary
```

Use **TOON** format for:
- Conversational agents
- LLM processing
- Token-sensitive applications
- Quick entity overview

### 2. CI/CD Pipelines

```bash
hassio states --format json-compact
hassio entities --count --format json
```

Use **JSON-compact** or **JSON** for:
- Automated scripts
- CI/CD pipelines
- JSON parsing
- Structured data processing

### 3. Human Reading

```bash
hassio states --format table
hassio services --format markdown
```

Use **table** or **markdown** for:
- Terminal display
- Documentation
- Reports
- Human review

### 4. Configuration Files

```bash
hassio states --format yaml
hassio config --format yaml
```

Use **YAML** for:
- Configuration files
- YAML-based tools
- Kubernetes-style workflows

## Agent-Optimized Commands

### 1. Quick Environment Overview

```bash
# Get fast topology snapshot
hassio summary

# Output:
# total_entities: 637
# domains: 28
# by_domain:
#   sensor: 300
#   binary_sensor: 53
#   ...
```

### 2. Entity Discovery

```bash
# Discover all entities with domain breakdown
hassio discover --domains

# Find unavailable entities
hassio discover --unavailable

# Get domain statistics
hassio entities --domains
```

### 3. Query Language

Simple query syntax for filtering entities:

```bash
# Filter by domain and state
hassio query "domain:light state:on"

# Filter by attributes
hassio query "domain:sensor attributes:unit_of_measurement=°C"

# Filter by name pattern
hassio query "name:living"

# Get summary only
hassio query "domain:light" --summary
```

### 4. Batch Operations

Execute multiple service calls efficiently:

```bash
# Turn off multiple lights
hassio batch -d light -s turn_off -e light.living_room,light.kitchen,light.bedroom

# Set brightness on multiple lights
hassio batch -d light -s turn_on -e light.living_room,light.kitchen --data '{"brightness":200}'
```

### 5. Deep Inspection

Get comprehensive entity information:

```bash
# Inspect single entity
hassio inspect light.living_room

# With history
hassio inspect sensor.temperature --history
```

### 6. Capability Profiling

Understand what features are available:

```bash
# Get capabilities
hassio capabilities --refresh

# Live endpoint + command mapping matrix
hassio capabilities --api-matrix

# Agent execution plan
hassio capabilities --agent-plan

# Agent execution profile
hassio capabilities --agent-profile

# One-shot agent context (safe for sharing)
hassio capabilities --agent-context --redact-private
```

### 7. Compact Registry Context

Use Home Assistant's display registry before the full configuration registry.
It contains enabled entities only and is optimized for low-bandwidth UI and
agent discovery:

```bash
hassio registries --display --count --format json-compact
hassio registries --display --domain light --limit 25 --format toon
hassio registries --decode-display --area-id kitchen --limit 25 --format json-compact
```

The raw display form retains Home Assistant's compact keys. Request
`--decode-display` for descriptive field names. Always bound rows before
placing registry metadata in an LLM context.

### 8. Token-Efficient Entity Delta Observation

Prefer the compact entity subscription when an agent needs a live state window.
Server-side filters prevent unrelated state from entering the transport or model
context:

```bash
hassio ws observe-entities --domain light --wait-ms 10000 --max-events 10
hassio ws observe-entities --entity-id sensor.temperature --no-initial --format json-compact
```

The initial snapshot uses expanded descriptive fields. Later rows preserve
`added`, `changed`, and `removed` semantics, including attribute removals. Both
time and event count are mandatory positive bounds, and the client unsubscribes
at either boundary.

### 9. Purpose-Specific Automation Discovery

Discover the trigger and condition schemas contributed by currently loaded
integrations before asking an agent to author an automation:

```bash
hassio ws automation-platforms --kind all --format toon
```

Use target discovery next to narrow the catalog, then validate the resulting
definition before any configuration mutation.

### 10. WebSocket Target Resolution

Use WebSocket target helpers to convert abstract targets into concrete IDs, discover valid automation primitives, and fetch only matching registry records:

```bash
hassio ws target extract --area-id kitchen
hassio ws target triggers --entity-id light.kitchen
hassio ws target conditions --entity-id light.kitchen
hassio ws target services --entity-id light.kitchen
hassio ws target services --entity-id group.downstairs --no-expand-group
hassio ws target related --label-id lighting
```

### 11. Validate Automations Before Execution

Use the typed WebSocket validator before an agent proposes or applies an
automation. It does not execute actions or create configuration:

```bash
hassio ws validate-config --file automation.json --format json-compact
hassio ws validate-config \
  --trigger '{"trigger":"state","entity_id":"binary_sensor.door"}' \
  --action '[{"action":"light.turn_on","target":{"entity_id":"light.kitchen"}}]'
```

CLI values override matching fields in the file. Treat a `valid: false` result as
a hard stop and surface the corresponding `error` to the planning loop.

### 12. Bounded Automation Trigger Observation

Prefer automation-level trigger subscriptions over the entire event bus when an
agent is waiting for a specific condition:

```bash
hassio ws subscribe-trigger \
  --trigger '{"trigger":"state","entity_id":"binary_sensor.door"}' \
  --wait-ms 30000 --max-events 3 --format json-compact
```

This admin-only, read-only workflow validates the trigger locally, negotiates
coalesced WebSocket frames, bounds both time and output size, unsubscribes, and
never fires the trigger. Treat returned context and variable values as private
instance data.

### 13. Bounded WebSocket Session Discovery

Prefer typed commands for stable protocol operations and bound large exposure
inventories before adding them to an agent context:

```bash
hassio ws ping
hassio ws panels --format json-compact
hassio ws exposure list --count
hassio ws exposure list --assistant conversation --limit 25
```

Global `--read-only` blocks `ws exposure enable|disable`. A value returned by
`ws sign-path` is a short-lived credential: consume it immediately and never
persist it in prompts, logs, pm items, or source control.

### 14. Bounded Media Discovery

Count before fetching media rows, then request only the context the agent needs:

```bash
hassio media browse --count
hassio media browse --limit 20 --format toon
hassio media search "ambient" --media-class artist,album --limit 10
hassio media search "news" --entity-id media_player.living_room --count
hassio media resolve "media-source://provider/item" --metadata-only
```

Browse and search are read-only. The shared media-source search command follows
current Home Assistant Core development and can return `unknown_command` on a
server that has not registered the new capability; treat that as a capability
boundary and retain generic `ws call` for integration-specific contracts.
Full resolve output may contain a short-lived signed URL, so prefer
`--metadata-only` for planning and never persist the URL.

### 15. Repair and Dependency Diagnostics

Count before fetching private diagnostic details, and keep topology traversal
focused on the resource type needed for a decision:

```bash
hassio repairs list --count --format json-compact
hassio repairs list --severity critical --limit 10
hassio related entity light.kitchen --count
hassio related entity light.kitchen --result-type automation --limit 10
```

Use `repairs show` only after selecting a specific issue. State-changing
`repairs ignore` and fix-flow start/submit operations require `--yes` and remain
blocked by read-only mode. `repairs fix status` is read-only. Never persist
issue IDs, flow IDs, placeholders, URLs, or related-resource identifiers in
prompts, PM evidence, or source control.

## Best Practices for Agents

### 1. Use Appropriate Output Format

```bash
# For LLM processing (default)
hassio states

# For programmatic processing
hassio states --format json-compact

# For debugging/logging
hassio states --format yaml
```

### 2. Leverage Filtering

```bash
# Don't fetch all entities - filter early
hassio entities -d light -s on

# Use query for complex filters
hassio query "domain:sensor attributes:unit_of_measurement=°C"

# Count instead of listing
hassio entities --count
```

### 3. Use Batch Operations

```bash
# Instead of multiple calls
for light in light.living light.kitchen light.bedroom; do
  hassio call-service light turn_on -e $light
done

# Use batch
hassio batch -d light -s turn_on -e light.living,light.kitchen,light.bedroom
```

### 4. Enable Read-Only Mode for Safety

```bash
# In environment
export HASSIO_READONLY=true

# Or per command
hassio --read-only states

# Plan and validate an action without executing it
hassio call-service light turn_on --area-id kitchen --dry-run --strict-input
```

Read-only mode blocks action execution before service discovery, while
`--dry-run` remains available for planning. Set `HASSIO_READONLY=false`
explicitly to override a saved read-only setting for an approved invocation.
Boolean environment values are parsed strictly; only `true`, `1`, or `yes`
enable the safety mode.

Service actions use `--response auto` by default and return a stable envelope
across REST and WebSocket. Inspect `response_capability` and
`response_requested` before consuming `service_response`; use `changed_states`
and `context` without depending on the selected transport's raw wire shape.

### 5. Cache Capabilities

```bash
# Cache capabilities for planning
hassio capabilities --refresh

# Later use cached data
hassio capabilities --agent-context
```

## Error Handling

### Structured Error Output

All errors are returned in a structured format:

```bash
# JSON format for programmatic handling
hassio invalid-command --format json 2>&1 | jq '.error'

# TOON format (default) for LLM consumption
hassio invalid-command 2>&1
```

### Exit Codes

- `0` - Success
- `1` - Error (general)
- `2` - Invalid arguments
- `3` - Connection error
- `4` - Authentication error
- `5` - Read-only mode violation

## Workflow Examples

### 1. Automated Light Control

```bash
#!/bin/bash
# Turn off all lights when everyone leaves

# Get all lights that are on
LIGHTS=$(hassio query "domain:light state:on" --format json-compact | jq -r '.[].entity_id' | tr '\n' ',')

# Turn them off in batch
if [ -n "$LIGHTS" ]; then
  hassio batch -d light -s turn_off -e "${LIGHTS%,}"
fi
```

### 2. Temperature Monitoring

```bash
#!/bin/bash
# Check all temperature sensors and alert if too high

# Get temperature sensors
hassio query "domain:sensor attributes:unit_of_measurement=°C" --format json | \
  jq -r '.[] | select(.state > 25) | "\(.entity_id): \(.state)°C"' | \
  while read line; do
    hassio notify mobile_app_phone -m "High temperature: $line"
  done
```

### 3. Health Check

```bash
#!/bin/bash
# Daily health check

# Get summary
hassio summary > /tmp/ha-health.txt

# Check unavailable entities
hassio discover --unavailable >> /tmp/ha-health.txt

# Send notification
hassio notify email -m "Daily health check" -t "HA Health Report" \
  -d "$(cat /tmp/ha-health.txt)"
```

## Integration with LLMs

### OpenAI Function Calling

```python
import json
import subprocess

def get_entities(domain=None, state=None):
    """Get entities from Home Assistant"""
    cmd = ["hassio", "entities", "--format", "json-compact"]
    if domain:
        cmd.extend(["-d", domain])
    if state:
        cmd.extend(["-s", state])
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)

# Use with OpenAI
functions = [
    {
        "name": "get_entities",
        "description": "Get entities from Home Assistant",
        "parameters": {
            "type": "object",
            "properties": {
                "domain": {"type": "string"},
                "state": {"type": "string"}
            }
        }
    }
]
```

### Claude Integration

```python
def control_light(entity_id, action, brightness=None):
    """Control a light entity"""
    cmd = ["hassio", "call-service", "light", action, "-e", entity_id]
    if brightness:
        cmd.extend(["-d", json.dumps({"brightness": brightness})])
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0
```

## Performance Tips

1. **Use TOON format** for token efficiency
2. **Filter early** to reduce data transfer
3. **Use batch operations** for multiple changes
4. **Cache capabilities** to avoid repeated API calls
5. **Use counts** when you don't need full data
6. **Enable read-only mode** for safety

## Security Considerations

1. **Never commit credentials** to version control
2. **Use environment variables** for CI/CD
3. **Enable read-only mode** for querying
4. **Validate user input** before executing commands
5. **Use --dry-run** when available (planned feature)

## Future Enhancements

Planned features for better agent integration:

1. **Conditional execution** - `--if-state` flag
2. **Retry logic** - `--retry` and `--retry-delay` flags
3. **Impact analysis** - Preview changes before execution
4. **Entity relationships** - Navigate entity→device→area hierarchies
5. **Dry-run mode** - Validate without executing
6. **Streaming output** - Real-time state updates

---

*This guide is part of the Home Assistant CLI documentation. For more information, see [API.md](API.md) and [README.md](../README.md).*
