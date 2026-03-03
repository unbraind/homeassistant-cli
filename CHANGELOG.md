# Changelog

All notable changes to the Home Assistant CLI project will be documented in this file.

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
- Live E2E validation against HA 2026.1.3 (http://192.168.1.208:8123): all commands verified

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
