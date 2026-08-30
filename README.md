# KwickInk

Frictionless, zero-trust campus printing: dual-lane min-heap queues, pickup time slots, HMAC-SHA256 payments, WebSocket ETAs, and a 4-digit OTP handshake that purges the spool on collection.

## Stack (matches the pitch deck)


1. **Python 3.11+** and **Node.js 18+**
2. Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

3. Frontend (second terminal):

```powershell
cd frontend
npm install
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173)
5. Two-browser walkthrough:

| Browser | Login | Path |
| --- | --- | --- |
| A — student | **Demo student** on the login screen | Print → upload `fixtures/lab-report.pdf` → slot → **Calculate & Confirm** → copy the 4-digit OTP |
| B — shop | **Demo shop** | Command Center → **Start** the job → enter OTP → file is purged |







## Security (zero-trust path)

- PDF magic-byte validation; uploads capped at 15 MB; stored as random ids, not student filenames
- Pickup OTP hashed with HMAC-SHA256 (pepper = `SECRET_KEY`); ciphertext stored for the student UI only; never sent to the vendor board
- 5 failed OTP attempts lock that job
- Payment webhooks verified with HMAC-SHA256 before `QUEUED`
- `/api/payments/simulate` works only when `DEMO_MODE=true` (hackathon checkout)
- Atomic purge of the spool when OTP succeeds
- Login/register/upload rate limits; security headers; CORS allow-list; JWT HS256
- Vendor accounts cannot be self-registered



## Scale

Point `DATABASE_URL` at PostgreSQL for multi-instance shops. Printer speed and slot length are `PRINTER_PPM` and `SLOT_MINUTES`.
