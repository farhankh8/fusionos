# Runbook: API Unavailable

## Symptoms

- Health check returns 503
- Frontend shows connection errors
- API logs show startup failures

## Diagnosis

### 1. Check API process

```bash
# Check if process is running
ps aux | grep "fusionos-api" || ps aux | grep "node.*main.js"

# Check Docker container
docker ps | grep fusionos-api
docker logs fusionos-api --tail 50
```

### 2. Check port availability

```bash
# Check if port 3001 is in use
lsof -i :3001
netstat -tlnp | grep 3001
```

### 3. Check database connection

```bash
# Test PostgreSQL connectivity
psql -h localhost -U fusionos -d fusionos -c "SELECT 1"

# Check PostgreSQL status
docker ps | grep postgres
docker logs fusionos-postgres --tail 20
```

### 4. Check environment variables

```bash
# Verify required env vars are set
echo $DATABASE_URL
echo $JWT_SECRET
echo $PORT
```

## Mitigation

### If database is down:

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Wait for health check
docker-compose exec postgres pg_isready -U fusionos
```

### If port is in use:

```bash
# Kill process on port 3001
kill $(lsof -t -i:3001)

# Or change port in .env
PORT=3002
```

### If application crashed:

```bash
# Restart API
docker-compose restart api

# Or for development
npm run dev:api
```

## Recovery

1. Verify health check returns 200: `curl http://localhost:3001/api/v1/health`
2. Verify database connectivity: `curl http://localhost:3001/api/v1/health/ready`
3. Test a simple API call: `curl http://localhost:3001/api/v1/health`

## Verification

- [ ] Health check passes
- [ ] Database connection works
- [ ] Frontend can load
- [ ] Authentication works
- [ ] API responses are correct
