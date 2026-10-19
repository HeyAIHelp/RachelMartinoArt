/* Reads Rachel's markets calendar (any iCal / .ics link: Google Calendar,
   Apple iCloud, Outlook) and returns the upcoming events as simple JSON for
   markets.html. She only ever edits her calendar app.

   Netlify environment variable:
     CALENDAR_ICS_URL   the calendar's iCal address (see SETUP.md)          */
const TZ = "America/Los_Angeles";
const DAYS_AHEAD = 240, MAX_EVENTS = 40;

/* ---------- tiny iCal parser ---------- */
function unfold(text) { return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, ""); }
const unescape = v => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();

function parseLine(line) {
  const i = line.indexOf(":"); if (i < 0) return null;
  const [name, ...params] = line.slice(0, i).split(";");
  const p = {}; params.forEach(x => { const [k, v] = x.split("="); p[k.toUpperCase()] = v; });
  return { name: name.toUpperCase(), params: p, value: line.slice(i + 1) };
}

/* Wall-clock time in Rachel's time zone, as {y,m,d,hh,mm} */
function partsInTZ(date) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const o = Object.fromEntries(f.formatToParts(date).map(x => [x.type, x.value]));
  return { y: +o.year, m: +o.month, d: +o.day, hh: +o.hour, mm: +o.minute };
}

/* Returns {y,m,d,hh,mm,allDay} as local wall-clock time. UTC ("Z") times are
   converted to Pacific; TZID / floating times are taken as written. */
function parseDate(prop) {
  const v = prop.value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  if (!m[4]) return { y: +m[1], m: +m[2], d: +m[3], hh: 0, mm: 0, allDay: true };
  if (m[7]) return { ...partsInTZ(new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]))), allDay: false };
  return { y: +m[1], m: +m[2], d: +m[3], hh: +m[4], mm: +m[5], allDay: false };
}

