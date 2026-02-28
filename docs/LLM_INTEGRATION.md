# LLM/Agent Integration Guide

This guide covers features and best practices for using Home Assistant CLI with LLMs (Large Language Models) and AI agents.

## Why This CLI is LLM-Optimized

- **TOON Format**: Default output uses TOON (Token-Oriented Object Notation) for ~40% fewer tokens than JSON
- **Structured Responses**: Clear headers with field names and predictable data layouts
- **Query Language**: Simple expression syntax for filtering entities
- **Batch Operations**: Execute multiple operations in a single command
- **Comprehensive Discovery**: Explore all entities and their states efficiently

## TOON Format Explained

TOON (Token-Oriented Object Notation) is designed for LLM efficiency:

```
states[3]{entity_id,state,last_changed}:
  light.living_room,on,2024-01-01T00:00:00Z
  switch.kitchen,off,2024-01-01T01:00:00Z
  sensor.temperature,22.5,2024-01-01T02:00:00Z
```

vs JSON:
```json
[
  {"entity_id": "light.living_room", "state": "on", "last_changed": "2024-01-01T00:00:00Z"},
  {"entity_id": "switch.kitchen", "state": "off", "last_changed": "2024-01-01T01:00:00Z"},
  {"entity_id": "sensor.temperature", "state": "22.5", "last_changed": "2024-01-01T02:00:00Z"}
]
```

**Savings**: 137 characters vs 225 characters (~40% reduction)

## LLM-Optimized Commands

### Entity Discovery

Quickly explore all entities in your Home Assistant:

```bash
# Get overview of all entities
hassio discover

# List all domains with counts
hassio discover --domains

# Find unavailable entities
hassio discover --unavailable
```

**Example output**:
```
total_entities: 637
domains: 28
top_domains[5]:
  sensor: 300
  binary_sensor: 53
  update: 46
  media_player: 43
  automation: 36
state_summary:
  on: 45
  off: 82
  unavailable: 88
unavailable_count: 88
```

### Entity Filtering

Filter entities with multiple criteria:

```bash
# By domain
hassio entities -d light

# By state
hassio entities -s on

# By pattern
hassio entities -p living_room

# Combined filters
hassio entities -d light -s on

# Only count (efficient)
hassio entities --count

# Group by domain
hassio entities --domains

# Select specific attributes
hassio entities -d sensor -a unit_of_measurement,device_class
```

### Query Language

Use simple expressions to query entities:

```bash
# Basic queries
hassio query "domain:light"
hassio query "domain:sensor state:on"
hassio query "name:living"

# With attributes
hassio query "domain:light attributes:brightness"
hassio query "domain:sensor attributes:unit_of_measurement=C"

# Summary only
hassio query "domain:light" --summary
```

**Query Syntax**:
- `domain:<name>` - Filter by domain (light, sensor, switch, etc.)
- `state:<value>` - Filter by state (on, off, unavailable, etc.)
- `name:<pattern>` - Filter by entity_id substring
- `attributes:<name>` - Filter by attribute presence
- `attributes:<name>=<value>` - Filter by attribute value

### Batch Operations

Execute the same service on multiple entities:

```bash
# Turn off multiple lights
hassio batch -d light -s turn_off -e light.living_room,light.kitchen,light.bedroom

# Set brightness on multiple lights
hassio batch -d light -s turn_on -e light.living_room,light.kitchen -d '{"brightness": 200}'

# Stop multiple media players
hassio batch -d media_player -s media_stop -e media_player.living_room,media_player.bedroom
```

### Entity Inspection

Deep dive into a specific entity:

```bash
# Basic inspection
hassio inspect light.living_room

# With recent history
hassio inspect sensor.temperature --history

# Limit history entries
hassio inspect sensor.temperature --history -l 5
```

## Agent Workflow Examples

### Workflow 1: Turn On Evening Lights

```bash
# 1. Discover lights that are off
hassio entities -d light -s off

# 2. Turn them on in batch
hassio batch -d light -s turn_on -e light.living_room,light.kitchen,light.hallway

# 3. Verify
hassio entities -d light -s on
```

### Workflow 2: Check System Health

