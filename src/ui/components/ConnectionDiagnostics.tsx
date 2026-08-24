import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { hasTurn, probeIce, type IceProbe } from '../../net/ice';
import { Card, Spinner } from './atoms';

/**
 * "Neden bağlanamıyorum?" panelini tahminden çıkarıp ölçüme bağlar:
 * sinyal sunucusuna ulaşılıyor mu, karşı cihaz bulundu mu, WebRTC'nin
 * dış adres/aktarıcı yetenekleri çalışıyor mu.
 */
export function ConnectionDiagnostics() {
  const { t } = useTranslation();
  const diagnostics = useGameStore((s) => s.diagnostics);
  const slow = useGameStore((s) => s.slowConnect);
  const retry = useGameStore((s) => s.retryConnect);
  const [probe, setProbe] = useState<IceProbe | null>(null);
  const [probing, setProbing] = useState(false);

  const runProbe = async () => {
    setProbing(true);
    try {
      setProbe(await probeIce());
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
      {diagnostics && <Timings timings={diagnostics.timings} />}

      {slow && noRelay && <Note text={t('connect.hintNoRelay')} bad />}
      {slow && relayButNoPeer && <Note text={t('connect.hintNat')} bad />}

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
