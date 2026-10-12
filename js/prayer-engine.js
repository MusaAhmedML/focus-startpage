/**
 * High-Precision Astronomical & Dynamic Salah Engine v2.0
 * Auto calculates location daily at midnight with fallback to Burnley, UK.
 * Native In-Page Adhaan Audio and Full-Screen Covering Salah Reminder Modal.
 */

class SalahEngine {
  constructor(config = {}) {
    this.lat = config.lat ?? 53.7893;
    this.lng = config.lng ?? -2.2406;
    this.asrMethod = config.asrMethod ?? 'Hanafi'; // 'Hanafi' (2x) or 'Standard' (1x)
    this.fajrAngle = config.fajrAngle ?? 18;
    this.ishaAngle = config.ishaAngle ?? 17;
    this.offsets = config.offsets ?? { fajr: 0, sunrise: 0, dhuhr: 1, asr: 0, maghrib: 1, isha: 0 };
    this.city = config.city ?? 'Burnley, UK';
    this.serverTimings = null;
    this.reflections = null;
    this.firedToday = new Set();
    this.lastLocationCheckDate = '';

    this.requestNotificationPermission();
    this.init();
  }

  requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  async init() {
    await this.fetchServerData();
    await this.checkAutoLocation();
    this.scheduleMidnightSync();
    this.startMinuteWatcher();
  }

  async fetchServerData() {
    try {
      const res = await fetch('/api/salah');
      if (res.ok) {
        const data = await res.json();
        if (data.timings && Object.keys(data.timings).length > 0) {
          this.serverTimings = data.timings;
        }
        if (data.jamaat && Object.keys(data.jamaat).length > 0) {
          this.serverJamaat = data.jamaat;
        }
        if (data.reflections) {
          this.reflections = data.reflections;
        }
        if (data.city) {
          this.city = data.city;
        }
        if (window.updateSalah) {
          window.updateSalah();
        }
      }
    } catch (e) {
      console.warn('Salah API offline, using astronomical calculation.', e);
    }
  }

  async checkAutoLocation() {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastLocationCheckDate === today) return;

