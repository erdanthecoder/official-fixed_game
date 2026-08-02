/**
 * Which device is this, and therefore which download should be shown first.
 *
 * Deliberately shallow. User-agent sniffing is unreliable and always will be,
 * so nothing here decides what someone is *allowed* to do — every download
 * stays on the page whatever this returns. It only decides what to put at the
 * top, because a page that offers a Windows installer to a phone as its first
 * and largest option is a page that has not been thought about.
 *
 * `userAgentData.platform` is the modern answer and is checked first; the
 * string sniff is the fallback for the browsers that do not have it yet.
 */

export const PLATFORMS = ['windows', 'android', 'ios', 'mac', 'other'];

export function detectPlatform(nav = typeof navigator === 'undefined' ? null : navigator) {
  if (!nav) return 'other';

  const hinted = nav.userAgentData?.platform?.toLowerCase() ?? '';
  if (hinted.includes('android')) return 'android';
  if (hinted.includes('windows')) return 'windows';

  const ua = (nav.userAgent ?? '').toLowerCase();
  if (ua.includes('android')) return 'android';
  if (/iphone|ipod/.test(ua)) return 'ios';

  // iPadOS reports itself as a Mac and has done since version 13. A touch
  // screen is what actually separates the two, because no Mac has one.
  if (ua.includes('ipad') || (ua.includes('macintosh') && (nav.maxTouchPoints ?? 0) > 1)) {
    return 'ios';
  }

  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'mac';
  return 'other';
}

/**
 * Where the installers live.
 *
 * A GitHub release page rather than files served from this site, on purpose:
 * an 80 MB installer inside the deployment would be cached by the service
 * worker, counted against the hosting quota, and re-uploaded on every deploy
 * of a one-line CSS change. The release is also what the build workflows
 * already publish to, so there is one copy of each file and no step where
 * somebody has to remember to copy it across.
 */
export const RELEASES = 'https://github.com/erdanthecoder/official-fixed_game/releases';
const ASSET = `${RELEASES}/download/installers`;

export const DOWNLOADS = {
  android: { file: 'Kadam.apk', url: `${ASSET}/Kadam.apk`, size: '~2 MB' },
  windowsSetup: {
    file: 'Kadam-Setup-1.0.0.exe',
    url: `${ASSET}/Kadam-Setup-1.0.0.exe`,
    size: '~80 MB',
  },
  windowsPortable: {
    file: 'Kadam-Portable-1.0.0.exe',
    url: `${ASSET}/Kadam-Portable-1.0.0.exe`,
    size: '~80 MB',
  },
};
