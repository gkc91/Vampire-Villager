/**
 * Test araçları — gerçek oyunda görünmez.
 *
 * Kurucunun kendine rol seçmesi gibi şeyler yalnız test içindir; normal bir
 * odada açık olsaydı hile kapısı olurdu. Bu yüzden iki koşuldan biri gerekir:
 *   - geliştirme sunucusunda çalışıyor olmak (`npm run dev`), ya da
 *   - adrese `?test=1` eklemek (telefonda yayındaki sürümü test ederken).
 *
 * Örnek: https://.../?test=1#/join/ABC123
 */
export function testToolsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  const search = new URLSearchParams(window.location.search);
  if (search.get('test') === '1' || search.has('test')) return true;
  // Hash yönlendirmesi kullandığımız için oradaki bayrağı da kabul et.
  return /[?&]test(=1)?\b/.test(window.location.hash);
}
