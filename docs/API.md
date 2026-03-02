# Home Assistant CLI - Complete API Reference

## Overview

This document provides a comprehensive reference for Home Assistant CLI commands and their options. The CLI provides broad REST API coverage with agent/LLM-optimized features.

## Global Options

These options can be used with any command:

| Option | Environment Variable | Description | Default |
|--------|---------------------|-------------|---------|
| `-u, --url <url>` | `HASSIO_URL` | Home Assistant URL | From config |
| `-t, --token <token>` | `HASSIO_TOKEN` | Long-lived access token | From config |
| `-f, --format <format>` | `HASSIO_FORMAT` | Output format | `toon` |
| `--timeout <ms>` | `HASSIO_TIMEOUT` | Request timeout (ms) | `30000` |
| `--read-only` | `HASSIO_READONLY` | Block state-changing API calls | `false` |
| `-c, --config <path>` | `HASSIO_CONFIG` | Settings file path | `~/.hassio-cli/settings.json` |

**Configuration Priority:**
1. CLI options (highest priority)
2. Environment variables
3. Config files (lowest priority): `settings.json` + `auth.json`

## Output Formats

### TOON (Default) - Token-Efficient

TOON (Token-Oriented Object Notation) provides ~40% token reduction vs JSON:

```
states[4]{entity_id,state,last_changed,attributes}:
  light.living_room,on,2024-01-01T00:00:00Z,"{...}"
  switch.kitchen,off,2024-01-01T01:00:00Z,"{}"
```

### Other Formats

- `json` - Pretty-printed JSON
- `json-compact` - Minified JSON
- `yaml` - YAML format
- `table` - ASCII table format

## Core API Commands

### Status & Configuration

#### `status`
Check if the Home Assistant API is running.

```bash
hassio status
# Output: message: API running.
```

#### `config`
Get the current Home Assistant configuration.

```bash
hassio config
```

Returns: components, config_dir, elevation, latitude, location_name, longitude, time_zone, unit_system, version

#### `components`
Get list of loaded components.

```bash
hassio components
hassio components --count
```

#### `events`
Get list of available events and their listener counts.

```bash
hassio events
hassio events --count
```

#### `services`
Get list of available services organized by domain.

```bash
hassio services
hassio services --domain light
hassio services --service turn_on
hassio services --count
hassio services --flat
```

Options:
- `-d, --domain <domain>`: filter by domain.
- `-s, --service <name>`: filter by service name.
- `--count`: show domain + service counts only.
- `--flat`: flatten to one row per `{domain, service}` including `field_count` and `has_response`.

## State Management

#### `states`
Get entity states.

```bash
# All states
hassio states
hassio states --count

# Specific entity
hassio states light.living_room
```

#### `set-state`
Set or update an entity state.

```bash
hassio set-state <entity-id> <state> [-a, --attributes <json>]

# Example
hassio set-state sensor.my_sensor 42 -a '{"unit":"°C"}'
```

#### `delete-state`
Delete an entity state.

```bash
hassio delete-state <entity-id>
```

## Service Calls

#### `call-service`
Call a Home Assistant service.

```bash
hassio call-service <domain> <service> [options]

Options:
  -e, --entity-id <entity>  Target entity
  -d, --data <json>         JSON data
  -r, --return-response     Return response data

# Examples
hassio call-service light turn_on -e light.living_room
hassio call-service light turn_on -e light.living_room -d '{"brightness":200,"rgb_color":[255,0,0]}'
hassio call-service weather get_forecasts -e weather.home -d '{"type":"daily"}' -r
```

#### `fire-event`
Fire a Home Assistant event.

```bash
hassio fire-event <event-type> [-d, --data <json>]

# Example
hassio fire-event MY_EVENT -d '{"action":"test"}'
```

#### `render-template`
Render a Home Assistant Jinja2 template.

```bash
hassio render-template <template> [-f, --file <path>]

# Examples
hassio render-template "{{ states('sensor.temperature') }}"
hassio render-template "" -f template.jinja
```

#### `handle-intent`
Handle a Home Assistant intent.

```bash
hassio handle-intent <name> [-d, --data <json>]

# Example
hassio handle-intent SetTimer -d '{"seconds":"30"}'
```

