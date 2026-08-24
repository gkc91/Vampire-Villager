/**
 * ICE (STUN/TURN) yapılandırması ve bağlantı teşhisi.
 *
 * Trystero varsayılan olarak 4 ücretsiz STUN sunucusu kullanır ve buradaki
 * TURN girdilerini onların ÜSTÜNE ekler.
 *
 * STUN yeterli değildir: operatör ağlarındaki simetrik NAT/CGNAT arkasında
 * iki telefon birbirini doğrudan bulamaz, araya TURN (aktarıcı) gerekir.
 * Hesap gerektirmeyen kamuya açık TURN sunucusu artık YOK (openrelay.metered.ca
 * ölçüldü: 0 relay adayı). Bu yüzden TURN varsayılan olarak kapalıdır ve
 * yalnız kullanıcı kendi sunucusunu tanımlarsa devreye girer.
 *
 * .env örneği:
 *   VITE_TURN_URLS=turn:ornek.com:3478,turns:ornek.com:5349
 *   VITE_TURN_USERNAME=kullanici
 *   VITE_TURN_CREDENTIAL=parola
 */

export interface TurnServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export function turnServers(): TurnServer[] {
  const urls = (import.meta.env.VITE_TURN_URLS as string | undefined)?.trim();
  if (!urls) return [];
  return [
    {
      urls: urls.split(',').map((u) => u.trim()).filter(Boolean),
      username: import.meta.env.VITE_TURN_USERNAME as string | undefined,
      credential: import.meta.env.VITE_TURN_CREDENTIAL as string | undefined,
    },
  ];
}

export function hasTurn(): boolean {
  return turnServers().length > 0;
}

export interface IceProbe {
  /** Dış IP öğrenilebildi mi (STUN çalışıyor mu). */
  stun: boolean;
  /** TURN tanımlıysa aktarıcı adayı alınabildi mi; tanımlı değilse null. */
  turn: boolean | null;
  /** Simetrik NAT şüphesi: STUN var ama aday sayısı çok düşük. */
  candidates: number;
}

/**
 * Cihazın ICE yeteneğini ölçer. "Neden bağlanamıyorum?" sorusunu
 * tahminden çıkarıp ölçüme bağlar (docs/TESTING.md §4).
 */
export async function probeIce(timeoutMs = 6000): Promise<IceProbe> {
  const gather = (config: RTCConfiguration, policy: RTCIceTransportPolicy): Promise<string[]> =>
    new Promise((resolve) => {
      const found: string[] = [];
      let pc: RTCPeerConnection;
      try {
        pc = new RTCPeerConnection({ ...config, iceTransportPolicy: policy });
      } catch {
        resolve([]);
        return;
      }
      pc.createDataChannel('probe');
      pc.onicecandidate = (e) => {
        if (e.candidate) found.push(e.candidate.candidate);
      };
      const done = () => {
        pc.close();
        resolve(found);
      };
      const timer = setTimeout(done, timeoutMs);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          done();
        }
      };
      void pc.createOffer().then((offer) => pc.setLocalDescription(offer));
    });

  const stunConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
  };

  const stunCandidates = await gather(stunConfig, 'all');
  const stun = stunCandidates.some((c) => c.includes(' typ srflx'));

  let turn: boolean | null = null;
  const turnConfig = turnServers();
  if (turnConfig.length > 0) {
    const relayCandidates = await gather({ iceServers: turnConfig }, 'relay');
    turn = relayCandidates.some((c) => c.includes(' typ relay'));
  }

  return { stun, turn, candidates: stunCandidates.length };
}
