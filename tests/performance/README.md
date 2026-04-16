# k6 Performance Test Suite

## Prerequisites
1. Start backend: `npm run start:dev`
2. Install k6: `choco install k6` or follow https://k6.io/docs/get-started/installation/
3. Confirm login works for the configured citizen account.

## Folder Layout
- `config/`: env, thresholds, and workload options
- `helpers/`: auth, headers, checks, random utils
- `clients/`: endpoint wrappers
- `data/`: valid DTO-compliant payload generators
- `scenarios/`: workload logic
- `scripts/`: runnable k6 entry points

## Base Environment
Use these env vars in PowerShell before running any test:
```powershell
$env:BASE_URL='http://localhost:3000/api/v1'
$env:CITIZEN_EMAIL='mohammadawwad069@gmail.com'
$env:CITIZEN_PASSWORD='Mm12218103'
```

## Run Commands
```powershell
k6 run tests/performance/scripts/read-heavy.test.js
k6 run tests/performance/scripts/write-heavy.test.js
k6 run tests/performance/scripts/mixed.test.js
k6 run tests/performance/scripts/spike.test.js
k6 run tests/performance/scripts/soak.test.js
```

## Optional Custom Load Parameters
```powershell
$env:READ_VUS='30'
$env:WRITE_VUS='12'
$env:MIXED_RATE='12'
$env:SPIKE_TARGET_RATE='60'
$env:SOAK_DURATION='45m'
```

## What to Watch
1. `http_req_duration p(95)` and `p(99)` for latency.
2. `http_req_failed` for error rate.
3. `checks` for functional success ratio.
4. Iteration throughput and trend stability in soak runs.

## Actionable Bottleneck Clues
1. High p95 in read-heavy: inspect DB query plans and indexes.
2. High errors in write-heavy: inspect validation/transaction hotspots.
3. Spike failures only: tune connection pools and autoscaling.
4. Soak drift over time: inspect memory growth and slow query buildup.