#### `check-config`
Validate Home Assistant configuration.

```bash
hassio check-config
```

## History & Logs

#### `history`
Get state history for entities.

```bash
hassio history -e <entities> [options]

Required:
  -e, --entity-id <entities>  Entity ID(s), comma-separated

Options:
  -s, --start-time <timestamp>  Start time (ISO format)
  -t, --end-time <timestamp>    End time (ISO format)
  -m, --minimal-response        Minimal response format
  --no-attributes               Exclude attributes
  --significant-only            Only significant changes

# Examples
hassio history -e sensor.temperature
hassio history -e sensor.temp1,sensor.temp2 -s "2024-01-01T00:00:00Z" -t "2024-01-07T00:00:00Z"
hassio history -e sensor.temperature -m --no-attributes
```

#### `logbook`
Get logbook entries.

```bash
hassio logbook [options]

Options:
  -e, --entity-id <entity>    Filter by entity
  -s, --start-time <timestamp>  Start time
  -t, --end-time <timestamp>    End time
```

#### `error-log`
Get the Home Assistant error log.

```bash
hassio error-log
```

## Calendar & Media

#### `calendars`
Get list of calendar entities.

```bash
hassio calendars
```

#### `calendar-events`
Get events from a calendar.

```bash
hassio calendar-events <entity-id> -s <start> -e <end>

Required:
  -s, --start <datetime>  Start datetime (ISO format)
  -e, --end <datetime>    End datetime (ISO format)

# Example
hassio calendar-events calendar.home -s "2024-01-01T00:00:00Z" -e "2024-01-31T23:59:59Z"
```

#### `camera`
Get camera image.

```bash
hassio camera <entity-id> [-o, --output <file>]

# Examples
hassio camera camera.front_door -o snapshot.jpg
hassio camera camera.front_door | convert - -resize 50% small.jpg
```

## Settings Commands

#### `settings wizard`
Interactive setup wizard.

```bash
hassio settings wizard [--skip-test]
hassio settings wizard --non-interactive --ha-url <url> --ha-token <token> [options]
```

Guides through URL, token, output format, and connection testing.
If `gh` is installed/authenticated and the repo is not starred yet, prompts to star `https://github.com/unbraind/homeassistant-cli`.
Use `--non-interactive` for agent/CI setup to avoid prompts.

#### `settings init`
Initialize from environment variables.

```bash
hassio settings init
```

Reads from: `HASSIO_URL`, `HASSIO_TOKEN`, `HASSIO_FORMAT`, `HASSIO_TIMEOUT`, `HASSIO_READONLY`
Also respects `HASSIO_CONFIG` for custom config file path.

#### `settings validate`
Validate configuration and test connection.

```bash
hassio settings validate
```

#### `settings set`
Set configuration options.

```bash
hassio settings set [options]

Options:
  --ha-url <url>             Home Assistant URL
  --ha-token <token>         Long-lived access token
  --default-format <format>  Output format (toon, json, json-compact, yaml, table, markdown)
  --default-timeout <ms>     Request timeout

# Example
hassio settings set --ha-url "http://192.168.1.100:8123" --ha-token "xyz"
hassio settings set --default-format json
hassio settings set --default-timeout 60000
hassio settings set --read-only true
```

#### `settings get`
View current configuration (token masked by default).

```bash
hassio settings get [options]

Options:
  --show-token   Show the full token (use with caution)

# Example
hassio settings get
hassio settings get --show-token
```

#### `settings path`
Show settings/auth/data file paths.

```bash
hassio settings path
```

#### `settings reset`
Reset all configuration (clear saved settings).

```bash
hassio settings reset [options]

Options:
  --force   Skip confirmation prompt

# Example
hassio settings reset --force
```

#### `settings list`
List all available configuration options.

```bash
hassio settings list
```

## LLM/Agent Optimized Commands

### Entity Management

#### `entities`
List and filter entities with advanced options.

