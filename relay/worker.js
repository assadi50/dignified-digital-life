/* Relay for the Dignified Digital Life Compass.
   Browsers may not post to Microsoft Forms directly (CORS), so the site posts the anonymous result code here
   and this Worker files it in the KGC Microsoft Form. Only well-formed codes are accepted. */
const FORM_URL = "https://forms.guest.usercontent.microsoft/formapi/api/6e68e7f4-e285-46f8-8984-47cf58f2d6a8/users/dbb53c17-3ac8-4998-8eb3-59723898d2ad/forms('9OdoboXi-EaJhEfPWPLWqBc8tdvIOphJjrNZcjiY0q1UMEFEM0I5TDVXR1hZRTQ4QlNaR1NDWUdJWS4u')/responses";
const Q_CODE = "r47201a16dbe7497a85a581c92d04077d";
const Q_CONSENT = "r1add92437e384c04b6f0e15bb5086b9f";
const CONSENT = "أوافق"; // أوافق
const ORIGINS = ["https://assadi50.github.io"];
const FULL = /^DDL2-(\d{38})(\d{2})-([A-Z2-9]{6})(-[A-Z0-9]{1,10})?$/;
const PART = /^DDLP-[0-9X]{38}-[A-Z2-9]{6}-S\d(-[A-Z0-9]{1,10})?$/;

function valid(code) {
  const m = FULL.exec(code);
  if (!m) return PART.test(code);
  let c = 0;
  for (let i = 0; i < 38; i++) c += Number(m[1][i]) * (i + 1);
  return c % 97 === Number(m[2]);
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ ok: true, service: "ddl-relay" }, 200);
    if (origin && !ORIGINS.includes(origin)) return json({ ok: false, error: "origin" }, 403);

    let code = "";
    try {
      const text = (await request.text()).slice(0, 400);
      try { code = JSON.parse(text).code; } catch (e) { code = text; }
    } catch (e) {}
    code = String(code || "").trim().toUpperCase();
    if (!valid(code)) return json({ ok: false, error: "code" }, 400);

    const now = new Date();
    const body = {
      startDate: new Date(now.getTime() - 60000).toISOString(),
      submitDate: now.toISOString(),
      answers: JSON.stringify([
        { questionId: Q_CODE, answer1: code },
        { questionId: Q_CONSENT, answer1: CONSENT },
      ]),
    };
    const r = await fetch(FORM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-correlationid": crypto.randomUUID(),
        "x-ms-form-request-ring": "business",
        "x-ms-form-request-source": "ms-formweb",
      },
      body: JSON.stringify(body),
    });
    return json({ ok: r.ok, status: r.status }, r.ok ? 200 : 502);
  },
};
