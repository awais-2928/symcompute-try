# Logging Configuration

This project uses Winston for logging with Graylog integration support. The logging system provides comprehensive logging capabilities with configurable levels and multiple output destinations.

## Features

- **Multiple Log Levels**: error, warn, info, http, debug
- **Multiple Outputs**: Console, File, Graylog
- **Environment-based Configuration**: Enable/disable logging via environment variables
- **Automatic Log Rotation**: Daily log rotation with configurable retention
- **Request/Response Logging**: Automatic HTTP request/response logging
- **Authentication Logging**: Specialized logging for auth events
- **Error Handling**: Comprehensive error logging with stack traces

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Logging Configuration
LOG_ENABLED=true                    # Enable/disable logging (true/false)
LOG_LEVEL=info                      # Log level (error, warn, info, http, debug)
LOG_FILE_PATH=./logs                # Directory for log files
LOG_FILE_MAX_SIZE=20m               # Maximum size per log file
LOG_FILE_MAX_FILES=14d              # How long to keep log files

# Graylog Configuration
GRAYLOG_ENABLED=false               # Enable/disable Graylog integration
GRAYLOG_HOST=localhost              # Graylog server host
GRAYLOG_PORT=12201                  # Graylog server port
GRAYLOG_PROTOCOL=udp                # Protocol (udp or tcp)
GRAYLOG_FACILITY=nextjs-app         # Facility name for Graylog
```

## Log Levels

- **error**: Error events that might still allow the application to continue running
- **warn**: Warning messages for potentially harmful situations
- **info**: Informational messages that highlight the progress of the application
- **http**: HTTP request/response logging
- **debug**: Detailed information for debugging purposes

## Usage

### Basic Logging

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('my-service');

// Basic logging
logger.info('User logged in', { userId: '123', email: 'user@example.com' });
logger.error('Database connection failed', { error: 'Connection timeout' });
logger.warn('Rate limit exceeded', { ip: '192.168.1.1' });
logger.debug('Processing request', { requestId: 'req-123' });
```

### Specialized Logging Methods

```typescript
// Log HTTP requests
logger.logRequest(req, res, responseTime);

// Log errors with context
logger.logError(error, { userId: '123', action: 'updateProfile' });

// Log authentication events
logger.logAuth('signIn', userId, { provider: 'google' });

// Log database operations
logger.logDatabase('SELECT', 'users', { where: { active: true } });
```

### API Route Logging

```typescript
import { withLogging } from '@/lib/api-logger';

export const GET = withLogging(async (req) => {
  // Your API logic here
  return NextResponse.json({ data: 'success' });
});
```

## Log Files

When `LOG_ENABLED=true`, the following log files are created in the `LOG_FILE_PATH` directory:

- `error-YYYY-MM-DD.log`: Error level logs only
- `combined-YYYY-MM-DD.log`: All log levels
- `exceptions-YYYY-MM-DD.log`: Uncaught exceptions
- `rejections-YYYY-MM-DD.log`: Unhandled promise rejections

## Graylog Integration

To enable Graylog integration:

1. Set `GRAYLOG_ENABLED=true`
2. Configure your Graylog server details
3. Ensure your Graylog server is accessible from your application

The logs will be sent to Graylog in GELF (Graylog Extended Log Format) format.

## Development vs Production

- **Development**: Console logging is enabled by default
- **Production**: File and Graylog logging are enabled based on environment variables

## Middleware

The application includes middleware that automatically logs HTTP requests and responses. This is configured in `middleware.ts` and logs:

- Incoming requests (method, URL, user agent, IP)
- Outgoing responses (status code, response time)
- Request/response pairs for performance monitoring

## Best Practices

1. **Use appropriate log levels**: Don't log everything as info
2. **Include context**: Always include relevant metadata
3. **Avoid logging sensitive data**: Never log passwords, tokens, or PII
4. **Use structured logging**: Include objects for better searchability
5. **Monitor log volume**: Be mindful of log file sizes and retention

## Troubleshooting

### Logs not appearing
- Check `LOG_ENABLED` environment variable
- Verify `LOG_LEVEL` is set appropriately
- Ensure log directory has write permissions

### Graylog not receiving logs
- Verify `GRAYLOG_ENABLED=true`
- Check Graylog server connectivity
- Verify host, port, and protocol settings
- Check Graylog server logs for connection issues

### High log volume
- Adjust `LOG_LEVEL` to reduce verbosity
- Review log retention settings
- Consider log aggregation strategies
