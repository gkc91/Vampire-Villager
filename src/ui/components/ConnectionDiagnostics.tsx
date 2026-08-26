import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { hasTurn, probeIce, type IceProbe } from '../../net/ice';
import { probeRelay, type RelayProbe } from '../../net/RelayAdapter';
import { activeNetMode } from '../../net';
import { Card, Spinner } from './atoms';

/**
 * "Neden bağlanamıyorum?" panelini tahminden çıkarıp ölçüme bağlar.
 *
 * DİKKAT: bu panel P2P döneminde yazılmıştı ve aktarıcı modunda YANLIŞ
 * teşhis koyuyordu — "cihazlar birbirini bulamıyor, CGNAT olabilir, WiFi'a
 * geç" diyordu. Aktarıcıda NAT geçişi diye bir şey yok: sunucu bağlıyken
 * 0 cihaz görünüyorsa tek anlamı vardır, kurucu o odada değildir. STUN/TURN
 * ölçümü de yalnız P2P modunda anlamlıdır. Mesajlar artık moda göre seçilir.
 */
export function ConnectionDiagnostics() {
  const { t } = useTranslation();
  const diagnostics = useGameStore((s) => s.diagnostics);
  const slow = useGameStore((s) => s.slowConnect);
  const retry = useGameStore((s) => s.retryConnect);
  const roomId = useGameStore((s) => s.roomId);
  const wakeLock = useGameStore((s) => s.wakeLock);
  const [probe, setProbe] = useState<IceProbe | null>(null);
  const [relayProbe, setRelayProbe] = useState<RelayProbe | null>(null);
  const [probing, setProbing] = useState(false);
  const relayMode = activeNetMode() === 'relay';

  const runProbe = async () => {
    setProbing(true);
    try {
      if (relayMode) setRelayProbe(await probeRelay());
      else setProbe(await probeIce());
    } finally {
      setProbing(false);
    }
  };

  const noRelay = diagnostics !== null && diagnostics.relaysConnected === 0;
  const relayButNoPeer =
    diagnostics !== null && diagnostics.relaysConnected > 0 && diagnostics.peers === 0;

  return (
    <Card className="w-full space-y-2 text-left text-xs">
      <Row label={t('connect.strategy')} value={diagnostics?.strategy ?? '—'} />
      <Row
        label={t('connect.relays')}
        value={diagnostics ? `${diagnostics.relaysConnected}/${diagnostics.relaysTotal}` : '—'}
        bad={noRelay}
      />
      <Row label={t('connect.peers')} value={String(diagnostics?.peers ?? 0)} />
      {roomId && <Row label={t('connect.room')} value={roomId} />}
      {/* "Ekran kapanıyor" şikâyetinde kilidin tutup tutmadığı burada
          görünür; telefonda başka türlü anlaşılmıyor. */}
      <Row
        label={t('diag.wakeLock')}
        value={wakeLock}
        bad={wakeLock === 'failed' || wakeLock === 'unsupported' || wakeLock === 'released'}
      />
      {diagnostics && <Timings timings={diagnostics.timings} />}

      {slow && noRelay && (
        <Note text={t(relayMode ? 'connect.hintRelayDown' : 'connect.hintNoRelay')} bad />
      )}
      {slow && relayButNoPeer && (
        <Note text={t(relayMode ? 'connect.hintRoomEmpty' : 'connect.hintNat')} bad />
      )}

      {relayProbe && (
        <div className="space-y-1 border-t border-night-700 pt-2">
          <Note
            text={t(relayProbe.site ? 'connect.probeSiteOk' : 'connect.probeSiteFail')}
            bad={!relayProbe.site}
          />
          <Note
            text={
              relayProbe.socket
                ? t('connect.probeSocketOk', { ms: relayProbe.ms ?? 0 })
                : relayProbe.timedOut
                  ? t('connect.probeSocketSlow')
                  : t('connect.probeSocketFail', { code: relayProbe.closeCode ?? 0 })
            }
            bad={!relayProbe.socket}
          />
          {relayProbe.sse === true && <Note text={t('connect.probeSseOk')} bad />}
          {relayProbe.sse === false && <Note text={t('connect.probeSseFail')} bad />}
          {relayProbe.site && !relayProbe.socket && <Note text={t('connect.probeBlocked')} bad />}
          {relayProbe.site && relayProbe.socket && <Note text={t('connect.probeAllOk')} />}
        </div>
      )}

      {probe && (
        <div className="space-y-1 border-t border-night-700 pt-2">
          <Note text={probe.stun ? t('connect.stunOk') : t('connect.stunFail')} bad={!probe.stun} />
          {probe.turn === null && <Note text={t('connect.turnOff')} bad={!hasTurn()} />}
          {probe.turn === true && <Note text={t('connect.turnOk')} />}
          {probe.turn === false && <Note text={t('connect.turnFail')} bad />}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="btn-secondary flex-1 py-2 text-xs"
          disabled={probing}
          onClick={() => void runProbe()}
        >
          {probing ? <Spinner /> : <span>{t('connect.test')}</span>}
        </button>
        <button type="button" className="btn-secondary flex-1 py-2 text-xs" onClick={() => void retry()}>
          {t('connect.retry')}
        </button>
      </div>
    </Card>
  );
}

function Timings({ timings }: { timings: { module?: number; relay?: number; peer?: number } }) {
  const { t } = useTranslation();
  const ms = (v?: number) => (v === undefined ? '—' : `${(v / 1000).toFixed(1)} sn`);
  return (
    <div className="space-y-1 border-t border-night-700 pt-2">
      <Row label={t('connect.tModule')} value={ms(timings.module)} />
      <Row label={t('connect.tRelay')} value={ms(timings.relay)} />
      <Row label={t('connect.tPeer')} value={ms(timings.peer)} />
    </div>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-moon-200/60">{label}</span>
      <span className={`font-mono ${bad ? 'text-blood-300' : 'text-moon-100'}`}>{value}</span>
    </div>
  );
}

function Note({ text, bad }: { text: string; bad?: boolean }) {
  return <p className={bad ? 'text-blood-300' : 'text-moon-200/70'}>{text}</p>;
}