```bash
hassio entities [options]

Options:
  -d, --domain <domain>      Filter by domain
  -s, --state <state>        Filter by state
  -p, --pattern <pattern>    Filter by entity_id pattern
  -a, --attributes <attrs>   Include specific attributes (comma-separated)
  -l, --limit <n>            Limit returned rows
  --count                    Return count only
  --domains                  Group and count by domain

# Examples
hassio entities -d light -s on      # Lights that are on
hassio entities --count             # Count only
hassio entities --domains           # Group by domain
hassio entities --domains --limit 5 # Top 5 domains
hassio entities -d sensor -a unit_of_measurement,device_class
```

#### `query`
Query entities using simple expressions.

```bash
hassio query <expression> [--summary] [--limit <n>]

Query Syntax:
  domain:<name>                     Filter by domain
  state:<value>                     Filter by state
  name:<pattern>                    Filter by entity_id substring
  attributes:<name>                 Has attribute
  attributes:<name>=<value>         Attribute equals value

# Examples
hassio query "domain:light"
hassio query "domain:light state:on"
hassio query "name:living_room"
hassio query "domain:sensor attributes:unit_of_measurement=°C"
hassio query "domain:binary_sensor" --summary
hassio query "domain:light state:on" --limit 20
```

#### `discover`
Discover and categorize entities.

```bash
hassio discover [options]

Options:
  --domains      List domains with counts
  --unavailable  List unavailable entities
  -l, --limit <n>  Limit returned rows

# Examples
hassio discover                    # Full overview
hassio discover --domains          # Domain breakdown
hassio discover --unavailable      # Find problems
```

#### `inspect`
Deep inspect an entity.

```bash
hassio inspect <entity-id> [options]

Options:
  --history      Include recent history
  -l, --limit <n>  History entries limit (default: 10)

# Examples
hassio inspect light.living_room
hassio inspect sensor.temperature --history
hassio inspect sensor.temperature --history -l 5
```

#### `batch`
Execute service calls in batch.

```bash
hassio batch -d <domain> -s <service> -e <entities> [--data <json>]

Required:
  -d, --domain <domain>      Service domain
  -s, --service <service>    Service name
  -e, --entities <entities>  Comma-separated entity IDs

Optional:
  --data <json>              JSON data for service

# Examples
hassio batch -d light -s turn_off -e light.living_room,light.kitchen,light.bedroom
hassio batch -d light -s turn_on -e light.living_room,light.kitchen --data '{"brightness": 200}'
```

## Registry Commands

#### `registries`
Query Home Assistant registries.

```bash
hassio registries [options]

Options:
  --entities      List entity registry
  --devices       List device registry
  --areas         List area registry
  --floors        List floor registry
  --labels        List label registry
  --categories    List category registry
  -d, --domain <domain>      Filter by domain
  --device-id <id>           Filter by device ID
  --area-id <id>             Filter by area ID
  --count                    Only return count

# Examples
hassio registries --entities --count                    # Count entities
hassio registries --devices --area-id area_living_room  # Devices in area
hassio registries --areas                               # List areas
```

## Statistics Commands

#### `statistics`
Query Home Assistant statistics data.

```bash
hassio statistics [options]

Options:
  -e, --entity-id <entities>  Entity ID(s), comma-separated (required)
  -s, --start-time <timestamp>  Start time (ISO format)
  -t, --end-time <timestamp>    End time (ISO format)
  -p, --period <period>         Period (5minute, hour, day, week, month)
  --types <types>               Statistics types (comma-separated)
  --during-period               Query during a specific period
  --metadata                    Query statistics metadata
  --count                       Return count-only summary

# Examples
hassio statistics -e sensor.temperature -p hour
hassio statistics -e sensor.temperature,sensor.humidity -s "2024-01-01T00:00:00Z" -t "2024-01-02T00:00:00Z"
hassio statistics -e sensor.energy -p day --types mean,max,min
hassio statistics --metadata --count
```

## List Management

### Todo Lists

#### `todo`
Manage todo lists.

