# LLM/Agent Integration Guide

This guide covers features and best practices for using Home Assistant CLI with LLMs (Large Language Models) and AI agents.

## Why This CLI is LLM-Optimized

- **TOON Format**: Default output uses TOON (Token-Oriented Object Notation) for ~40% fewer tokens than JSON
- **Structured Responses**: Clear headers with field names and predictable data layouts
- **Query Language**: Simple expression syntax for filtering entities
- **Batch Operations**: Execute multiple operations in a single command
- **Comprehensive Discovery**: Explore all entities, registries, and statistics efficiently
- **Full API Coverage**: Access to all Home Assistant API endpoints
- **Registry Access**: Query entity, device, area, floor, label, and category registries
- **Statistics**: Access historical data and analytics
- **List Management**: Manage todo lists, shopping lists, and notifications

## High-Impact Features for Agents/LLMs

### 1. Capability discovery (implemented)
Use `hassio capabilities --format json` to retrieve instance-specific API availability, supervisor status, and orchestration hints.

### 2. Capability-driven execution planning (implemented)
Use `hassio capabilities --agent-plan --format json` to get `recommended_commands`, `avoid_commands`, and `notes`.

### 3. Structured execution profile (implemented)
Use `hassio capabilities --agent-profile --format json` to get a stable profile with:
- `preferred_output_format` (`toon`)
- `capabilities` status matrix
- `planning.fast_path` starter command sequence
- `planning.streaming_ready` boolean

### 4. One-shot context payload (implemented)
Use `hassio capabilities --agent-context --redact-private --format json` to get:
- `summary` (counts + status totals)
- `plan` (`recommended_commands`, `avoid_commands`, `notes`)
- `profile` (stable execution profile)
- `suggested_sequence` (starter command chain)

### 5. Service schema normalization + preflight validation (implemented)
Use `hassio services --schema --format json` to retrieve normalized service rows:
- `required_fields`
- `optional_fields`
- `accepts_target`
- `has_response`

Use `hassio call-service <domain> <service> --dry-run --strict-input` to produce
a non-executing plan with live-schema validation evidence. Target entity,
device, area, floor, or label selectors can be supplied independently from
service data. After approval, remove `--dry-run` to execute the same plan.

The default `--response auto` policy requests response data only for actions
whose live definition requires it. Every REST or WebSocket execution returns the
same `service_action` envelope, including `response_capability`,
`response_requested`, `changed_states`, `context`, and `service_response`.
Agents should branch on these explicit fields instead of transport-specific raw
payload shapes. Use `--response never` for actions that must not return data;
the CLI rejects that policy when the action requires a response.

### 6. Output contracts for parser-safe automation (implemented)
Use `hassio schema --output-contracts --format json` to retrieve:
- per-format `media_type`
- parseability mode (`strict` or `best_effort`)
- parser hints
- baseline schema contracts for CI and agent tooling

### 7. Token-bounded WebSocket exposure discovery (implemented)
Use `hassio ws exposure list --assistant conversation --limit 25` for normalized
rows, or `--count` before requesting detail. Use `ws panels` and `ws ping` for
typed discovery and liveness. Signed-path output is a short-lived credential and
must not be persisted in prompts, logs, or tracker evidence.

### 8. Non-executing automation validation (implemented)
Use `hassio ws validate-config --file automation.json` before creating or
updating an automation. Agents can instead supply `--trigger`, `--condition`,
or `--action` JSON independently. The CLI maps ordinary singular automation
fields to the plural WebSocket payload required by current Home Assistant Core,
rejects malformed or empty input locally, and returns per-section
`{ valid, error }` results in the selected output format.

### 9. Typed automation runtime (implemented)
After `ws validate-config`, use
`hassio ws automation-runtime test-condition --file automation.json` to evaluate
one condition without actions. Use `observe-condition` with small `--wait-ms`
and `--max-events` bounds when truth changes matter. Only after approval should
an agent use `execute-sequence`; global read-only mode rejects execution before
network I/O. File input reuses normal `condition(s)` and `action(s)` fields, so
the validated artifact remains the execution artifact. Treat runtime contexts,
template output, and errors as private.

