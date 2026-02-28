# API Reference

Complete reference for all Home Assistant CLI commands and their options.

## Global Options

These options can be used with any command:

| Option | Environment Variable | Description | Default |
|--------|---------------------|-------------|---------|
| `-u, --url <url>` | `HASSIO_URL` | Home Assistant URL | - |
| `-t, --token <token>` | `HASSIO_TOKEN` | Long-lived access token | - |
| `-f, --format <format>` | `HASSIO_FORMAT` | Output format | `toon` |
| `--timeout <ms>` | `HASSIO_TIMEOUT` | Request timeout (ms) | `30000` |
| `-c, --config <path>` | `HASSIO_CONFIG` | Config file path | `~/.hassio-cli/settings.json` |

## Core API Commands

### status

Check if the Home Assistant API is running.

```bash
hassio status
```

**Response:**
```
message: API running.
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
- `location_name` - Location name
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

### services

Get list of available services organized by domain.

```bash
hassio services
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

### set-state

Set or update an entity state.

```bash
hassio set-state <entity-id> <state> [-a, --attributes <json>]
```

**Arguments:**
- `entity-id` - Entity identifier (required)
- `state` - State value (required)

**Options:**
- `-a, --attributes <json>` - JSON attributes

**Example:**
```bash
hassio set-state sensor.my_sensor 42 -a '{"unit":"°C"}'
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
- `domain` - Service domain (light, switch, etc.)
- `service` - Service name (turn_on, turn_off, etc.)

**Options:**
- `-e, --entity-id <entity>` - Target entity
- `-d, --data <json>` - JSON data
- `-r, --return-response` - Return response data

**Examples:**
```bash
# Turn on light
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

**Example:**
```bash
hassio fire-event MY_EVENT -d '{"action":"test"}'
```

### render-template

Render a Home Assistant Jinja2 template.

```bash
hassio render-template <template> [-f, --file <path>]
```

**Examples:**
```bash
# Inline template
hassio render-template "{{ states('sensor.temperature') }}"

# From file
hassio render-template "" --file template.jinja
```

### handle-intent

Handle a Home Assistant intent.

```bash
hassio handle-intent <name> [-d, --data <json>]
```

**Example:**
```bash
hassio handle-intent SetTimer -d '{"seconds":"30"}'
```

## History & Logs

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
- `-m, --minimal-response` - Minimal response format
- `--no-attributes` - Exclude attributes
- `--significant-only` - Only significant changes

**Examples:**
```bash
# History for one entity (last 24h)
hassio history -e sensor.temperature

# Multiple entities with time range
hassio history -e sensor.temp1,sensor.temp2 \
    -s "2024-01-01T00:00:00Z" \
    -t "2024-01-07T00:00:00Z"

# Minimal response
hassio history -e sensor.temperature -m --no-attributes
```

### logbook

Get logbook entries.

```bash
hassio logbook [options]
```

**Options:**
- `-e, --entity-id <entity>` - Filter by entity
- `-s, --start-time <timestamp>` - Start time
- `-t, --end-time <timestamp>` - End time

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

### calendar-events

Get events from a calendar.

```bash
hassio calendar-events <entity-id> -s <start> -e <end>
```

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

**Options:**
- `-o, --output <file>` - Output file (default: stdout)

**Examples:**
```bash
# Save to file
hassio camera camera.front_door -o snapshot.jpg

# Pipe to command
hassio camera camera.front_door | convert - -resize 50% small.jpg
```

## Configuration Commands

### check-config

Validate Home Assistant configuration.

```bash
hassio check-config
```

## Settings Commands

### settings wizard

Interactive setup wizard.

```bash
hassio settings wizard [--skip-test]
```

Guides you through:
- Setting Home Assistant URL
- Creating access token
- Choosing output format
- Testing connection

### settings init

Initialize from environment variables.

```bash
hassio settings init
```

Reads from:
- `HASSIO_URL`
- `HASSIO_TOKEN`
- `HASSIO_FORMAT`
- `HASSIO_TIMEOUT`

### settings validate

Validate configuration and test connection.

```bash
hassio settings validate
```

### settings set

Set configuration options.

```bash
hassio settings set [options]
```

**Options:**
- `-u, --url <url>` - Home Assistant URL
- `-t, --token <token>` - Access token
- `-f, --format <format>` - Output format
- `--timeout <ms>` - Timeout