```bash
hassio todo [options]

Options:
  --lists                    List all todo lists
  -e, --entity-id <entity>  Get items from a specific list
  -a, --add <summary>     Add a new todo item (requires --entity-id)
  --update <uid>           Update a todo item (requires --entity-id)
  --remove <uid>           Remove a todo item (requires --entity-id)
  -n, --name <summary>   New summary for update
  --description <desc>    Description for add/update
  --due <date>           Due date (ISO format) for add/update
  --complete             Mark item as completed
  --incomplete           Mark item as needing action
  --count               Only return count

# Examples
hassio todo --lists                    # List all todo lists
hassio todo -e todo.shopping           # Get shopping list items
hassio todo -e todo.shopping -a "Milk"  # Add item to list
hassio todo -e todo.shopping --update <uid> --complete  # Mark complete
hassio todo -e todo.shopping --remove <uid>  # Remove item
hassio todo --lists --count            # Count todo lists
```

### Shopping List

#### `shopping-list`
Manage shopping list.
Alias: `shopping`

```bash
hassio shopping-list [options]
hassio shopping [options]

Options:
  --list               List all items
  --pending            Show only pending items
  --completed          Show only completed items
  -a, --add <name>     Add a new item
  -u, --update <id>    Update an item
  -n, --name <name>    New name for update
  --complete           Mark as complete
  --incomplete         Mark as incomplete
  -d, --delete <id>    Delete an item
  --clear-completed    Clear all completed items
  --count              Only return count

# Examples
hassio shopping-list --list                      # List all items
hassio shopping-list --pending                   # Show pending
hassio shopping-list -a "Milk"                   # Add item
hassio shopping-list -u item_id --complete       # Mark complete
hassio shopping-list -d item_id                  # Delete item
hassio shopping-list --clear-completed           # Clear completed
```

### Notifications

#### `notifications`
Manage persistent notifications.

```bash
hassio notifications [options]

Options:
  --list                    List all notifications
  -c, --create <message>    Create a notification
  -t, --title <title>       Title for notification
  --id <notification-id>    Notification ID
  -d, --dismiss <id>        Dismiss a notification
  --dismiss-all             Dismiss all notifications
  --count                   Only return count

# Examples
hassio notifications --list                   # List notifications
hassio notifications -c "Alert!" -t "Warning" # Create notification
hassio notifications -d notification_1        # Dismiss notification
hassio notifications --dismiss-all            # Dismiss all
```

#### `notify`
Send notifications through Home Assistant notify services.

```bash
hassio notify <service> -m <message> [options]

Arguments:
  <service>                  Notification service (e.g., 'mobile_app_phone', 'email')

Required:
  -m, --message <message>    Notification message

Options:
  -t, --title <title>        Notification title
  --target <target>          Notification target (comma-separated)
  -d, --data <json>          Additional data as JSON string

# Examples
hassio notify mobile_app_phone -m "Front door opened"
hassio notify email -m "Alert!" -t "Warning" --target "user@example.com"
hassio notify mobile_app_phone -m "Test" -d '{"sound":"default"}'
```

## System Commands

#### `restart`
Restart Home Assistant.

```bash
hassio restart
```

This sends the `homeassistant.restart` service call to restart Home Assistant.

#### `stop`
Stop Home Assistant.

```bash
hassio stop
```

This sends the `homeassistant.stop` service call to stop Home Assistant.

#### `persons`
List all persons (from entity states).

```bash
hassio persons [--count]
```

Returns: entity_id, state, friendly_name, device_trackers, user_id

#### `zones`
List all zones (from entity states).

```bash
hassio zones [--count]
```

Returns: entity_id, state, friendly_name, latitude, longitude, radius, passive

#### `analytics`
Get Home Assistant analytics data.

```bash
hassio analytics
```

Returns: active_integrations, addons, energy, homeassistant, installation_type, integration_count, state_count, uuid, version

#### `backups`
Manage Home Assistant backups (via service calls).

```bash
hassio backups [options]

Options:
  -c, --create <name>  Create a new backup
  -r, --restore <id>   Restore a backup
  --compressed         Create compressed backup (default: true)
  --password <password>  Password for backup

# Examples
hassio backups -c "Daily Backup"                         # Create backup
hassio backups -c "Secure Backup" --password "secret"    # Create encrypted backup
hassio backups -r backup_slug --password "secret"        # Restore backup
```

Note: Backup management requires Hass.io/Supervisor. For full backup management, use the Home Assistant UI.

## Conversation & Voice Assistant Commands

