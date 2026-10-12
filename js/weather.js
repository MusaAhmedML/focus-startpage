/**
 * Weather Service using Open-Meteo REST API (100% Free, Zero API Key Required)
 * Features:
 * - Realtime temperature, feels like, humidity, wind, precipitation
 * - Hourly forecast trend (next 6 hours)
 * - Daily Min / Max
 * - LocalStorage caching with 20-minute TTL
 * - WMO Weather Code to Crisp SVG vector icons
 */

class WeatherService {
  constructor(config = {}) {
    this.lat = config.lat ?? 53.7893;
    this.lng = config.lng ?? -2.2406;
    this.city = config.city ?? 'Burnley, UK';
    this.cacheKey = 'focus_weather_cache_v1';
    this.cacheTtl = 20 * 60 * 1000; // 20 minutes
  }

  // WMO Code Map
  getWeatherInfo(code, isDay = 1) {
    const table = {
      0: { desc: isDay ? 'Clear Sky' : 'Clear Night', icon: isDay ? 'sun' : 'moon' },
      1: { desc: 'Mainly Clear', icon: isDay ? 'sun-cloud' : 'moon-cloud' },
      2: { desc: 'Partly Cloudy', icon: 'cloud-sun' },
      3: { desc: 'Overcast', icon: 'cloud' },
      45: { desc: 'Foggy', icon: 'cloud-fog' },
      48: { desc: 'Depositing Rime Fog', icon: 'cloud-fog' },
      51: { desc: 'Light Drizzle', icon: 'cloud-drizzle' },
      53: { desc: 'Moderate Drizzle', icon: 'cloud-drizzle' },
      55: { desc: 'Dense Drizzle', icon: 'cloud-drizzle' },
      61: { desc: 'Slight Rain', icon: 'cloud-rain' },
      63: { desc: 'Moderate Rain', icon: 'cloud-rain' },
      65: { desc: 'Heavy Rain', icon: 'cloud-heavy-rain' },
      71: { desc: 'Slight Snow', icon: 'cloud-snow' },
      73: { desc: 'Moderate Snow', icon: 'cloud-snow' },
      75: { desc: 'Heavy Snow', icon: 'cloud-snow' },
      77: { desc: 'Snow Grains', icon: 'cloud-snow' },
      80: { desc: 'Slight Showers', icon: 'cloud-rain' },
      81: { desc: 'Moderate Showers', icon: 'cloud-rain' },
      82: { desc: 'Violent Showers', icon: 'cloud-heavy-rain' },
      95: { desc: 'Thunderstorm', icon: 'cloud-lightning' },
      96: { desc: 'Thunderstorm with Hail', icon: 'cloud-lightning' },
      99: { desc: 'Heavy Thunderstorm', icon: 'cloud-lightning' }
    };
    return table[code] || { desc: 'Partly Cloudy', icon: 'cloud-sun' };
  }

  // Generate SVG icon
  getSvgIcon(iconType) {
    switch (iconType) {
      case 'sun':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
      case 'moon':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
      case 'cloud':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
      case 'cloud-sun':
      case 'sun-cloud':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`;
      case 'cloud-drizzle':
      case 'cloud-rain':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>`;
      case 'cloud-heavy-rain':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m9 14-2 6"/><path d="m13 14-2 6"/><path d="m17 14-2 6"/></svg>`;
      case 'cloud-snow':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e0f2fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/></svg>`;
      case 'cloud-lightning':
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>`;
      default:
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
    }
  }

  // Synchronous cache retrieval for instant 0ms initial render
  getCachedForecast() {
    const cached = localStorage.getItem(this.cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached).data;
      } catch (e) {}
    }
    return {
      city: this.city,
      temp: 17,
      feelsLike: 17,
      humidity: 60,
      windSpeed: 10,
      precipitation: 0,
      desc: 'Partly Cloudy',
      icon: 'cloud-sun',
      svg: this.getSvgIcon('cloud-sun'),
      tempMax: 20,
      tempMin: 13,
      hourly: []
    };
  }

  // Fetch forecast
  async getForecast() {
    // Check cache
    const cached = localStorage.getItem(this.cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < this.cacheTtl) {
          return parsed.data;
        }
      } catch (e) {
        localStorage.removeItem(this.cacheKey);
      }
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.lat}&longitude=${this.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=2`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
      const data = await res.json();

      const current = data.current;
      const weatherMeta = this.getWeatherInfo(current.weather_code, current.is_day);

      // Hourly next 6 hours
      const now = new Date();
      const currentHourIso = now.toISOString().slice(0, 13);
      let startIndex = 0;
      if (data.hourly && data.hourly.time) {
        startIndex = data.hourly.time.findIndex(t => t.startsWith(currentHourIso));
        if (startIndex === -1) startIndex = 0;
      }

      const hourlyNext = [];
      for (let i = startIndex; i < startIndex + 6 && i < data.hourly.time.length; i++) {
        const tStr = data.hourly.time[i];
        const hourNum = new Date(tStr).getHours();
        const code = data.hourly.weather_code[i];
        const isDayHour = hourNum >= 6 && hourNum < 21 ? 1 : 0;
        const info = this.getWeatherInfo(code, isDayHour);
        hourlyNext.push({
          time: `${hourNum}:00`,
          temp: Math.round(data.hourly.temperature_2m[i]),
          precipProb: data.hourly.precipitation_probability ? data.hourly.precipitation_probability[i] : 0,
          desc: info.desc,
          icon: info.icon,
          svg: this.getSvgIcon(info.icon)
        });
      }

      const result = {
        city: this.city,
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        desc: weatherMeta.desc,
        icon: weatherMeta.icon,
        svg: this.getSvgIcon(weatherMeta.icon),
        tempMax: data.daily ? Math.round(data.daily.temperature_2m_max[0]) : null,
        tempMin: data.daily ? Math.round(data.daily.temperature_2m_min[0]) : null,
        hourly: hourlyNext
      };

      // Save to cache
      localStorage.setItem(this.cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
      return result;
    } catch (err) {
      console.warn('Weather fetch failed, using fallback cached state if exists', err);
      if (cached) {
        return JSON.parse(cached).data;
      }
      // Return offline placeholder
      return {
        city: this.city,
        temp: 18,
        feelsLike: 18,
        humidity: 65,
        windSpeed: 12,
        precipitation: 0,
        desc: 'Partly Cloudy',
        icon: 'cloud-sun',
        svg: this.getSvgIcon('cloud-sun'),
        tempMax: 21,
        tempMin: 14,
        hourly: []
      };
    }
  }
}

window.WeatherService = WeatherService;