### 10. Bounded media discovery (implemented)
Use `hassio media browse --count` before requesting detail, then apply a small
`--limit`. `hassio media search` supports shared media sources and
`--entity-id` player search, with current media-class filters and stable
`{ scope, count, results }` output. Prefer `media resolve --metadata-only`;
the full resolve response can contain a short-lived signed credential.

### 11. Observe Entity Deltas with Bounded Context (implemented)
Use `hassio ws observe-entities --domain <domain>` instead of repeatedly fetching
all states or consuming full `state_changed` event envelopes. The command sends
filters to Home Assistant, expands the compact initial snapshot, preserves
lossless add/change/remove patches, stops at `--wait-ms` or `--max-events`, and
always attempts to unsubscribe. Add `--no-initial` when only subsequent changes
belong in the agent context.

### 12. Discover Purpose-Specific Automation Platforms (implemented)
Use `hassio ws automation-platforms --kind all` to retrieve the current trigger
and condition schemas published by loaded integrations. Narrow them with
`ws target triggers|conditions`, then validate the authored configuration with
`ws validate-config` before execution.

### 13. Observe Automation Triggers with Bounded Context (implemented)
Use `hassio ws subscribe-trigger --trigger <json>` when an agent needs to wait
for an automation-level condition without consuming the full event bus. The
command validates inputs locally, negotiates coalesced WebSocket frames, applies
`--wait-ms` and `--max-events` bounds, unsubscribes, and never fires the trigger.
It requires a Home Assistant administrator.

### 14. Repair diagnosis and safe remediation (implemented)
Start with `hassio repairs list --count`, then request a small severity/domain
slice. Use `repairs show` only when issue data is required. Ignore and fix-flow
writes require `--yes` and are blocked in read-only mode; `fix status` is safe
for observing an already-started flow. Treat every issue and flow identifier as
private instance data.

### 15. Related-resource topology (implemented)
Use `hassio related <item-type> <item-id> --count` to estimate the dependency
surface before fetching identifiers. Apply `--result-type` and a small
per-type `--limit` to bound context. This is Core's semantic resource graph,
not text search, and can reveal automation/configuration relationships.

### 16. Integration intelligence and entity provenance (implemented)
Use `hassio ws integrations list --count` before fetching a small manifest
slice. `integrations setup` exposes startup timing, `descriptions` provides
admin-only integration metadata, and `wait` checks load readiness. Use
`entity-sources --domain <domain> --limit <n>` to identify ownership without a
full entity-state payload, and `ws slugify <text>` for server-compatible IDs.
List envelopes always disclose total/returned counts and truncation. Treat raw
entity IDs and integration metadata as private topology.

### 17. Frontend semantic and localization discovery (implemented)
Use `hassio ws frontend version` to distinguish the installed frontend package
from the Core version. Query `frontend icons` with an official category and an
integration filter when generating UI-aware action plans. Query `frontend
translations` with language/category plus `--count` or a small `--limit` when
localized labels are required. `frontend themes` returns bounded summaries by
default; `--include-values` is explicit because theme variables can be large and
private. Every catalog uses deterministic rows and count/returned/truncated
metadata.

### 18. Cursor-based pagination (future)
Add `--cursor` + `--limit` for entity-heavy installations so agents can page deterministically.

### 19. Stable machine error envelope (future)
Standardize failures to `{ code, message, hint, retriable }` across all commands and formats.

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

# Limit rows for token budgets
hassio entities -d sensor --limit 25

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
# Fast environment snapshot for planning
hassio summary

# Basic inspection
hassio inspect light.living_room

# With recent history
hassio inspect sensor.temperature --history

# Limit history entries
hassio inspect sensor.temperature --history -l 5
```

## Registry Queries

### Compact Enabled-Entity Registry

Prefer the display registry for bounded agent context. Home Assistant excludes
disabled entries and sends abbreviated keys to reduce bandwidth:

```bash
# Lowest-token compact rows (ei=entity ID, pl=platform)
hassio registries --display --limit 25 --format toon

# Stable descriptive keys for tool pipelines
hassio registries --decode-display --domain light --limit 25 --format json-compact

