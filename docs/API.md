# API Reference

Complete reference for all Home Assistant CLI commands and their options.

## Global Options

These options can be used with any command:

| Option | Environment Variable | Description | Default |
|--------|---------------------|-------------|---------|
| `-u, --url <url>` | `HASSIO_URL` | Home Assistant URL | - |
| `-t, --token <token>` | `HASSIO_TOKEN` | Long-lived access token | - |
| `-f, --format <format>` | `HASSIO_FORMAT` | Output format: toon, json, json-compact, yaml, table | toon |
| `--timeout <ms>` | `HASSIO_TIMEOUT` | Request timeout in milliseconds | 30000 |
| `-c, --config <path>` | - | Path to config file | `~/.hassio-cli/settings.json` |

## Core Commands

### status

Check if the Home Assistant API is running.

```bash
hassio status
```

**Response:**
```json
{ "message": "API running." }
```

### config

Get the current Home Assistant configuration.

```bash
hassio config
```

**Response Fields:**
- `components` - List of loaded components
- `config_dir` - Configuration directory path
- `elevation` - Elevation in meters
- `latitude` - Latitude coordinate
- `longitude` - Longitude coordinate
- `location_name` - Home Assistant location name
- `time_zone` - Time zone
- `unit_system` - Unit system configuration
- `version` - Home Assistant version

### components

Get list of loaded components.

```bash
hassio components
```

### events

Get list of available events and their listener counts.

```bash
hassio events
```

**Response:**
```json
[
  { "event": "state_changed", "listener_count": 5 },
  { "event": "time_changed", "listener_count": 2 }
]
```

### services

Get list of available services organized by domain.

```bash
hassio services
```

**Response:**
```json
[
  { "domain": "light", "services": ["turn_on", "turn_off", "toggle"] },
  { "domain": "switch", "services": ["turn_on", "turn_off"] }
]
```

## State Commands

### states

Get entity states.

```bash
# Get all states
hassio states

# Get specific entity
hassio states light.living_room
```

**Response Fields:**
- `entity_id` - Entity identifier
- `state` - Current state value
- `attributes` - Entity attributes object
- `last_changed` - ISO timestamp of last state change
- `last_updated` - ISO timestamp of last update
- `context` - Context information (id, parent_id, user_id)

### set-state

Set or update an entity state. Note: This creates a virtual state and does not communicate with actual devices.

```bash
hassio set-state <entity-id> <state> [-a, --attributes <json>]
```

**Arguments:**
- `entity-id` - Entity identifier (required)
- `state` - State value to set (required)

**Options:**
- `-a, --attributes <json>` - JSON attributes object

**Example:**
```bash
hassio set-state sensor.my_sensor 42 -a '{"unit":"°C","friendly_name":"My Sensor"}'
```

### delete-state

Delete an entity state.

```bash
hassio delete-state <entity-id>
```

## Service Commands

### call-service

Call a Home Assistant service.

```bash
hassio call-service <domain> <service> [options]
```

**Arguments:**
- `domain` - Service domain (e.g., light, switch, climate)
- `service` - Service name (e.g., turn_on, turn_off)

**Options:**
- `-e, --entity-id <entity>` - Target entity ID
- `-d, --data <json>` - JSON data to pass to service
- `-r, --return-response` - Return response data from service

**Examples:**
```bash
# Turn on a light
hassio call-service light turn_on -e light.living_room

# Set brightness and color
hassio call-service light turn_on -e light.living_room \
    -d '{"brightness":200,"rgb_color":[255,0,0]}'

# Get weather forecast with response
hassio call-service weather get_forecasts \
    -e weather.home \
    -d '{"type":"daily"}' \
    -r
```

### fire-event

Fire a Home Assistant event.

```bash
hassio fire-event <event-type> [-d, --data <json>]
```

**Arguments:**
- `event-type` - Type of event to fire

**Options:**
- `-d, --data <json>` - JSON event data

**Example:**
```bash
hassio fire-event MY_CUSTOM_EVENT -d '{"action":"test","value":42}'
```

### render-template

Render a Home Assistant Jinja2 template.

```bash
hassio render-template <template> [-f, --file <path>]
```

**Arguments:**
- `template` - Template string to render

**Options:**
- `-f, --file <path>` - Read template from file instead

**Example:**
```bash
hassio render-template "Temperature: {{ states('sensor.temperature') }}°C"
```

## History & Log Commands

### history

Get state history for entities.

```bash
hassio history -e <entities> [options]
```

**Required Options:**
- `-e, --entity-id <entities>` - Entity ID(s), comma-separated

**Optional Options:**
- `-s, --start-time <timestamp>` - Start time (ISO format)
- `-t, --end-time <timestamp>` - End time (ISO format)
- `-m, --minimal-response` - Use minimal response format
- `--no-attributes` - Exclude attributes from response
- `--significant-only` - Only significant changes

