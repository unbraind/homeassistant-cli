# Changelog

All notable changes to the Home Assistant CLI project will be documented in this file.

## [2026.3.4] - 2026-03-04

### Improvements
- Added global flags help section to all command `--help` outputs for consistent discoverability.
- Added `hassio settings setup` as an alias of `hassio settings wizard` for clearer onboarding.
- Reduced `src/cli.ts` to stay under the 300-line source file limit.

### Testing
- Added coverage for global help output (`tests/global-help.test.ts`).
- Added setup alias behavior coverage in settings wizard tests.
- Full suite passing: 977 tests across 98 test files.

### Documentation
- Updated `README.md`, `docs/API.md`, and `docs/INDEX.md` for global flags help behavior and setup alias usage.

## [2026.3.4-57] - 2026-03-04

### Breaking Changes
- **TOON output format**: Replaced custom TOON implementation with official `@toon-format/toon` library for full spec compliance. Escaping now uses `\"` instead of `""`, and strings containing colons are properly quoted per TOON spec §7.2.

### Improvements
- **Spec-conformant TOON output**: Integrated official `@toon-format/toon` v2.1.0 for deterministic, standards-compliant TOON encoding
- **Eliminated duplicate helpers**: Removed `commands/llm/shared.ts`, consolidated into `utils/command-helpers.ts`
- **Project cleanup**: Removed 18 obsolete development status/report files from root and docs/
- **Test coverage**: 975 tests across 97 test files, 96% statement coverage

### Documentation
- Updated docs/INDEX.md with accurate command inventory and coverage stats
- Cleaned docs/ to contain only canonical documentation files

## [2026.3.4-54] - 2026-03-04

### Added

#### New System & Integration Commands (6 new commands)
- **`sun`** - Get solar/sun position info from `sun.sun`:
  - Returns state (`above_horizon` / `below_horizon`), elevation, azimuth, rising flag
  - Includes next_dawn, next_rising, next_noon, next_setting, next_dusk, next_midnight times
  - Useful for agents/automations that need daytime awareness
- **`logger`** - Manage HA log levels:
  - `--set-default <level>` - Set default log level (debug, info, warning, error, fatal, critical)
  - `--set <component=level>` - Set log level for a specific component (repeatable for multiple)
- **`recorder`** - Manage the HA recorder (database):
  - `--purge [--keep-days <n>] [--repack]` - Purge old recorder data
  - `--purge-entities <ids>` - Purge specific entity IDs from DB (comma-separated)
  - `--enable` / `--disable` - Enable or disable recording
- **`mqtt`** - MQTT integration operations:
  - `--publish --topic <t> [--payload <p>] [--qos 0|1|2] [--retain]` - Publish message
  - `--reload` - Reload MQTT YAML configuration
- **`schedule`** - Browse and manage schedule helper entities:
  - Lists all `schedule.*` entities with state, friendly_name, icon
  - `--reload` - Reload schedule configuration
  - `--entity-id <id>` - Get detailed schedule data (calls `schedule.get_schedule`)
  - `--state <on|off>` / `--count` filtering
- **`utility-meter`** - Browse and manage utility meter helpers:
  - Lists utility meter `sensor.*` entities (identified by `source` + `last_period` attrs)
  - `--reset <entityId>` - Reset meter to zero
  - `--calibrate <entityId> --value <n>` - Set meter to specific value
  - `--state <value>` / `--count` filtering

### Tests
- 929 tests total (+34 new), 6 new test files (sun, logger, recorder, mqtt, schedule, utility-meter commands)

## [2026.3.4-53] - 2026-03-04

### Added

#### New Domain Command
- **`device-tracker`** - Browse `device_tracker.*` entities (phones, tags, presence):
  - `--state <state>` - Filter by state: home, not_home, unknown, or zone name
  - `--home` - Shortcut to show only home devices
  - `--away` - Shortcut to show only non-home devices
  - `--source <type>` - Filter by source type (gps, router, bluetooth, manual)
  - `--count` - Return count only
  - Includes GPS coordinates (latitude, longitude, gps_accuracy) in output

