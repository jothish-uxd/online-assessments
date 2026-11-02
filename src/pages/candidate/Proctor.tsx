import { useState } from 'react';
import { logEvent } from '../../data/candidate/session';
import { CameraView, useCamera } from './Camera';

/**
 * The candidate's own camera, bottom right, while they're proctored.
 * Hiding the preview only hides it from them: recording carries on, and the
 * collapsed pill says so.
 */
export default function ProctorFeed() {
  const cam = useCamera();
  const [hidden, setHidden] = useState(false);
  const on = cam.status === 'live' || cam.status === 'simulated';
  const hide = (h: boolean) => { setHidden(h); logEvent('preview', h ? 'Hid the camera preview (recording continued)' : 'Showed the camera preview'); };

  if (!on) {
    return (
      <div className="cand-pip cand-pip--off" role="alert">
        <p><strong>Your camera is off.</strong> This assessment is proctored, so turn it back on to continue.</p>
        <div className="cand-pip__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void cam.start()}>Turn camera on</button>
          <button type="button" className="link-button" onClick={cam.simulate}>Sample camera</button>
        </div>
      </div>
    );
  }

  if (hidden) {
    return (
      <div className="cand-pip cand-pip--min">
        <span className="cand-rec" aria-hidden="true" />
        <span>Preview hidden · still recording</span>
        <button type="button" className="link-button" onClick={() => hide(false)}>Show</button>
      </div>
    );
  }

  return (
    <section className="cand-pip" aria-label="Your camera">
      <CameraView label="Your camera, recording for proctoring" />
      <div className="cand-pip__bar">
        <span className="cand-pip__rec"><span className="cand-rec" aria-hidden="true" />Recording</span>
        <button type="button" className="cand-pip__hide" onClick={() => hide(true)}>Hide preview</button>
      </div>
    </section>
  );
}