const dayNum = p => Date.UTC(p.y, p.m - 1, p.d) / 864e5;          // whole days since epoch
const fromDayNum = n => { const t = new Date(n * 864e5); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const weekday = n => new Date(n * 864e5).getUTCDay();

/* Expand a repeating event (weekly Saturday market etc.) into start-day numbers */
function expand(startDay, rule, fromDay, toDay) {
  if (!rule) return [startDay];
  const r = Object.fromEntries(rule.split(";").map(x => x.split("=")));
  const freq = r.FREQ, interval = +(r.INTERVAL || 1), count = r.COUNT ? +r.COUNT : Infinity;
  const until = r.UNTIL ? dayNum(parseDate({ value: r.UNTIL })) : Infinity;
  const out = []; let n = 0;
  const push = day => { if (day < startDay || day > until || n >= count) return false; n++; out.push(day); return true; };
  const end = Math.min(toDay, until);

  if (freq === "DAILY") {
    for (let d = startDay; d <= end && n < count; d += interval) push(d);
  } else if (freq === "WEEKLY") {
    const days = r.BYDAY ? r.BYDAY.split(",").map(x => WD[x.slice(-2)]) : [weekday(startDay)];
    const weekStart = startDay - weekday(startDay);
    for (let w = weekStart; w <= end && n < count; w += 7 * interval)
      for (const wd of days.sort()) push(w + wd);
  } else if (freq === "MONTHLY" || freq === "YEARLY") {
    const s = fromDayNum(startDay);
    for (let k = 0; k < 600 && n < count; k += interval) {
      const total = (s.m - 1) + (freq === "YEARLY" ? 12 * k : k);
      const y = s.y + Math.floor(total / 12), mo = total % 12 + 1;
      if (dayNum({ y, m: mo, d: 1 }) > end) break;
      if (freq === "MONTHLY" && r.BYDAY) {                      // e.g. 1SA = first Saturday, -1SU = last Sunday
        for (const tok of r.BYDAY.split(",")) {
          const nth = parseInt(tok, 10) || 1, wd = WD[tok.slice(-2)];
          const first = dayNum({ y, m: mo, d: 1 });
          const monthEnd = dayNum({ y: mo === 12 ? y + 1 : y, m: mo === 12 ? 1 : mo + 1, d: 1 }) - 1;
          let day = nth > 0 ? first + ((wd - weekday(first) + 7) % 7) + 7 * (nth - 1)
                            : monthEnd - ((weekday(monthEnd) - wd + 7) % 7) + 7 * (nth + 1);
          if (day >= first && day <= monthEnd) push(day);
        }
      } else {
        const day = dayNum({ y, m: mo, d: s.d });
        if (fromDayNum(day).d === s.d) push(day);                // skip months without that date
      }
    }
  }
  return out.filter(d => d >= fromDay && d <= toDay);
}

function parseICS(text, today) {
  const lines = unfold(text).split("\n");
  const fromDay = today, toDay = today + DAYS_AHEAD;
  const events = [], overrides = new Set();
  let cur = null;
  for (const raw of lines) {
    if (raw === "BEGIN:VEVENT") { cur = { ex: [] }; continue; }
    if (raw === "END:VEVENT") {
      if (cur && cur.start && cur.status !== "CANCELLED") events.push(cur);
      cur = null; continue;
    }
    if (!cur) continue;
    const p = parseLine(raw); if (!p) continue;
    if (p.name === "SUMMARY") cur.title = unescape(p.value);
    else if (p.name === "LOCATION") cur.location = unescape(p.value);
    else if (p.name === "DESCRIPTION") cur.description = unescape(p.value);
    else if (p.name === "URL") cur.url = p.value.trim();
    else if (p.name === "DTSTART") cur.start = parseDate(p);
    else if (p.name === "DTEND") cur.end = parseDate(p);
    else if (p.name === "RRULE") cur.rrule = p.value;
    else if (p.name === "EXDATE") p.value.split(",").forEach(v => { const d = parseDate({ value: v }); if (d) cur.ex.push(dayNum(d)); });
    else if (p.name === "UID") cur.uid = p.value;
    else if (p.name === "RECURRENCE-ID") cur.recurrenceId = parseDate(p);
    else if (p.name === "STATUS") cur.status = p.value.trim().toUpperCase();
  }
  // a moved/edited single date of a repeating event replaces that date
  for (const e of events) if (e.recurrenceId) overrides.add(e.uid + "|" + dayNum(e.recurrenceId));

  const out = [];
  for (const e of events) {
    const s = dayNum(e.start);
    const lenDays = e.end ? dayNum(e.end) - s - (e.start.allDay ? 1 : 0) : 0;
    const days = e.recurrenceId ? [s].filter(d => d >= fromDay && d <= toDay)
      : expand(s, e.rrule, fromDay - Math.max(0, lenDays), toDay).filter(d => !e.ex.includes(d) && !overrides.has(e.uid + "|" + d));
    for (const d of days) {
      if (d + Math.max(0, lenDays) < fromDay) continue;          // already over
      const date = fromDayNum(d), endDate = fromDayNum(d + Math.max(0, lenDays));
      const iso = x => `${x.y}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`;
      const hm = x => `${String(x.hh).padStart(2, "0")}:${String(x.mm).padStart(2, "0")}`;
      out.push({
        title: e.title || "Market day",
        date: iso(date),
        endDate: lenDays > 0 ? iso(endDate) : null,
        allDay: e.start.allDay,
        start: e.start.allDay ? null : hm(e.start),
        end: e.start.allDay || !e.end ? null : hm(e.end),
        location: e.location || "",
        description: (e.description || "").slice(0, 400),
        url: /^https?:\/\//.test(e.url || "") ? e.url : null,
      });
    }
  }
  out.sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")));
  return out.slice(0, MAX_EVENTS);
}

exports.parseICS = parseICS;
exports.todayDayNum = () => dayNum(partsInTZ(new Date()));

exports.handler = async () => {
  const json = (status, body, cache) => ({
    statusCode: status,
    headers: { "Content-Type": "application/json", "Cache-Control": cache || "no-store" },
    body: JSON.stringify(body),
  });
  const url = (process.env.CALENDAR_ICS_URL || "").replace(/^webcal:/i, "https:");
  if (!url) return json(503, { events: [], error: "Calendar not connected yet." });
  try {
    const res = await fetch(url, { headers: { "User-Agent": "rachelmartinoart.com" } });
    if (!res.ok) throw new Error("Calendar returned " + res.status);
    const events = parseICS(await res.text(), exports.todayDayNum());
    return json(200, { events }, "public, max-age=600");   // refreshes every 10 minutes
  } catch (e) {
    console.error("calendar error", e.message);
    return json(502, { events: [], error: "Couldn't load the calendar." });
  }
};