**Examples:**
```bash
# History for one entity (last 24 hours)
hassio history -e sensor.temperature

# Multiple entities with time range
hassio history -e sensor.temperature,sensor.humidity \
    -s "2024-01-01T00:00:00Z" \
    -t "2024-01-07T00:00:00Z"

# Minimal response for faster queries
hassio history -e sensor.temperature -m --no-attributes
```

### logbook

Get logbook entries.

```bash
hassio logbook [options]
```

**Options:**
- `-e, --entity-id <entity>` - Filter by entity ID
- `-s, --start-time <timestamp>` - Start time (ISO format)
- `-t, --end-time <timestamp>` - End time (ISO format)

**Examples:**
```bash
# All logbook entries
hassio logbook

# Filter by entity
hassio logbook -e light.living_room

# Specific time range
hassio logbook -s "2024-01-01T00:00:00Z" -t "2024-01-02T00:00:00Z"
```

### error-log

Get the Home Assistant error log.

```bash
hassio error-log
```

## Calendar Commands

### calendars

Get list of calendar entities.

```bash
hassio calendars
```

**Response:**
```json
[
  { "entity_id": "calendar.home", "name": "Home Calendar" },
  { "entity_id": "calendar.work", "name": "Work Calendar" }
]
```

### calendar-events

Get events from a calendar.

```bash
hassio calendar-events <entity-id> -s <start> -e <end>
```

**Arguments:**
- `entity-id` - Calendar entity ID

**Required Options:**
- `-s, --start <datetime>` - Start datetime (ISO format)
- `-e, --end <datetime>` - End datetime (ISO format)

**Example:**
```bash
hassio calendar-events calendar.home \
    -s "2024-01-01T00:00:00Z" \
    -e "2024-01-31T23:59:59Z"
```

## Camera Commands

### camera

Get camera image.

```bash
hassio camera <entity-id> [-o, --output <file>]
```

**Arguments:**
- `entity-id` - Camera entity ID

**Options:**
- `-o, --output <file>` - Output file path (default: stdout)

**Example:**
```bash
# Save to file
hassio camera camera.front_door -o snapshot.jpg

# Pipe to another command
hassio camera camera.front_door | some-command
```

## Configuration Commands

### check-config

Validate the Home Assistant configuration.

```bash
hassio check-config
```

**Response:**
```json
{
  "errors": null,
  "result": "valid"
}
```

### handle-intent

Handle a Home Assistant intent.

```bash
hassio handle-intent <name> [-d, --data <json>]
```

**Arguments:**
- `name` - Intent name

**Options:**
- `-d, --data <json>` - JSON intent data

**Example:**
```bash
hassio handle-intent SetTimer -d '{"seconds":"30"}'
```

## CLI Configuration Commands

### config-set

Set CLI configuration options.

```bash
hassio config-set [options]
```

**Options:**
- `-u, --url <url>` - Home Assistant URL
- `-t, --token <token>` - Long-lived access token
- `-f, --format <format>` - Default output format
- `--timeout <ms>` - Request timeout in milliseconds

**Example:**
```bash
hassio config-set --url "http://homeassistant.local:8123" \
                  --token "your-token" \
                  --format toon
```

### config-get

Get current CLI configuration (token is masked).

```bash
hassio config-get
```

### config-path

Show the path to the configuration file.

```bash
hassio config-path
```

## Error Handling

The CLI returns appropriate exit codes:

| Exit Code | Description |
|-----------|-------------|
| 0 | Success |
| 1 | Error (configuration, API error, etc.) |

Error messages are written to stderr and include:
- Clear description of the problem
- Suggested fix when applicable
- HTTP status code for API errors

## Output Format Reference

### TOON Format

Default format optimized for LLM token efficiency.

```
states[2]{entity_id,state,last_changed,attributes}:
  light.living_room,on,2024-01-01T00:00:00Z,"{""brightness"":255}"
  switch.kitchen,off,2024-01-01T01:00:00Z,"{}"
```

Features:
- Array length prefix `[N]`
- Field headers `{field1,field2,...}`
- CSV-style rows
- Escaped commas and quotes in values

### JSON Format

Standard pretty-printed JSON with 2-space indentation.

### JSON Compact

Minified JSON for maximum compatibility.

### YAML Format

YAML output for human readability.

### Table Format

ASCII table format for terminal display.

## Rate Limiting

The CLI does not implement client-side rate limiting. Be aware of Home Assistant's API rate limits when making many requests.

## Security Best Practices

1. **Never commit tokens** to version control
2. Use environment variables or config files for credentials
3. The config file (`~/.hassio-cli/settings.json`) should have restricted permissions
4. Long-lived access tokens can be revoked from Home Assistant's Profile page