### Improved
- **Test coverage**: Settings wizard test coverage 44.64% → 100% (statement); added interactive readline path tests
- **Overall coverage**: 92.96% → 93.78%

### Tests
- 895 tests total (+17 new), 2 new test files (device-tracker-command, improved settings-wizard)

## [2026.3.4-52] - 2026-03-04

### Added

#### New Domain Commands (3 new commands)
- **`vacuum`** - Robot vacuum control:
  - `--start/--pause/--stop <entity-id>` - Start, pause, or stop cleaning
  - `--return-to-base <entity-id>` - Send to docking station
  - `--clean-spot <entity-id>` - Spot cleaning mode
  - `--locate <entity-id>` - Locate vacuum (play sound)
  - `--entity-id <id> --fan-speed <speed>` - Set fan speed
  - `--entity-id <id> --command <cmd> --params <json>` - Send custom command
  - `--state <state>`, `--count` - Listing/filtering

- **`valve`** - Valve entity control:
  - `--open/--close/--stop/--toggle <entity-id>` - Open, close, stop, or toggle
  - `--entity-id <id> --position <0-100>` - Set valve position percentage
  - `--state <state>`, `--count` - Listing/filtering

- **`water-heater`** - Water heater control:
  - `--on/--off <entity-id>` - Turn on/off
  - `--entity-id <id> --temperature <°C>` - Set target temperature
  - `--entity-id <id> --operation-mode <mode>` - Set operation mode
  - `--entity-id <id> --away-mode <on|off>` - Set away mode
  - `--state <state>`, `--count` - Listing/filtering

### Tests
- 878 tests total (30 new), 3 new test files covering all new commands

## [2026.3.4-49] - 2026-03-04

### Added

#### Device Control Commands (6 new commands)
- **`light`** - Full light entity control:
  - `--on/--off/--toggle <entity-id>` - Basic control
  - `--entity-id <id>` with modifiers - Turn on with options
  - `--brightness <0-255>`, `--brightness-pct <0-100>` - Brightness control
  - `--color-temp <mireds>`, `--kelvin <k>` - Color temperature
  - `--rgb <r,g,b>`, `--hs <h,s>`, `--color-name <name>` - Color control
  - `--effect <name>`, `--transition <s>`, `--flash <short|long>` - Effects
  - `--state <on|off|unavailable>`, `--count` - Listing/filtering

- **`switch`** - Switch entity control:
  - `--on/--off/--toggle <entity-id>` - On/off/toggle
  - `--state <on|off>`, `--count` - Listing/filtering

- **`climate`** - Climate/thermostat control:
  - `--on/--off/--toggle <entity-id>` - Power control
  - `--entity-id <id> --set-temp <°C>` - Set target temperature
  - `--entity-id <id> --set-mode <mode>` - Set HVAC mode (heat/cool/auto/dry/fan_only/heat_cool/off)
  - `--entity-id <id> --set-preset <preset>` - Set preset (eco/away/boost/comfort/home/sleep)
  - `--entity-id <id> --set-humidity <0-100>` - Set target humidity
  - `--entity-id <id> --set-fan <mode>` - Set fan mode
  - `--entity-id <id> --set-swing <mode>` - Set swing mode
  - `--state <mode>`, `--count` - Listing/filtering

- **`cover`** - Cover entity control (blinds, shutters, garage doors):
  - `--open/--close/--stop/--toggle <entity-id>` - Basic movement
  - `--entity-id <id> --position <0-100>` - Set cover position
  - `--entity-id <id> --tilt <0-100>` - Set tilt position
  - `--open-tilt/--close-tilt/--stop-tilt <entity-id>` - Tilt control
  - `--state <open|closed|opening|closing>`, `--count` - Listing/filtering

- **`lock`** - Lock entity control:
  - `--lock/--unlock/--open <entity-id>` - Lock operations
  - `--code <code>` - Access code (use with lock/unlock/open)
  - `--state <locked|unlocked|jammed>`, `--count` - Listing/filtering

