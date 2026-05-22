# 📊 Logging System Documentation

Sistem logging backend menggunakan **Winston** untuk monitoring aktivitas, error, dan request/response tracking.

## 📁 File Structure

```
src/
├── utils/
│   └── logger.ts              # Logger configuration
├── middlewares/
│   └── logger.middleware.ts   # Logging middleware
└── index.ts                   # Integrated logging
```

## 📝 Log Files

Semua logs tersimpan di direktori `logs/`:

```
logs/
├── all.log         # Semua log (info, warn, error, http, debug)
├── error.log       # Error logs only
├── http.log        # HTTP requests/responses
├── exceptions.log  # Uncaught exceptions
└── rejections.log  # Unhandled rejections
```

## 🎯 Log Levels

| Level | Priority | Usage |
|-------|----------|-------|
| **error** | 0 | Errors dan exceptions |
| **warn** | 1 | Warning dan potential issues |
| **info** | 2 | General informational messages |
| **http** | 3 | HTTP request/response logging |
| **debug** | 4 | Debug information |

## 🚀 Features

### 1. **Request ID Tracking**
Setiap request mendapat unique ID untuk tracking di seluruh lifecycle:
```
[a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6] GET /api/users - IP: ::1
[a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6] Response 200 - 45ms
```

### 2. **HTTP Logging**
Automatic logging untuk semua HTTP requests dengan:
- Request method, URL, IP
- Response status code dan response time
- Request ID untuk correlation

### 3. **Error Handling**
Comprehensive error logging dengan:
- Stack traces
- Request context (body, params, query)
- Error timestamp dan request ID
- Differentiation antara status dan app errors

### 4. **Uncaught Exception Handler**
- Catch uncaught exceptions
- Log dengan full details
- Graceful shutdown

### 5. **Unhandled Rejection Handler**
- Monitor promise rejections
- Track dengan reason dan promise

## 📖 Usage Examples

### Logger di Controllers/Services

```typescript
import { logger } from "../utils/logger";

// Info log
logger.info("User registered successfully", { userId: "123" });

// Warn log
logger.warn("Deprecated endpoint used", { endpoint: "/api/old-endpoint" });

// Error log
logger.error("Database connection failed", { error: err });

// Debug log
logger.debug("Processing user data", { data: userData });

// HTTP log
logger.http("[request-id] GET /api/users - Status: 200");
```

### Using Async Handler Wrapper

Middleware sudah menyediakan `asyncHandler` untuk wrap async route handlers:

```typescript
import { asyncHandler } from "../middlewares/logger.middleware";

router.get("/users", asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
}));
```

## 🔍 Monitoring Tips

### Real-time Log Viewing

```bash
# Watch all logs
tail -f logs/all.log

# Watch error logs only
tail -f logs/error.log

# Watch HTTP logs
tail -f logs/http.log

# Count errors
grep "error" logs/all.log | wc -l
```

### Environment Variables

```env
# Set log level (error, warn, info, http, debug)
# Default: debug
LOG_LEVEL=info

# Node environment (development, production)
NODE_ENV=production
```

## 🎨 Log Format

### Standard Log Format
```
2026-05-22 17:46:56:4656 info: [request-id] Message here
2026-05-22 17:46:56:4656 error: Database query failed
2026-05-22 17:46:56:4656 warn: API rate limit approaching
```

### Error Log Format
```
2026-05-22 17:46:56:4656 error: [request-id] Database query failed
Stack: Error: Connection timeout
    at query (/src/services/db.ts:45:12)
    at processRequest (/src/controllers/user.ts:23:8)
Method: GET
URL: /api/users
```

## 📊 Best Practices

1. **Always use request ID in logs**
   ```typescript
   const requestId = (req as any).id;
   logger.info(`[${requestId}] Operation completed`);
   ```

2. **Log meaningful context**
   ```typescript
   logger.error("Payment failed", {
     userId: req.user.id,
     amount: req.body.amount,
     reason: error.message
   });
   ```

3. **Use appropriate log levels**
   - `error`: application errors yang perlu immediate attention
   - `warn`: potential issues atau deprecated usage
   - `info`: significant events (login, registration, etc)
   - `http`: automatic via middleware
   - `debug`: detailed diagnostic info untuk development

4. **Avoid logging sensitive data**
   ```typescript
   // ❌ BAD
   logger.info("User data", { password: user.password });
   
   // ✅ GOOD
   logger.info("User created", { userId: user.id, email: user.email });
   ```

5. **Use async handler for route safety**
   ```typescript
   router.post(
     "/users",
     asyncHandler(async (req, res) => {
       // Async errors automatically logged
       const user = await createUser(req.body);
       res.json(user);
     })
   );
   ```

## 🔧 Configuration

Logger configuration di `src/utils/logger.ts`:

```typescript
// Change log level
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  // ... other config
});

// Add new transport (e.g., remote logging service)
transports: [
  new winston.transports.Console(),
  new winston.transports.File({ filename: "logs/error.log" }),
  // new CustomTransport(),
]
```

## 📈 Monitoring Dashboard

Untuk production, integrasi logging dengan monitoring tools:
- **Sentry** untuk error tracking
- **DataDog** untuk centralized logging
- **ELK Stack** untuk log aggregation
- **LogRocket** untuk session replay

Tambahkan integration di `src/utils/logger.ts`

## 🐛 Troubleshooting

### Log files tidak terbuat?
- Check `logs/` directory permissions
- Ensure `fs.mkdirSync()` tidak error

### Console logs tidak muncul?
- Check `NODE_ENV` setting
- Verify `LOG_LEVEL` env variable
- Check console transport di logger config

### Logs too verbose?
- Turunkan `LOG_LEVEL` ke `warn` atau `error`
- Filter specific levels untuk file transport

---

**Dibuat:** 2026-05-22  
**Version:** 1.0.0  
**Winston Version:** 3.x