    try {
      const res = await fetch('/api/location/auto');
      if (res.ok) {
        const loc = await res.json();
        if (loc.lat && loc.lng) {
          this.lat = loc.lat;
          this.lng = loc.lng;
          this.city = `${loc.city}, ${loc.country}`;
          this.lastLocationCheckDate = today;
          console.log(`[Salah] Location auto-synced: ${this.city} (${this.lat}, ${this.lng})`);
        }
      }
    } catch (e) {
      console.warn('[Salah] Location auto-sync failed, using fallback.', e);
    }
  }

  scheduleMidnightSync() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msToMidnight = midnight.getTime() - now.getTime();

    setTimeout(async () => {
      console.log('[Salah] Midnight Trigger: Recalculating location and daily timings...');
      this.firedToday.clear();
      await this.checkAutoLocation();
      await this.fetchServerData();
      if (window.appSalah) window.appSalah.updateUI();
      this.scheduleMidnightSync();
    }, msToMidnight);
  }

  // Trigonometric Helpers
  radToDeg(r) { return (r * 180.0) / Math.PI; }
  degToRad(d) { return (d * Math.PI) / 180.0; }
  sinDeg(d) { return Math.sin(this.degToRad(d)); }
  cosDeg(d) { return Math.cos(this.degToRad(d)); }
  tanDeg(d) { return Math.tan(this.degToRad(d)); }
  asinDeg(x) { return this.radToDeg(Math.asin(Math.max(-1, Math.min(1, x)))); }
  acosDeg(x) { return this.radToDeg(Math.acos(Math.max(-1, Math.min(1, x)))); }
  atanDeg(x) { return this.radToDeg(Math.atan(x)); }
  acotDeg(x) { return this.radToDeg(Math.atan(1.0 / x)); }

  fixHour(h) {
    h = h - 24.0 * Math.floor(h / 24.0);
    return h < 0 ? h + 24.0 : h;
  }

  fixAngle(a) {
    a = a - 360.0 * Math.floor(a / 360.0);
    return a < 0 ? a + 360.0 : a;
  }

  getJulianDate(year, month, day) {
    if (month <= 2) {
      year -= 1;
      month += 12;
    }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
  }

  getSunPosition(jd) {
    const D = jd - 2451545.0;
    const g = this.fixAngle(357.529 + 0.98560028 * D);
    const q = this.fixAngle(280.459 + 0.98564736 * D);
    const L = this.fixAngle(q + 1.915 * this.sinDeg(g) + 0.020 * this.sinDeg(2 * g));

    const e = 23.439 - 0.00000036 * D;
    const d = this.asinDeg(this.sinDeg(e) * this.sinDeg(L));
    let RA = this.atanDeg(this.cosDeg(e) * this.sinDeg(L) / this.cosDeg(L)) / 15.0;
    if (this.cosDeg(L) < 0) RA += 12;
    else if (this.sinDeg(L) < 0) RA += 24;

    const EqT = q / 15.0 - this.fixHour(RA);
    return { declination: d, equationOfTime: EqT };
  }

  getHourAngle(alpha, declination) {
    const cosHA = (this.sinDeg(alpha) - this.sinDeg(this.lat) * this.sinDeg(declination)) /
                  (this.cosDeg(this.lat) * this.cosDeg(declination));
    if (cosHA > 1) return 0;
    if (cosHA < -1) return 180;
    return this.acosDeg(cosHA);
  }

  calculateTimes(date = new Date()) {
    const isToday = !date || (new Date(date)).toDateString() === (new Date()).toDateString();

    const makeDateFromHM = (hmStr) => {
      if (!hmStr || typeof hmStr !== 'string' || !hmStr.includes(':')) return null;
      const [h, m] = hmStr.split(':').map(Number);
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const format12 = (d) => {
      if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '--:--';
      let h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    };

    const format24 = (d) => {
      if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '--:--';
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    // Primary: Use authentic Mosque OCR Timetable if available for today
    if (isToday && this.serverTimings && this.serverTimings.Fajr && this.serverTimings.Dhuhr) {
      let sunriseD = makeDateFromHM(this.serverTimings.Sunrise);
      if (!sunriseD) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const timezone = -date.getTimezoneOffset() / 60;
        const jd = this.getJulianDate(year, month, day);
        const sun = this.getSunPosition(jd);
        const noon = this.fixHour(12 + timezone - (this.lng / 15.0) - sun.equationOfTime);
        const sunriseHA = this.getHourAngle(-0.833, sun.declination) / 15.0;
        const sunrise = this.fixHour(noon - sunriseHA);
        const totalMinutes = Math.round(sunrise * 60);
        sunriseD = new Date(date);
        sunriseD.setHours(Math.floor(totalMinutes / 60) % 24, totalMinutes % 60, 0, 0);
      }

      const timings = {
        fajr: makeDateFromHM(this.serverTimings.Fajr),
        sunrise: sunriseD,
        dhuhr: makeDateFromHM(this.serverTimings.Dhuhr),
        asr: makeDateFromHM(this.serverTimings.Asr),
        maghrib: makeDateFromHM(this.serverTimings.Maghrib),
        isha: makeDateFromHM(this.serverTimings.Isha)
      };

      return {
        raw: timings,
        formatted24: {
          Fajr: this.serverTimings.Fajr,
          Sunrise: this.serverTimings.Sunrise || format24(timings.sunrise),
          Dhuhr: this.serverTimings.Dhuhr,
          Asr: this.serverTimings.Asr,
          Maghrib: this.serverTimings.Maghrib,
          Isha: this.serverTimings.Isha
        },
        formatted12: {
          Fajr: format12(timings.fajr),
          Sunrise: format12(timings.sunrise),
          Dhuhr: format12(timings.dhuhr),
          Asr: format12(timings.asr),
          Maghrib: format12(timings.maghrib),
          Isha: format12(timings.isha)
        },
        jamaat: this.serverJamaat || {},
        asrSchool: 'Mosque Timetable (OCR Verified)',
        location: this.city
      };
    }

    // Fallback: Astronomical mathematical calculation
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const timezone = -date.getTimezoneOffset() / 60;
    const jd = this.getJulianDate(year, month, day);
    const sun = this.getSunPosition(jd);

    const noon = this.fixHour(12 + timezone - (this.lng / 15.0) - sun.equationOfTime);
    const sunAngle = -0.833;
    const sunriseHA = this.getHourAngle(sunAngle, sun.declination) / 15.0;
    const sunrise = this.fixHour(noon - sunriseHA);
    const sunset = this.fixHour(noon + sunriseHA);

    let fajrHA = this.getHourAngle(-this.fajrAngle, sun.declination) / 15.0;
    if (fajrHA === 0 || isNaN(fajrHA) || fajrHA > sunriseHA + 4.5) {
      fajrHA = sunriseHA + 1.5;
    }
    const fajr = this.fixHour(noon - fajrHA);

    let ishaHA = this.getHourAngle(-this.ishaAngle, sun.declination) / 15.0;
    if (ishaHA === 0 || isNaN(ishaHA) || ishaHA > (24 - sunset + noon)) {
      ishaHA = (sunset - noon) + 1.5;
    }
    const isha = this.fixHour(noon + ishaHA);

    const shadowFactor = this.asrMethod === 'Hanafi' ? 2 : 1;
    const asrAngle = this.acotDeg(shadowFactor + this.tanDeg(Math.abs(this.lat - sun.declination)));
    const asrHA = this.getHourAngle(asrAngle, sun.declination) / 15.0;
    const asr = this.fixHour(noon + asrHA);

    const makeDate = (hoursFraction, offsetMinutes = 0) => {
      const d = new Date(date);
      const totalMinutes = Math.round(hoursFraction * 60) + offsetMinutes;
      const h = Math.floor(totalMinutes / 60) % 24;
      const m = totalMinutes % 60;
      d.setHours(h, m, 0, 0);
      return d;
    };

    const timings = {
      fajr: makeDate(fajr, this.offsets.fajr),
      sunrise: makeDate(sunrise, this.offsets.sunrise),
      dhuhr: makeDate(noon, this.offsets.dhuhr),
      asr: makeDate(asr, this.offsets.asr),
      maghrib: makeDate(sunset, this.offsets.maghrib),
      isha: makeDate(isha, this.offsets.isha),
    };

    return {
      raw: timings,
      formatted24: {
        Fajr: format24(timings.fajr),
        Sunrise: format24(timings.sunrise),
        Dhuhr: format24(timings.dhuhr),
        Asr: format24(timings.asr),
        Maghrib: format24(timings.maghrib),
        Isha: format24(timings.isha)
      },
      formatted12: {
        Fajr: format12(timings.fajr),
        Sunrise: format12(timings.sunrise),
        Dhuhr: format12(timings.dhuhr),
        Asr: format12(timings.asr),
        Maghrib: format12(timings.maghrib),
        Isha: format12(timings.isha)
      },
      jamaat: this.serverJamaat || {},
      asrSchool: this.asrMethod,
      location: this.city
    };
  }

  getStatus(now = new Date()) {
    const times = this.calculateTimes(now).raw;
    const schedule = [
      { name: 'Fajr', time: times.fajr, isPrayer: true },
      { name: 'Sunrise', time: times.sunrise, isPrayer: false },
      { name: 'Dhuhr', time: times.dhuhr, isPrayer: true },
      { name: 'Asr', time: times.asr, isPrayer: true },
      { name: 'Maghrib', time: times.maghrib, isPrayer: true },
      { name: 'Isha', time: times.isha, isPrayer: true },
    ];

    let current = null;
    let next = null;

    if (now >= times.isha) {
      current = schedule[5];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimes = this.calculateTimes(tomorrow).raw;
      next = { name: 'Fajr', time: tomorrowTimes.fajr, isPrayer: true };
    } else if (now < times.fajr) {
      current = { name: 'Isha', time: times.isha, isPrayer: true };
      next = schedule[0];
    } else {
      for (let i = 0; i < schedule.length; i++) {
        if (now >= schedule[i].time) {
          current = schedule[i];
          next = schedule[i + 1] || { name: 'Fajr', time: this.calculateTimes(new Date(now.getTime() + 86400000)).raw.fajr, isPrayer: true };
        }
      }
    }

    const diffMs = Math.max(0, next.time.getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let countdownStr = '';
    if (hours > 0) {
      countdownStr = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      countdownStr = `${minutes}m ${seconds}s`;
    } else {
      countdownStr = `${seconds}s`;
    }

    return {
      current: current ? current.name : 'Isha',
      next: next.name,
      nextTime: next.time,
      diffMs,
      countdownStr,
      isPrayerTime: current && current.isPrayer
    };
  }

  startMinuteWatcher() {
    setInterval(() => {
      const now = new Date();
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const calculated = this.calculateTimes(now).formatted24;
      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

      for (const p of prayers) {
        const timeStr = this.serverTimings?.[p] || calculated[p];
        if (nowStr === timeStr) {
          const alertKey = `${p}_${now.toISOString().split('T')[0]}`;
          if (!this.firedToday.has(alertKey)) {
            this.firedToday.add(alertKey);
            this.triggerInPageSalahReminder(p, timeStr);
          }
        }
      }
    }, 10000);
  }

  triggerInPageSalahReminder(prayerName, timeStr) {
    console.log(`🕌 [Salah Reminder] Starting in-page alert for ${prayerName} at ${timeStr}`);
    const reflectionData = this.reflections?.[prayerName] || {
      arabic: "حَافِظُوا عَلَى الصَّلَوَاتِ",
      pronunciation: "Hafidhoo 'ala as-salawat",
      meaning: "Guard strictly your prayers.",
      reflection: `Time for ${prayerName} (${timeStr}). Anchor your focus in remembrance.`
    };

    const jamaatStr = this.serverJamaat?.[prayerName] || null;

    // 1. Trigger native desktop system notification via local backend daemon
    fetch('/api/salah/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prayer: prayerName,
        time: timeStr,
        jamaat: jamaatStr,
        reflection: reflectionData
      })
    }).catch(e => console.warn('[Salah] Backend notification call failed:', e));

    // 2. Dispatch browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notifTitle = jamaatStr 
          ? `🕌 Salah Time: ${prayerName} (${timeStr}) | Jama'ah: ${jamaatStr}`
          : `🕌 Salah Time: ${prayerName} (${timeStr})`;
        const notifBody = jamaatStr
          ? `🕌 Jama'ah at Masjid: ${jamaatStr}\n\n${reflectionData.arabic}\n${reflectionData.meaning}\n\n${reflectionData.reflection}`
          : `${reflectionData.arabic}\n${reflectionData.meaning}\n\n${reflectionData.reflection}`;

        new Notification(notifTitle, {
          body: notifBody,
          icon: '/assets/icons/icon-192.png',
          tag: `salah-${prayerName}`,
          requireInteraction: true
        });
      } catch (e) {
        console.warn('[Salah] Browser notification failed:', e);
      }
    }

    // 3. Open in-page covering alert modal & play audio
    if (window.openCoveringSalahAlert) {
      window.openCoveringSalahAlert(prayerName, timeStr, reflectionData, jamaatStr);
    }
  }
}

window.SalahEngine = SalahEngine;