- **`fan`** - Fan entity control:
  - `--on/--off/--toggle <entity-id>` - Basic control
  - `--entity-id <id> --percentage <0-100>` - Set fan speed
  - `--entity-id <id> --preset <mode>` - Set preset mode
  - `--entity-id <id> --direction <forward|reverse>` - Set direction
  - `--oscillate <entity-id>` / `--no-oscillate` - Oscillation control
  - `--increase-speed/--decrease-speed <entity-id>` - Speed increments
  - `--on <entity-id> --percentage/--preset` - Turn on with settings
  - `--state <on|off>`, `--count` - Listing/filtering

### Improved
- **Test coverage**: 90.4% → 92.06% (746 tests across 76 test files, up from 654 tests)
- **`api/media.ts`**: Coverage raised from 23.46% → 100% with 25 new API-level tests covering all media player methods

## [2026.3.4-48] - 2026-03-04

### Added

#### Timer Management (`timers` command)
- **`timers`** / **`timers list`** - List all HA timers with state info
- **`timers list --count`** - Return timer count only
- **`timers start <entity-id>`** - Start a timer (with optional `--duration`)
- **`timers pause <entity-id>`** - Pause a running timer
- **`timers cancel <entity-id>`** - Cancel a timer
- **`timers finish <entity-id>`** - Finish a timer immediately
- **`timers change <entity-id>`** - Change timer duration (with `--duration`)
- **`timers reload`** - Reload timer configuration

#### Input Helper Management (`input` command)
- **`input boolean list [--count]`** - List input_boolean helpers
- **`input boolean turn-on/turn-off/toggle <entity-id>`** - Control input booleans
- **`input text list [--count]`** - List input_text helpers
- **`input text set <entity-id> <value>`** - Set input text value
- **`input number list [--count]`** - List input_number helpers
- **`input number set <entity-id> <value>`** - Set input number value
- **`input select list [--count]`** - List input_select helpers
- **`input select set <entity-id> <option>`** - Set input select option
- **`input datetime list [--count]`** - List input_datetime helpers
- **`input datetime set <entity-id> <value>`** - Set input datetime value
- **`input button list [--count]`** - List input_button helpers
- **`input button press <entity-id>`** - Press an input button

### Testing
- **654 tests passing** across **69 test files** — coverage: **90.64%** (up from 395 tests / 47 files / ~77%)
- New test files covering previously low-coverage paths:
  - `core-commands.test.ts`, `history-command.test.ts`, `services-extended.test.ts`
  - `system-extended.test.ts`, `cli-config-extended.test.ts`, `api-system-extended.test.ts`
  - `api-conversation-extended.test.ts`, `formatters-index.test.ts`, `llm-entities-extended.test.ts`
  - `supervisor-extended.test.ts`, `api-registries-ws.test.ts`, `api-search-extended.test.ts`
  - `github-star-extended.test.ts`, `capabilities-matrix.test.ts`
- All critical code paths now covered: formatters, API clients, CLI commands, WebSocket registry, capability matrix

### Documentation
- Updated `docs/INDEX.md` with `timers` and `input` command tables
- Updated test statistics throughout docs to reflect current coverage

## [1.2.0] - 2026-03-03

### Added

#### Assist Pipeline Management (`pipeline` command)
- **`pipeline list`** - List all assist pipelines with preferred pipeline info
- **`pipeline list --count`** - Return pipeline count only
- **`pipeline get <id>`** - Get details of a specific pipeline
- **`pipeline create --name <name> [--language <lang>]`** - Create a new pipeline
- **`pipeline delete <id>`** - Delete an assist pipeline
- **`pipeline set-preferred <id>`** - Set the preferred assist pipeline
- Uses WebSocket `assist_pipeline/pipeline/list|get|create|delete|set_preferred` commands

#### WebSocket-based Registry Access
- **`registries`** command completely rewritten to use WebSocket instead of REST
- All registry types now use WebSocket API (required by HA 2024+):
  - Entity registry: `config/entity_registry/list`
  - Device registry: `config/device_registry/list`
  - Area registry: `config/area_registry/list`
  - Floor registry: `config/floor_registry/list`
  - Label registry: `config/label_registry/list`
  - Category registry: `config/category_registry/list`
