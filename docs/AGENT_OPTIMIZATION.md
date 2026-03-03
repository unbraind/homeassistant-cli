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
states[1]{entity_id,state,last_changed,attributes}:
  light.living_room,on,2024-01-01T00:00:00Z,"{""brightness"":255,""color_temp"":400}"
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

# Agent execution plan
hassio capabilities --agent-plan

# Agent execution profile
hassio capabilities --agent-profile

# One-shot agent context (safe for sharing)
hassio capabilities --agent-context --redact-private
```

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
```

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
