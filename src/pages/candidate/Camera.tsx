import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { patch, useSession } from '../../data/candidate/session';

/*
  One camera for the whole session: the setup check, the selfie, the ID photos
  and the proctoring feed share the same stream. If the browser can't give us
  a camera (blocked, none attached, or this preview runs headless), the
  prototype can carry on with a drawn sample feed instead.
*/

type Status = 'idle' | 'asking' | 'live' | 'simulated' | 'blocked';
interface Cam {
  status: Status;
  stream: MediaStream | null;
  error: string;
  start: () => Promise<void>;
  simulate: () => void;
  stop: () => void;
}

const Ctx = createContext<Cam>({ status: 'idle', stream: null, error: '', start: async () => {}, simulate: () => {}, stop: () => {} });
export const useCamera = () => useContext(Ctx);

export function CameraProvider({ children }: { children: ReactNode }) {
  const [session] = useSession();
  const [status, setStatus] = useState<Status>(session.camera === 'simulated' ? 'simulated' : 'idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    setStream((s) => { s?.getTracks().forEach((t) => t.stop()); return null; });
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('blocked'); setError('This browser can’t share a camera.'); return; }
    setStatus('asking');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      setStream(s);
      setStatus('live');
      patch({ camera: 'live' });
      // If the camera is unplugged or turned off from outside, say so.
      s.getVideoTracks()[0]?.addEventListener('ended', () => { setStream(null); setStatus('idle'); });
    } catch (e) {
      const name = (e as DOMException).name;
      setStatus('blocked');
      setError(name === 'NotAllowedError' ? 'Camera access was blocked.' : name === 'NotFoundError' ? 'No camera was found.' : 'The camera couldn’t start.');
    }
  }, []);

  const simulate = useCallback(() => { setStatus('simulated'); patch({ camera: 'simulated' }); setError(''); }, []);

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  return <Ctx.Provider value={{ status, stream, error, start, simulate, stop }}>{children}</Ctx.Provider>;
}

/* ---------- The live view ---------- */

export type Guide = 'face' | 'card' | 'none';

/** Shows the camera (or the sample feed). Hand it a ref to capture from it. */
export function CameraView({ guide = 'none', videoRef, label, sample = 'face', onReady }: {
  guide?: Guide; videoRef?: React.MutableRefObject<HTMLVideoElement | null>; label: string; sample?: 'face' | 'card-front' | 'card-back';
  /** Called once the live picture is showing, so a photo can be taken */
  onReady?: () => void;
}) {
  const { stream, status } = useCamera();
  const local = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = local.current;
    if (v && stream && v.srcObject !== stream) { v.srcObject = stream; void v.play().catch(() => {}); }
  }, [stream, status]);

  return (
    <div className={`camview camview--${guide}`} role="img" aria-label={label}>
      {status === 'live' && stream
        ? <video ref={(el) => { local.current = el; if (videoRef) videoRef.current = el; }} muted playsInline autoPlay className="camview__video" onPlaying={onReady} />
        : <SampleFeed kind={sample} />}
      {guide === 'face' && <span className="camview__oval" aria-hidden="true" />}
      {guide === 'card' && <span className="camview__card" aria-hidden="true" />}
      {status === 'simulated' && <span className="camview__note">Sample camera · prototype</span>}
    </div>
  );
}

/** Drawn stand-in for a camera feed: a head and shoulders, or an ID card held up. */
function SampleFeed({ kind }: { kind: 'face' | 'card-front' | 'card-back' }) {
  return (
    <svg className="camview__sample" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="240" className="sf-bg" />
      <rect x="0" y="170" width="320" height="70" className="sf-wall" />
      <g className="sf-person">
        <ellipse cx="160" cy="250" rx="92" ry="70" />
        <rect x="146" y="150" width="28" height="30" rx="8" />
        <ellipse cx="160" cy="112" rx="40" ry="48" />
      </g>
      {kind !== 'face' && (
        <g className="sf-card" transform="translate(70 60) rotate(-3)">
          <rect width="180" height="114" rx="10" />
          {kind === 'card-front' ? (
            <>
              <rect x="14" y="20" width="50" height="62" rx="4" className="sf-card__photo" />
              <rect x="76" y="22" width="86" height="8" rx="2" className="sf-card__line" />
              <rect x="76" y="40" width="70" height="6" rx="2" className="sf-card__line" />
              <rect x="76" y="54" width="78" height="6" rx="2" className="sf-card__line" />
              <rect x="76" y="68" width="52" height="6" rx="2" className="sf-card__line" />
              <rect x="14" y="92" width="150" height="8" rx="2" className="sf-card__line" />
            </>
          ) : (
            <>
              <rect x="14" y="16" width="152" height="26" rx="2" className="sf-card__line" />
              {Array.from({ length: 22 }, (_, i) => <rect key={i} x={16 + i * 7} y="58" width={i % 3 ? 3 : 5} height="38" className="sf-card__line" />)}
            </>
          )}
        </g>
      )}
    </svg>
  );
}

/** Grab a still from the camera, scaled down, as a JPEG data URL. Draws a sample when there's no real camera. */
export function captureFrame(video: HTMLVideoElement | null, kind: 'face' | 'card-front' | 'card-back'): string {
  const W = 480, H = 360;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  if (video && video.videoWidth) {
    // Draw the frame as the camera saw it (the preview is mirrored; the photo isn’t), so ID text reads correctly.
    const s = Math.max(W / video.videoWidth, H / video.videoHeight);
    const w = video.videoWidth * s, h = video.videoHeight * s;
    g.drawImage(video, (W - w) / 2, (H - h) / 2, w, h);
  } else {
    g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#d6d6d6'; g.fillRect(0, 255, W, 105);
    g.fillStyle = '#9a9a9a';
    g.beginPath(); g.ellipse(240, 375, 138, 105, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(219, 225, 42, 45);
    g.beginPath(); g.ellipse(240, 168, 60, 72, 0, 0, Math.PI * 2); g.fill();
    if (kind !== 'face') {
      g.save(); g.translate(105, 90); g.rotate(-0.05);
      g.fillStyle = '#fafafa'; g.strokeStyle = '#555'; g.lineWidth = 3;
      g.beginPath(); g.roundRect(0, 0, 270, 171, 14); g.fill(); g.stroke();
      g.fillStyle = '#888';
      if (kind === 'card-front') {
        g.fillRect(21, 30, 75, 93);
        [[114, 33, 129], [114, 60, 105], [114, 81, 117], [114, 102, 78], [21, 138, 225]].forEach(([x, y, w]) => g.fillRect(x, y, w, 10));
      } else {
        g.fillRect(21, 24, 228, 39);
        for (let i = 0; i < 22; i++) g.fillRect(24 + i * 10.5, 87, i % 3 ? 4 : 8, 57);
      }
      g.restore();
    }
  }
  return canvas.toDataURL('image/jpeg', 0.72);
}
