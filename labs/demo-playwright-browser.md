# Demo — Playwright browser test (facilitator, ~10 นาที, Day 2 เช้า หลัง Lab 06)

Branch: `demo/playwright-browser` (สร้างจาก `jest/solution/06-outside-in`)

## เล่าอะไร

feature เดียวกับ acceptance test ของ Lab 06 แต่ดูผ่าน **browser จริง** (`app/public/results.html`)

- setup ผ่าน API (`ElectionApi`) → เร็วและไม่เปราะ; ใช้ browser **เฉพาะส่วนที่ผู้ใช้เห็น**
- locator แบบ role/label (`getByRole('status')`, `getByLabel('เขตเลือกตั้ง')`) → test ไม่พังเมื่อเปลี่ยน CSS/โครงสร้าง HTML
- `expect(...).toHaveText()` รอให้ถูกเอง → ไม่ต้อง `sleep`

เทียบกับ API-level e2e: browser test ช้ากว่า ต้องติดตั้ง browser และพังได้จากเหตุผลมากกว่า → มีเฉพาะ journey ที่ UI สำคัญจริง ๆ

## Demo script

```bash
git switch demo/playwright-browser
cd app && npm ci
npx playwright install chromium        # ครั้งแรก ~150 MB — ทำก่อนเข้าห้อง
npm run test:e2e
SLOW_MO=500 npm run test:e2e -- e2e/browser --headed   # ให้เห็น browser ทำงาน (ช้าลง 500 ms ต่อ action)
npx playwright show-report             # trace / screenshot เมื่อ test แดง
```

รันซ้ำผ่าน `npm run test:e2e` เสมอ — มันสร้าง e2e database ใหม่ทุกครั้ง; `npx playwright test` ตรง ๆ รอบที่ 2 จะได้ 409 (ชื่อพรรคซ้ำ, BKK-1 ปิดหีบไปแล้ว)

ถ้าจะรันใน CI ต้องเพิ่มขั้น `npx playwright install --with-deps chromium` ก่อน `npm run test:e2e`
