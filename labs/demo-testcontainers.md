# Demo — Testcontainers (facilitator, ~10 นาที, Day 1 บ่าย-2)

Branch: `vitest/demo/testcontainers` (สร้างจาก `vitest/solution/04-test-data`)

## เล่าอะไร

compose (`npm run test:integration`) กับ Testcontainers (`npm run test:integration:tc`) รัน **test ชุดเดียวกัน** ต่างกันแค่ "ใครเป็นคนสร้าง database":

| | docker compose | Testcontainers |
|---|---|---|
| ใครสร้าง DB | เรา (script ก่อนรัน test) | test run เอง (`globalSetup` ของ project `integration-tc`) |
| DB อยู่นานแค่ไหน | จนกว่าจะ `down` | เฉพาะ test run นี้ แล้วถูกลบ |
| port | fix (5433) → ชนกันได้ | สุ่ม → รันหลาย project พร้อมกันได้ |
| เร็วแค่ไหน | DB พร้อมอยู่แล้ว → เร็ว | start container ทุกครั้ง → ช้ากว่าหลายวินาที |
| CI | ต้องมี docker compose | ต้องมี Docker API (dind ใน GitLab ใช้ได้) |

## Demo script

```bash
git switch vitest/demo/testcontainers
cd app && npm ci
npm run test:integration:tc
docker ps          # ระหว่างรัน (อีก terminal): เห็น postgres + ryuk
```

ชี้ให้ดู:
- `test/testcontainers/globalSetup.ts` — start Postgres, build + run Liquibase image **ตัวเดียวกับที่ใช้ใน compose/CI**
- `project.provide('databaseUrl', …)` → `inject('databaseUrl')` ใน `test/integration/env.ts` — globalSetup รันใน main process ส่วน test รันใน worker จึงส่งค่าผ่าน provide/inject และ `return` ฟังก์ชัน teardown แทนการฝากของไว้ใน `globalThis` แบบ Jest
- `useActiveDockerContext()` — OrbStack / Colima ไม่ได้ใช้ `/var/run/docker.sock`
- `elections.test.ts` ต้องปิด `legacyPool` — ถ้าไม่ปิด Postgres ถูก stop ขณะ pool ยังถือ connection อยู่ → run พัง (ปูทางไป Lab 07)