- New `WebSocketRegistryClient` class in `src/api/registries.ts`
- Graceful fallback to state-based area discovery if WebSocket unavailable

### Fixed

#### Test Isolation and Compatibility
- **`tests/api-base.test.ts`**: Replaced `vi.advanceTimersByTimeAsync` (not available in Bun) with zero-delay retry client approach
- **`tests/registry-crud.test.ts`**: Changed from `vi.mock("../src/api/client.js")` (caused module contamination) to `vi.mock("undici")` - consistent with all other tests
- **`tests/media-command.test.ts`**: Fixed `importOriginal` parameter syntax to use `vi.importActual()` instead
- **`vitest.config.ts`**: Added `pool: "forks"` for proper process-level test isolation

#### Registry Command
- Fixed: `registries` command was returning 404 errors via REST API (HA 2024+ moved registries to WebSocket-only)
- Live verification: `registries --areas` returns 10 areas, `--entities` 703, `--devices` 409

### Testing
- All **395 tests passing** across **47 test files** (up from 238 tests / 35 files)
- Test coverage maintained and expanded
- New test files: `api-base.test.ts`, `api-errors.test.ts`, `api-websocket.test.ts`, `automation-command.test.ts`, `extended-command.test.ts`, `formatters-extended.test.ts`, `lists-command.test.ts`, `media-command.test.ts`, `notify-command.test.ts`, `pipeline-command.test.ts`, `search-command.test.ts`, `system-command.test.ts`
- Live E2E validation against HA 2026.1.3 instance: all commands verified

## [1.1.0] - 2026-03-03

### Added - Agent Optimization & Production Enhancements

#### Stable Error Envelope for Agents
- **New Error Envelope Interface**: All errors now return structured `AgentErrorEnvelope` with:
  - `code`: Machine-readable error code (AUTH_FAILED, FORBIDDEN, NOT_FOUND, RATE_LIMITED, SERVER_ERROR, CLIENT_ERROR, CONNECTION_FAILED, READ_ONLY_MODE, TIMEOUT, UNKNOWN_ERROR)
  - `message`: Human-readable error message
  - `hint`: Actionable guidance for resolution
  - `retriable`: Boolean flag indicating if retry is recommended
  - `statusCode`: HTTP status code (when applicable)
  - `endpoint`: API endpoint (when applicable)
  - `timestamp`: ISO 8601 timestamp
- **Multi-format Error Output**: Errors can be formatted in TOON, JSON, YAML, table, or markdown formats
- **Enhanced Error Classes**:
  - `HomeAssistantApiError` - API errors with status codes
  - `HomeAssistantConnectionError` - Network/connection failures
  - `HomeAssistantReadOnlyError` - Write operation blocked in read-only mode
  - `HomeAssistantTimeoutError` - Request timeout errors
- **Agent-Friendly Function**: `formatErrorForAgent()` for consistent error formatting

#### Automatic Retry with Exponential Backoff
- **Smart Retry Logic**: Automatic retry for transient failures
  - Retryable status codes: 429 (rate limit), 500, 502, 503, 504 (server errors)
  - Connection failures (ECONNREFUSED, ENOTFOUND, ETIMEDOUT, ECONNRESET)
  - Timeout errors
- **Exponential Backoff**: Configurable backoff strategy
  - Default: 3 retries max
  - Initial delay: 1000ms
  - Max delay: 10000ms
  - Backoff multiplier: 2x
- **Skip Retry Option**: `skipRetry` parameter to disable retry for specific requests

#### Extended API Coverage

##### Person Management (Full CRUD)
- `getPerson(personId)` - Get specific person
- `createPerson(data)` - Create new person
- `updatePerson(personId, data)` - Update person
- `deletePerson(personId)` - Delete person
- Support for device trackers and user association

##### Zone Management (Full CRUD)
- `getZone(zoneId)` - Get specific zone
- `createZone(data)` - Create new zone with location data
- `updateZone(zoneId, data)` - Update zone
- `deleteZone(zoneId)` - Delete zone
- Support for latitude, longitude, radius, passive mode, and icons

##### Backup Management Enhancements
- `uploadBackup(file, filename)` - Upload backup file
- Enhanced backup creation with compression and password options