# Plan context size before fetching rows
hassio registries --display --count --format json-compact
```

The compact contract supports `--domain`, `--device-id`, `--area-id`,
`--limit`, and `--count`. Use the full registry only when disabled entries,
unique IDs, config-entry IDs, or other configuration-only fields are required.

### Entity Registry

Access entity metadata and configuration:

```bash
# List all registered entities
hassio registries --entities

# Count entities
hassio registries --entities --count

# Filter by domain
hassio registries --entities -d light

# Filter by device
hassio registries --entities --device-id device_123
```

**Use Cases**:
- Find disabled entities
- See entity names vs original names
- Check which integration provides each entity
- View entity categories and labels

### Device Registry

Access device information:

```bash
# List all devices
hassio registries --devices

# Filter by area
hassio registries --devices --area-id area_living_room

# Count devices
hassio registries --devices --count
```

**Use Cases**:
- List all devices by manufacturer
- Find devices without an area
- Check firmware versions

### Area Registry

Access area (room) information:

```bash
# List all areas
hassio registries --areas

# Count areas
hassio registries --areas --count
```

### Other Registries

```bash
# Floor registry
hassio registries --floors

# Label registry
hassio registries --labels

# Category registry
hassio registries --categories

# All registries
hassio registries
```

## Statistics and Analytics

### Statistics

Query historical statistics data:

```bash
# Get statistics for an entity
hassio statistics -e sensor.temperature -p hour

# Get statistics for multiple entities
hassio statistics -e sensor.temp1,sensor.temp2 -p day

# Get statistics during a period
hassio statistics -e sensor.energy --during-period \
  -s "2024-01-01T00:00:00Z" -t "2024-01-31T23:59:59Z" \
  -p day --types mean,max,min

# Available periods: 5minute, hour, day, week, month
# Available types: change, last_reset, max, mean, min, state, sum
```

### Analytics

Get Home Assistant system analytics:

```bash
hassio analytics
```

Returns: active integrations, component count, installation type, version, etc.

## List Management

### Todo Lists

```bash
# List all todo lists
hassio todo --lists

# Get items from a specific list
hassio todo -e todo.shopping
```

### Shopping List

```bash
# List all items
hassio shopping-list --list

# Show only pending items
hassio shopping-list --pending

# Add item
hassio shopping-list -a "Milk"

# Mark as complete
hassio shopping-list -u item_id --complete

# Clear completed items
hassio shopping-list --clear-completed
```

### Notifications

```bash
# List notifications
hassio notifications --list

# Dismiss notification
hassio notifications -d notification_id
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

# 5. Get analytics
hassio analytics
```

### Workflow 3: Temperature Monitoring

```bash
# 1. Query all temperature sensors
hassio query "domain:sensor attributes:unit_of_measurement=°C" --summary

# 2. Get all temperature readings
hassio query "domain:sensor attributes:unit_of_measurement=°C"

# 3. Check specific sensor history
hassio inspect sensor.living_room_temperature --history

# 4. Get temperature statistics
hassio statistics -e sensor.temperature -p hour --types mean,max,min
```

### Workflow 4: Device Management

```bash
# 1. Get all devices
hassio registries --devices

# 2. Get entities for a specific device
hassio registries --entities --device-id device_123

# 3. Find devices in an area
hassio registries --devices --area-id area_living_room

# 4. List all areas
hassio registries --areas
```

### Workflow 5: Media Control

```bash
# 1. Inspect shared media capability without returning private rows
hassio media browse --count

# 2. Search a supported media source with bounded context
hassio media search "ambient" --media-class artist,album --limit 10

# 3. Search a player that advertises SEARCH_MEDIA support
hassio media search "news" --entity-id media_player.living_room --count

# 4. Stop all playing media
hassio batch -d media_player -s media_stop \
  -e $(hassio entities -d media_player -s playing --format json-compact | jq -r '.[].entity_id' | tr '\n' ',')
```

### Workflow 6: Backup Management

```bash
# 1. List existing backups
hassio backups --list

# 2. Create new backup
hassio backups -c "Pre-Update Backup"

# 3. Download backup
hassio backups --download backup_slug -o backup.tar