```bash
# 1. Get overall status
hassio discover

# 2. Check for unavailable entities
hassio discover --unavailable

# 3. Get error log (last 20 lines)
hassio error-log | tail -20

# 4. Check config validity
hassio check-config
```

### Workflow 3: Temperature Monitoring

```bash
# 1. Query all temperature sensors
hassio query "domain:sensor attributes:unit_of_measurement=°C" --summary

# 2. Get all temperature readings
hassio query "domain:sensor attributes:unit_of_measurement=°C"

# 3. Check specific sensor history
hassio inspect sensor.living_room_temperature --history
```

### Workflow 4: Media Control

```bash
# 1. Find all media players
hassio entities -d media_player

# 2. Stop all playing media
hassio batch -d media_player -s media_stop -e $(hassio entities -d media_player -s playing --format json-compact | jq -r '.[].entity_id' | tr '\n' ',')
```

## Best Practices for Agents

### 1. Use TOON Format

Always use TOON format (default) for minimal token usage:

```bash
# Default is TOON
hassio entities

# Only use JSON if you need nested data
hassio states sensor.temperature --format json
```

### 2. Prefer Count Over Full Data

When you only need to know if entities exist or how many:

```bash
# Efficient
hassio entities --count

# Less efficient
hassio entities | wc -l
```

### 3. Use Query for Complex Filters

Instead of multiple commands:

```bash
# Good
hassio query "domain:light state:on"

# Less efficient
hassio entities | grep "light\." | grep ",on,"
```

### 4. Batch Operations

Always use batch for multiple service calls:

```bash
# Good - one API call
hassio batch -d light -s turn_off -e light.a,light.b,light.c

# Less efficient - multiple API calls
hassio call-service light turn_off -e light.a
hassio call-service light turn_off -e light.b
hassio call-service light turn_off -e light.c
```

### 5. Use Summary for Statistics

```bash
# Get statistics without full data
hassio query "domain:binary_sensor" --summary
```

## Template Integration

Render Home Assistant templates for dynamic queries:

```bash
# Get count of entities in a domain
hassio render-template "{{ states.light | list | length }}"

# Get entity with specific attribute
hassio render-template "{{ states.sensor | selectattr('attributes.unit_of_measurement', 'eq', '°C') | list | length }}"

# Complex template from file
hassio render-template "" --file template.jinja
```

## Error Handling

The CLI provides structured error output:

```bash
# Connection errors include helpful messages
hassio status
# Error: Failed to connect to Home Assistant at http://192.168.1.100:8123.
# Please check the URL and ensure Home Assistant is running.

# Validation helps catch issues early
hassio settings validate
```

## Tips for LLM Integration

1. **Start with discovery**: Use `hassio discover` to understand what's available
2. **Filter progressively**: Start broad, then narrow down
3. **Use batch for actions**: Group multiple operations
4. **Validate before actions**: Check states before changing them
5. **Monitor with history**: Use `--history` for context
6. **Handle errors gracefully**: Check exit codes and error messages

## Example Agent Implementation

```python
import subprocess
import json

def hassio_command(cmd):
    """Execute hassio CLI command and return structured output."""
    result = subprocess.run(
        ["hassio"] + cmd,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        return {"error": result.stderr}
    
    # Parse TOON format or JSON based on output
    return parse_output(result.stdout)

# Example: Turn on all lights in living room
def turn_on_living_room_lights():
    # Find lights
    lights = hassio_command([
        "entities", "-d", "light", 
        "-p", "living", 
        "-s", "off",
        "--format", "json-compact"
    ])
    
    if "error" in lights:
        return lights
    
    # Turn them on in batch
    entity_ids = ",".join(l["entity_id"] for l in lights)
    return hassio_command([
        "batch",
        "-d", "light",
        "-s", "turn_on",
        "-e", entity_ids
    ])
```

## Performance Tips

- **Use `--format json-compact`** for programmatic parsing
- **Use `--count`** instead of counting lines
- **Use `--summary`** for statistics
- **Use `--minimal-response`** with history for faster queries
- **Use `--no-attributes`** when you don't need attributes
- **Batch operations** instead of individual calls
- **Filter on server** using query parameters when possible

## Security Considerations

- Store tokens securely (config file has 600 permissions)
- Use environment variables for CI/CD
- Never log full tokens
- Validate inputs before executing commands
