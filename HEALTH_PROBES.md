# Health Probes Configuration

This document describes the readiness and liveness probe configuration for the Course Application.

## Overview

The application uses Spring Boot Actuator health endpoints to provide Kubernetes-compatible health checks. Three types of probes are configured:

1. **Startup Probe** - Ensures the application has started successfully
2. **Liveness Probe** - Checks if the application is running and responsive
3. **Readiness Probe** - Determines if the application is ready to accept traffic

## Spring Boot Configuration

### Dependencies

The `spring-boot-starter-actuator` dependency is added to provide health endpoints:

```kotlin
implementation("org.springframework.boot:spring-boot-starter-actuator")
```

### Application Properties

Health probes are configured in `application.properties`:

```properties
# Actuator Configuration
management.endpoints.web.exposure.include=health,info,metrics
management.endpoints.web.base-path=/actuator
management.endpoint.health.show-details=when-authorized

# Enable Kubernetes-specific health probes
management.endpoint.health.probes.enabled=true
management.health.livenessState.enabled=true
management.health.readinessState.enabled=true

# Group health indicators for different probe purposes
management.endpoint.health.group.liveness.include=livenessState,ping
management.endpoint.health.group.readiness.include=readinessState,db,diskSpace
```

### Health Check Endpoints

- **Liveness**: `GET /actuator/health/liveness`
  - Checks: Application lifecycle state, basic ping
  - Purpose: Detect application crashes or deadlocks
  
- **Readiness**: `GET /actuator/health/readiness`
  - Checks: Application ready state, database connectivity, disk space
  - Purpose: Determine if app can handle requests

- **Overall Health**: `GET /actuator/health`
  - Aggregates all health indicators

### Security Configuration

Health endpoints are accessible without authentication to allow Kubernetes probes:

```kotlin
.requestMatchers("/actuator/health/**").permitAll()
```

## Kubernetes Configuration

### Probe Timings

#### Startup Probe
```yaml
startupProbe:
  httpGet:
    path: /actuator/health/liveness
    port: http
  initialDelaySeconds: 0
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 30      # 5 minutes max startup time (30 * 10s)
  successThreshold: 1
```

**Purpose**: Handles slow application startup, especially with database initialization.
- Gives up to 5 minutes for the application to start
- Other probes don't run until startup succeeds

#### Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3       # Restart after 3 consecutive failures (30s)
  successThreshold: 1
```

**Purpose**: Detects application hangs or crashes and triggers pod restart.
- Checks every 10 seconds
- Restarts pod after 3 consecutive failures (30 seconds of downtime)

#### Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: http
  initialDelaySeconds: 20
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3       # Remove from service after 15s (3 * 5s)
  successThreshold: 1
```

**Purpose**: Controls when pod receives traffic from service load balancer.
- Checks every 5 seconds
- Removes from service after 3 consecutive failures (15 seconds)
- Includes database health check

## Testing Health Endpoints

### Local Testing

Start the application and test the endpoints:

```bash
# Check liveness
curl http://localhost:8081/actuator/health/liveness

# Check readiness
curl http://localhost:8081/actuator/health/readiness

# Check overall health
curl http://localhost:8081/actuator/health
```

Expected responses:

**Liveness (UP):**
```json
{
  "status": "UP"
}
```

**Readiness (UP):**
```json
{
  "status": "UP"
}
```

### Kubernetes Testing

After deploying to Kubernetes:

```bash
# View pod status
kubectl get pods

# Check probe details
kubectl describe pod <pod-name>

# View probe events
kubectl get events --field-selector involvedObject.name=<pod-name>

# Port-forward and test manually
kubectl port-forward <pod-name> 8081:8081
curl http://localhost:8081/actuator/health/liveness
```

## Probe Decision Matrix

| Probe Type | Checks | Success | Failure Action | Use Case |
|------------|--------|---------|----------------|----------|
| Startup | App started | Pod marked as started | Pod restarted | Slow-starting apps |
| Liveness | App responsive | Continue running | Pod restarted | Detect deadlocks |
| Readiness | Ready for traffic | Add to service | Remove from service | Database down |

## Health Indicators Included

### Liveness Indicators
- **livenessState**: Spring Boot application lifecycle state
- **ping**: Basic response check

### Readiness Indicators
- **readinessState**: Spring Boot application readiness state
- **db**: Database connectivity (JPA DataSource health)
- **diskSpace**: Available disk space check

## Best Practices Applied

1. ✅ **Separate liveness and readiness**: Different concerns, different checks
2. ✅ **Startup probe**: Protects slow-starting apps from premature restarts
3. ✅ **Database in readiness only**: Database issues shouldn't restart the pod
4. ✅ **Appropriate timeouts**: Balanced between responsiveness and stability
5. ✅ **Security exemption**: Health endpoints accessible without auth
6. ✅ **Detailed health groups**: Customized indicators per probe type

## Troubleshooting

### Pod keeps restarting
- Check liveness probe is passing: `kubectl logs <pod-name>`
- Increase `failureThreshold` or `periodSeconds` if needed
- Verify database connectivity

### Pod not receiving traffic
- Check readiness probe: `kubectl describe pod <pod-name>`
- Verify database is accessible
- Check application logs for startup errors

### Slow startup causing restarts
- Increase `startupProbe.failureThreshold`
- Check database initialization time
- Review application startup logs

### Health endpoint returns DOWN
```bash
# Get detailed health info (when authenticated)
curl -H "Authorization: Bearer <token>" http://localhost:8081/actuator/health

# Check which indicator is failing
kubectl logs <pod-name> | grep -i health
```

## Production Considerations

### Resource Limits
Consider adding resource limits when using probes:

```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

### Database Connection Pool
Ensure your database connection pool is sized appropriately:
- Readiness probe will fail if connections are exhausted
- Consider separate connection for health checks

### Monitoring
Monitor probe metrics:
- Pod restart frequency
- Time spent in non-ready state
- Probe failure patterns

## References

- [Kubernetes Probe Configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html)
- [Spring Boot Kubernetes Probes](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes)