# 4. Restore if needed
hassio backups -r backup_slug
```

### Workflow 7: Voice Assistant / Conversation

```bash
# 1. List available conversation agents
hassio conversation --agents

# 2. Ask a question
hassio ask "what time is it"

# 3. Control devices via voice
hassio ask "turn on living room light"

# 4. Multi-turn conversation
hassio conversation -t "turn on the lights" -c "conv-123"
hassio conversation -t "also close the blinds" -c "conv-123"
```

### Workflow 8: Text-to-Speech

```bash
# 1. List TTS engines
hassio tts --engines

# 2. Speak a message
hassio say "The front door is open" -p media_player.kitchen

# 3. Use specific engine
hassio say "Welcome home" -p media_player.living_room -e tts.cloud
```

### Workflow 9: Entity Search

```bash
# 1. Search entities
hassio search "living room"

# 2. Quick local search (faster, no API)
hassio search "temp" --quick

# 3. Search with filters
hassio search "sensor" -d sensor --count

# 4. Find by pattern
hassio find "battery" -d sensor
```

`hassio search` automatically falls back to local entity-state search when `/api/search` is unavailable.

## Best Practices for Agents

### 1. Use TOON Format

Always use TOON format (default) for minimal token usage:

```bash
# Default is TOON
hassio entities

# Only use JSON if you need nested data parsing
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

### 6. Registry Queries for Metadata

Use registries when you need configuration metadata:

```bash
# Get entity configuration
hassio registries --entities -d light

# Check for disabled entities
hassio registries --entities | grep "disabled"
```

### 7. Statistics for Historical Data

Use statistics for time-series analysis:

```bash
# Get daily averages
hassio statistics -e sensor.temperature -p day --types mean
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

# 404 errors indicate endpoint not available
hassio persons
# Error: 404 - Not Found (person integration not enabled)
```

## Tips for LLM Integration

1. **Start with discovery**: Use `hassio discover` to understand what's available
2. **Filter progressively**: Start broad, then narrow down
3. **Use batch for actions**: Group multiple operations
4. **Validate before actions**: Check states before changing them
5. **Monitor with history**: Use `--history` for context
6. **Handle errors gracefully**: Check exit codes and error messages
7. **Use registries for metadata**: When you need configuration info
8. **Use statistics for trends**: When analyzing historical data
9. **Count first**: Before fetching full lists
10. **Check availability**: Not all endpoints available in all installations
11. **Resolve targets first**: Use `hassio ws target extract|triggers|conditions|services|related` before constructing automation payloads

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

# Example: Get system health
def get_system_health():
    return {
        "status": hassio_command(["status"]),
        "config": hassio_command(["check-config"]),
        "discovery": hassio_command(["discover"]),
        "analytics": hassio_command(["analytics"]),
    }
```

## Performance Tips

- **Use `--format json-compact`** for programmatic parsing
- **Use `--count`** instead of counting lines
- **Use `--summary`** for statistics
- **Use `--minimal-response`** with history for faster queries
- **Use `--no-attributes`** when you don't need attributes
- **Batch operations** instead of individual calls
- **Filter on server** using query parameters when possible
- **Cache registry data** - it changes infrequently
- **Use statistics** instead of history for aggregated data

## Security Considerations

- Store tokens securely (config file has 600 permissions)
- Use environment variables for CI/CD
- Never log full tokens
- Validate inputs before executing commands
- Check which integrations are enabled before querying specific endpoints
- Be careful with backup operations - they can be destructive

## Troubleshooting

### 404 Errors

Some endpoints return 404 if the corresponding integration is not enabled or the REST API endpoint is not available:
- `persons` - Now uses entity states (always available)
- `zones` - Now uses entity states (always available)
- `registries` - May not be available via REST API; falls back to entity states for areas
- `backups` - Requires Hass.io/Supervisor; uses service calls
- `analytics` - May require analytics to be enabled in Home Assistant

### Timeout Errors

For large installations, increase timeout:
```bash
hassio --timeout 60000 discover
```

### Authentication Errors

Verify token is correct and not expired:
```bash
hassio settings validate
```