#### `conversation`
Interact with Home Assistant conversation/voice assistants.

```bash
hassio conversation [options]

Options:
  --agents                    List available conversation agents
  -t, --text <text>           Process text through conversation
  -a, --agent-id <agentId>    Agent ID to use
  -c, --conversation-id <id>  Conversation ID for context

# Examples
hassio conversation --agents                    # List agents
hassio conversation -t "turn on living room light"
hassio conversation -t "what time is it" -a homeassistant
```

#### `ask`
Ask Home Assistant a question (shortcut for conversation).

```bash
hassio ask <text> [options]

Options:
  -a, --agent-id <agentId>    Agent ID to use

# Examples
hassio ask "what time is it"
hassio ask "turn on all lights" -a homeassistant
```

## Search Commands

#### `search`
Search Home Assistant entities using the API.

```bash
hassio search <query> [options]

Options:
  -d, --domain <domain>  Filter by domain
  -a, --area <area>      Filter by area
  -s, --state <state>    Filter by state
  --quick                Use quick local search (no API)
  --count                Only return count
  -l, --limit <n>        Limit returned rows

# Examples
hassio search "living room"
hassio search "light" -d light --quick
hassio search "sensor" --count
```

If `/api/search` is unavailable on your Home Assistant instance, this command automatically falls back to local entity-state search.

#### `find`
Quick search for entities by name/ID pattern.

```bash
hassio find <pattern> [options]

Options:
  -d, --domain <domain>  Filter by domain
  -s, --state <state>    Filter by state
  --count                Only return count

# Examples
hassio find "living"
hassio find "temp" -d sensor
hassio find "battery" --count
```

## Text-to-Speech Commands

#### `tts`
Text-to-Speech operations.

```bash
hassio tts [options]

Options:
  --engines              List available TTS engines
  --list-engines         Alias for --engines
  -m, --message <text>   Message to speak
  -e, --engine <id>      TTS engine ID
  -p, --player <entity>  Media player entity ID
  -l, --language <lang>  Language code
  --clear-cache          Clear TTS cache

# Examples
hassio tts --engines
hassio tts -m "Hello world" -p media_player.living_room
hassio tts -m "Test" -e tts.cloud -l en
hassio tts --clear-cache
```

#### `say`
Speak text through a media player (shortcut for TTS).

```bash
hassio say <message> -p <player> [options]

Required:
  -p, --player <entity>  Media player entity ID

Options:
  -e, --engine <id>      TTS engine ID

# Examples
hassio say "The front door is open" -p media_player.kitchen
hassio say "Welcome home" -p media_player.living_room -e tts.cloud
```

## Automation Commands

#### `automations`
Manage Home Assistant automations.

```bash
hassio automations [options]

Options:
  --list               List all automations
  --on <entity>        Turn on automation
  --off <entity>       Turn off automation
  --toggle <entity>    Toggle automation
  --trigger <entity>   Trigger automation
  --reload             Reload all automations
  --count              Only return count

# Examples
hassio automations --list                    # List all automations
hassio automations --count                   # Count automations
hassio automations --trigger automation.morning_lights
hassio automations --toggle automation.evening_mode
hassio automations --reload                  # Reload all automations
```

#### `scripts`
Manage Home Assistant scripts.

```bash
hassio scripts [options]

Options:
  --list               List all scripts
  --run <entity>       Execute a script
  -d, --data <json>    JSON variables for script
  --reload             Reload all scripts
  --count              Only return count

# Examples
hassio scripts --list                        # List all scripts
hassio scripts --run script.good_morning    # Execute script
hassio scripts --run script.set_mode -d '{"mode":"party"}'
hassio scripts --reload                      # Reload all scripts
```

#### `scenes`
Manage Home Assistant scenes.

```bash
hassio scenes [options]

Options:
  --list               List all scenes
  --apply <entity>     Apply a scene
  --reload             Reload all scenes
  --count              Only return count

# Examples
hassio scenes --list                         # List all scenes
hassio scenes --apply scene.movie_night    # Apply scene
hassio scenes --reload                       # Reload all scenes
```

## LLM/Agent Helper Commands

#### `schema`
Export CLI schema for LLM/agent consumption.