**Example:**
```bash
hassio settings set --url "http://192.168.1.100:8123" --token "xyz"
```

### settings get

View current configuration (token masked).

```bash
hassio settings get
```

### settings path

Show configuration file path.

```bash
hassio settings path
```

## LLM/Agent Optimized Commands

### entities

List and filter entities with advanced options.

```bash
hassio entities [options]
```

**Options:**
- `-d, --domain <domain>` - Filter by domain
- `-s, --state <state>` - Filter by state
- `-p, --pattern <pattern>` - Filter by entity_id pattern
- `-a, --attributes <attrs>` - Include specific attributes (comma-separated)
- `--count` - Return count only
- `--domains` - Group and count by domain

**Examples:**
```bash
# All lights that are on
hassio entities -d light -s on

# Count only
hassio entities --count

# Group by domain
hassio entities --domains

# Select specific attributes
hassio entities -d sensor -a unit_of_measurement,device_class
```

### query

Query entities using simple expressions.

```bash
hassio query <expression> [--summary]
```

**Query Syntax:**
- `domain:<name>` - Filter by domain
- `state:<value>` - Filter by state
- `name:<pattern>` - Filter by entity_id substring
- `attributes:<name>` - Has attribute
- `attributes:<name>=<value>` - Attribute equals value

**Examples:**
```bash
# Basic domain filter
hassio query "domain:light"

# Multiple conditions
hassio query "domain:light state:on"

# By name pattern
hassio query "name:living_room"

# With attributes
hassio query "domain:sensor attributes:unit_of_measurement=°C"

# Summary only
hassio query "domain:binary_sensor" --summary
```

### discover

Discover and categorize entities.

```bash
hassio discover [options]
```

**Options:**
- `--domains` - List domains with counts
- `--unavailable` - List unavailable entities

**Examples:**
```bash
# Full overview
hassio discover

# Domain breakdown
hassio discover --domains

# Find problems
hassio discover --unavailable
```

### batch

Execute service calls in batch.

```bash
hassio batch -d <domain> -s <service> -e <entities> [--data <json>]
```

**Required Options:**
- `-d, --domain <domain>` - Service domain
- `-s, --service <service>` - Service name
- `-e, --entities <entities>` - Comma-separated entity IDs

**Optional Options:**
- `--data <json>` - JSON data for service

**Examples:**
```bash
# Turn off multiple lights
hassio batch -d light -s turn_off \
    -e light.living_room,light.kitchen,light.bedroom

# Set brightness
hassio batch -d light -s turn_on \
    -e light.living_room,light.kitchen \
    --data '{"brightness": 200}'
```

### inspect

Deep inspect an entity.

```bash
hassio inspect <entity-id> [options]
```

**Options:**
- `--history` - Include recent history
- `-l, --limit <n>` - History entries limit (default: 10)

**Examples:**
```bash
# Basic inspection
hassio inspect light.living_room

# With history
hassio inspect sensor.temperature --history

# Limited history
hassio inspect sensor.temperature --history -l 5
```

## Output Formats

### TOON (Default)

Token-efficient format for LLMs.

```
states[2]{entity_id,state,last_changed}:
  light.living_room,on,2024-01-01T00:00:00Z
  switch.kitchen,off,2024-01-01T01:00:00Z
```

### JSON

Pretty-printed JSON.

```json
[
  {
    "entity_id": "light.living_room",
    "state": "on",
    "last_changed": "2024-01-01T00:00:00Z"
  }
]
```

### JSON Compact

Minified JSON.

```json
[{"entity_id":"light.living_room","state":"on"}]
```

### YAML

YAML format.

```yaml
- entity_id: light.living_room
  state: on
  last_changed: "2024-01-01T00:00:00Z"
```

### Table

ASCII table format.

```
Entity ID           | State | Last Changed
--------------------+-------+-------------------------
light.living_room   | on    | 2024-01-01T00:00:00Z
switch.kitchen      | off   | 2024-01-01T01:00:00Z
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (configuration, API, etc.) |

## Error Handling

Error messages include:
- Clear problem description
- Suggested fix
- HTTP status code (for API errors)

**Example:**
```
❌ Configuration not complete: Home Assistant URL is required. 
Set HASSIO_URL environment variable, add 'url' to ~/.hassio-cli/settings.json, 
or use --url option.
```