##### Media Player Control (New Client)
- **New `MediaPlayerClient`** with comprehensive media control:
  - `mediaPlay()` - Play media
  - `mediaPause()` - Pause playback
  - `mediaPlayPause()` - Toggle play/pause
  - `mediaStop()` - Stop playback
  - `mediaNextTrack()` - Next track
  - `mediaPreviousTrack()` - Previous track
  - `mediaSeek(entityId, seekPosition)` - Seek to position
  - `volumeSet(entityId, volumeLevel)` - Set volume (0.0-1.0)
  - `volumeMute(entityId, isMuted)` - Mute/unmute
  - `volumeUp()` - Increase volume
  - `volumeDown()` - Decrease volume
  - `selectSource(entityId, source)` - Select input source
  - `selectSoundMode(entityId, soundMode)` - Select sound mode
  - `shuffleSet(entityId, shuffle)` - Enable/disable shuffle
  - `repeatSet(entityId, repeat)` - Set repeat mode (off/all/one)
  - `playMedia(entityId, mediaContentId, mediaContentType)` - Play specific media
  - `join(groupMembers, entityId)` - Join players to group
  - `unjoin(entityId)` - Remove from group
  - `browseMedia(entityId, mediaContentId?, mediaContentType?)` - Browse media library

### Enhanced - Production Readiness

#### Type Safety
- Full TypeScript strict mode compliance
- Enhanced type definitions for all new endpoints
- Proper optional property handling with `exactOptionalPropertyTypes`

#### Code Organization
- All files under 300 LOC (excluding comments)
- Modular API client structure
- Clear separation of concerns
- Consistent naming conventions

#### Error Handling
- Comprehensive error scenarios covered
- Actionable error hints for agents
- Structured error codes for programmatic handling
- Retry guidance built into error responses

#### Documentation
- Updated API reference with new endpoints
- Enhanced LLM integration guide
- Improved examples and use cases
- Comprehensive error handling documentation

### Technical Details

#### Dependencies
- No new runtime dependencies
- Uses existing `undici` for HTTP requests
- Leverages built-in `FormData` for file uploads

#### Breaking Changes
- None - All changes are backward compatible
- Error objects now include additional `envelope` property
- BaseClient constructor accepts optional `retryConfig` parameter

#### Performance
- Retry logic reduces transient failure impact
- Exponential backoff prevents server hammering
- Connection reuse maintained via undici

### Migration Guide

#### For Users
No migration needed - all changes are backward compatible.

#### For Developers
If you're using the API clients directly:

```typescript
// Old way - still works
const client = new SystemApiClient(config);

// New way - with custom retry config
const client = new SystemApiClient(config, {
  maxRetries: 5,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
});
```

Error handling with new envelope:

```typescript
try {
  await client.getStates();
} catch (error) {
  if (error instanceof HomeAssistantApiError) {
    // Access structured error envelope
    const envelope = error.toAgentEnvelope();
    console.log('Error code:', envelope.code);
    console.log('Hint:', envelope.hint);
    console.log('Retriable:', envelope.retriable);
    
    // Format for agents
    const agentError = formatErrorForAgent(error, 'json');
  }
}
```

### Testing
- All 238 existing tests continue to pass
- Test coverage maintained at 47.5%
- No regressions introduced
- New functionality ready for test coverage expansion

### Security
- No private data committed to repository
- `.gitignore` properly configured
- Token masking maintained
- File permissions enforced (0600 for config files)

## [1.0.0] - Previous Release

### Initial Features
- Core Home Assistant API coverage
- Multiple output formats (TOON, JSON, YAML, table, markdown)
- LLM/agent optimization
- Interactive setup wizard
- Read-only safety mode
- WebSocket support
- Supervisor API access
- Registry management
- Statistics and history
- Automation, scripts, and scenes
- Conversation and voice assistants
- Text-to-speech
- Search and discovery
- Configuration management
- Comprehensive command coverage

---

For more details on features and usage, see:
- [README.md](../README.md)
- [API Reference](./API.md)
- [LLM Integration Guide](./LLM_INTEGRATION.md)