```bash
hassio schema [options]

Options:
  --commands           Export command schema
  --services           Export service schema from HA
  --entities           Export entity schema summary
  --full               Export full schema (all of the above)
  --count              Return counts only

# Examples
hassio schema --commands                     # Get command schema
hassio schema --services                     # Get service schema
hassio schema --full                         # Get full schema
hassio schema --services --count             # Domain/section counts
```

#### `action`
Intelligent action helper for LLMs.

```bash
hassio action <intent> [options]

Arguments:
  <intent>             Natural language intent (e.g., 'turn on living room lights')

Options:
  --dry-run            Show what would be done without executing

# Examples
hassio action "turn on living room lights" --dry-run
hassio action "toggle kitchen switch"
hassio action "activate movie scene"
```

## WebSocket Commands

#### `websocket` / `ws`
Access Home Assistant WebSocket API with full passthrough support.

```bash
hassio websocket --connect-test
hassio websocket status
hassio ws call -T get_states
hassio ws call -T config/device_registry/list -d '{"area_id":"kitchen"}'
hassio ws subscribe --event-type state_changed --wait-ms 10000 --max-events 20
```

## Supervisor Commands

#### `supervisor api`
Raw supervisor proxy passthrough.

```bash
hassio supervisor api -m GET -p /addons
hassio supervisor api -m POST -p /addons/core_ssh/start
```

#### `supervisor addons`
Add-on operations.

```bash
hassio supervisor addons --list
hassio supervisor addons --info core_ssh
hassio supervisor addons --start core_ssh
hassio supervisor addons --stop core_ssh
hassio supervisor addons --restart core_ssh
```

#### `supervisor host`
Host-level operations.

```bash
hassio supervisor host --reboot
hassio supervisor host --shutdown
```

#### `supervisor logs`
Fetch supervisor logs.

```bash
hassio supervisor logs
```

## Extended Commands

#### `energy`
Get Home Assistant energy dashboard preferences.

```bash
hassio energy
```

Returns energy dashboard configuration including device consumption, grid consumption, and production settings.

#### `weather`
Get weather forecasts from weather entities.

```bash
hassio weather [entity-id] [options]

Options:
  --type <type>        Forecast type (daily, hourly, twice_daily), default: daily
  --list               List all weather entities
  --count              Only return count

# Examples
hassio weather --list                      # List all weather entities
hassio weather weather.home --type daily   # Get daily forecast
hassio weather weather.home --type hourly  # Get hourly forecast
```

#### `health`
Get Home Assistant system health information.

```bash
hassio health
```

Returns system health data including Python version, installation type, timezone, and other system information.

#### `info`
Get comprehensive system information summary.

```bash
hassio info
```

Returns a consolidated summary including:
- API status
- Version
- Location name
- Timezone
- Entity statistics (total, domains, unavailable count)
- Top domains by entity count

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (configuration, API, etc.) |

## Error Handling

The CLI provides structured error output with clear problem descriptions and suggested fixes.

**Connection Error Example:**
```
❌ Failed to connect to Home Assistant at http://192.168.1.100:8123.
   Please check the URL and ensure Home Assistant is running.
```

**API Error Example:**
```
❌ API request failed: 401 - Unauthorized
   Status: 401
```

**Configuration Error Example:**
```
❌ Configuration not complete: Home Assistant URL is required.
   Set HASSIO_URL environment variable, add 'url' to ~/.hassio-cli/settings.json,
   or use --url option.
```

## Security Notes

- **Never commit tokens** to version control
- Config files are excluded from git via `.gitignore`
- Token is masked in `settings get` output
- Token is stored in `~/.hassio-cli/auth.json` (not in `settings.json`)
- `settings get` includes the resolved config path to avoid ambiguity
- Use environment variables for CI/CD pipelines
- Config file is written with `600` permissions (owner read/write only)

## Performance Tips

- Use TOON format (default) for minimal token usage
- Use `--count` instead of counting lines
- Use `--summary` for statistics
- Use `--minimal-response` with history for faster queries
- Use `--no-attributes` when you don't need attributes
- Batch operations instead of individual calls
- Filter using query parameters when possible
