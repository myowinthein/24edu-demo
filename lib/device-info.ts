export function getDeviceInfo(): Record<string, string> {
  const ua = navigator.userAgent;

  let browser = 'Unknown', browserVersion = '';
  if (/Edg\//.test(ua)) {
    browser = 'Edge'; browserVersion = ua.match(/Edg\/([\d]+)/)?.[1] ?? '';
  } else if (/OPR\//.test(ua)) {
    browser = 'Opera'; browserVersion = ua.match(/OPR\/([\d]+)/)?.[1] ?? '';
  } else if (/SamsungBrowser\//.test(ua)) {
    browser = 'Samsung'; browserVersion = ua.match(/SamsungBrowser\/([\d]+)/)?.[1] ?? '';
  } else if (/Chrome\//.test(ua)) {
    browser = 'Chrome'; browserVersion = ua.match(/Chrome\/([\d]+)/)?.[1] ?? '';
  } else if (/Firefox\//.test(ua)) {
    browser = 'Firefox'; browserVersion = ua.match(/Firefox\/([\d]+)/)?.[1] ?? '';
  } else if (/Safari\//.test(ua)) {
    browser = 'Safari'; browserVersion = ua.match(/Version\/([\d]+)/)?.[1] ?? '';
  }

  let os = 'Unknown', osVersion = '';
  if (/Windows NT/.test(ua)) {
    os = 'Windows';
    const v = ua.match(/Windows NT ([\d.]+)/)?.[1] ?? '';
    const m: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
    osVersion = m[v] ?? v;
  } else if (/iPhone/.test(ua)) {
    os = 'iOS'; osVersion = (ua.match(/OS ([\d_]+)/)?.[1] ?? '').replace(/_/g, '.');
  } else if (/iPad/.test(ua)) {
    os = 'iPadOS'; osVersion = (ua.match(/OS ([\d_]+)/)?.[1] ?? '').replace(/_/g, '.');
  } else if (/Android/.test(ua)) {
    os = 'Android'; osVersion = ua.match(/Android ([\d.]+)/)?.[1] ?? '';
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS'; osVersion = (ua.match(/Mac OS X ([\d_]+)/)?.[1] ?? '').replace(/_/g, '.');
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  let device = 'Desktop';
  if (/iPad/.test(ua) || (/Tablet/.test(ua) && !/Mobile/.test(ua))) device = 'Tablet';
  else if (/Mobile|Android/.test(ua)) device = 'Mobile';

  return {
    browser, browserVersion, os, osVersion, device,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
