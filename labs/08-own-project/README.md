# Lab 08 — นำไปใช้กับโปรเจกต์ของตัวเอง

**เวลา:** ~60 นาที · ทำในโปรเจกต์ระบบเลือกตั้งที่เขียนในวิชา backend

เป้าหมายไม่ใช่ "ครบทุกอย่าง" แต่คือ **ได้ test ของจริง 2–3 ตัวที่รันด้วยคำสั่งเดียว** และรู้ว่าขั้นต่อไปคืออะไร

## Step 1 — Test harness (15 นาที)

ใน branch ใหม่ของโปรเจกต์ตัวเอง:

```bash
git switch -c testing-workshop
npm i -D vitest supertest @types/supertest @faker-js/faker@9
```

Vitest 5 ต้องใช้ Node 22.12+ หรือ 24 · ใช้กับ TypeScript เวอร์ชันไหนก็ได้ รวมถึง **TypeScript 7** (`npm i -D typescript@7`)
โปรเจกต์มี test เป็น Jest อยู่แล้ว? ดูตารางแปลงใน [`labs/jest-vs-vitest.md`](../jest-vs-vitest.md)

คัดลอกจาก [`templates/`](templates/) แล้วปรับให้เข้ากับโปรเจกต์:

| ไฟล์ | ทำอะไร |
|---|---|
| `vitest.config.mts` | แยก `unit` / `integration` projects |
| `docker-compose.test.yml` | Postgres สำหรับ test + Liquibase |
| `db/Dockerfile`, `db/changelog/…` | migration แบบ versioned |
| `test/integration/env.ts`, `database.ts` | ชี้ไป test DB + truncate |
| `package-scripts.json` | script ที่ต้องเพิ่มใน `package.json` |

⚠️ ถ้าโปรเจกต์ใช้ stack อื่น — หลักการเดียวกัน เปลี่ยนแค่เครื่องมือ:
- **JavaScript (ไม่ใช่ TS):** ใช้ config เดิมได้เลย — Vitest รันทั้ง `.js` และ `.ts` โดยไม่ต้องตั้ง transform (ลบ script `typecheck` ออก)
- **มี migration อยู่แล้ว** (Prisma Migrate, Sequelize, TypeORM, Knex): ใช้ของเดิม ไม่ต้องย้ายมา Liquibase — สิ่งสำคัญคือ test DB ต้องสร้างจาก migration อัตโนมัติ
- **MongoDB:** ใช้ `mongo:7` ใน compose แทน Postgres; ล้างข้อมูลด้วย `db.dropDatabase()` หรือ `deleteMany({})` ต่อ collection
- **ไม่มี `createApp()`** (สร้าง app และ `listen()` ในไฟล์เดียว) → นี่คือ *seam* แรกที่ต้องสร้าง: แยก `app.ts` (สร้างและ export app) ออกจาก `server.ts` (listen) — supertest ต้องการแค่ app

## Step 2 — Characterize ก่อน (20 นาที)

เลือก **1 endpoint ที่สำคัญที่สุด** (มักเป็นการลงคะแนน) แล้วเขียน characterization test 3–4 ตัว แบบ Lab 07:
- happy path
- 1–2 กรณีที่ถูกปฏิเสธ
- พฤติกรรมแปลกที่เจอ (ถ้ามี) — จดไว้ ยังไม่ต้องแก้

## Step 3 — Automate test cases ที่เตรียมมา (20 นาที)

จาก test cases ที่จัด boundary ไว้ใน Lab 01:
1. เลือก 1 ข้อที่เป็น **unit** → ถ้า logic ฝังอยู่ใน route ให้ *sprout* ออกมาเป็นฟังก์ชันก่อน
2. เลือก 1 ข้อที่เป็น **component** → supertest + test DB + builder

## Step 4 — Readiness Checklist รอบสอง (5 นาที)

ให้คะแนนใน [`checklist/`](../../checklist/) อีกครั้ง — คะแนนเปลี่ยนจากเช้า Day 1 เท่าไหร่? ข้อไหนที่จะทำต่อเป็นอย่างแรกหลัง workshop?

## ติดตรงไหน? คำถามที่ช่วยได้

- "ถ้าจะ test สิ่งนี้ ต้อง *ควบคุม* อะไรบ้าง?" (เวลา, DB, token, service ภายนอก) → แต่ละอย่างคือ seam ที่ต้องมี
- "test นี้ต้องการ database จริงไหม หรือ logic แยกออกมาได้?"
- "ถ้า test นี้แดง ฉันจะรู้ไหมว่าอะไรพัง?"
