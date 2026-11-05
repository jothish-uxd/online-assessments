import { useEffect, useRef, useState } from 'react';
import { BrowserFrame } from '@jothish-uxd/enterprise-library';
import { ResetButton } from '@jothish-uxd/enterprise-library';
import Dialog from '../../components/content/Dialog';
import { usePageTitle } from '../../components/usePageTitle';
import { appById } from '../../data/apps';
import { QUESTIONS } from '../../data/candidate/assessment';
import { logEvent, patch, resetCandidate, useSession, type Phase } from '../../data/candidate/session';
import { CameraProvider, useCamera } from './Camera';
import Exam from './Exam';
import Header from './Header';
import ProctorFeed from './Proctor';
import { CameraCheck, Consent, Done, IdCapture, Ready, Selfie, SignedOut, Verify, Welcome } from './Steps';
import '../../styles/content.css';
import '../../styles/workflow.css';
import '../../styles/candidate.css';

const PATHS: Record<Phase, string> = {
  welcome: '/', consent: '/start/agreement', camera: '/start/camera', selfie: '/start/selfie', id: '/start/id',
  verify: '/start/verifying', ready: '/start/ready', exam: '/assessment', done: '/submitted', 'signed-out': '/signed-out',
};
const TITLES: Record<Phase, string> = {
  welcome: 'Welcome', consent: 'Agreement', camera: 'Camera', selfie: 'Selfie', id: 'Photo ID', verify: 'Checking photos',
  ready: 'Ready', exam: 'Assessment', done: 'Submitted', 'signed-out': 'Signed out',
};

/** The candidate website: what a candidate sees from invitation link to submission. */
export default function CandidateApp() {
  const app = appById('candidate');
  return (
    <BrowserFrame.Stage>
      <CameraProvider>
        <Framed host={app.host} />
      </CameraProvider>
    </BrowserFrame.Stage>
  );
}

function Framed({ host }: { host: string }) {
  const [s] = useSession();
  const cam = useCamera();
  const [signingOut, setSigningOut] = useState(false);
  const main = useRef<HTMLElement>(null);
  usePageTitle(`${TITLES[s.phase]} · Candidate website`);
  useEffect(() => { main.current?.scrollTo({ top: 0 }); }, [s.phase, s.index]);

  const path = s.phase === 'exam' ? `${PATHS.exam}/${s.index + 1}` : PATHS[s.phase];
  const proctored = s.phase === 'exam';

  const signOut = () => {
    setSigningOut(false);
    if (s.phase !== 'done') logEvent('sign-out', s.phase === 'exam' ? `Signed out on question ${s.index + 1}` : 'Signed out before starting');
    cam.stop();
    patch({ phase: 'signed-out', resume: s.phase === 'done' ? 'welcome' : s.phase });
  };
  const signIn = () => { patch({ phase: s.resume ?? 'welcome', resume: undefined }); if (s.resume === 'exam') logEvent('sign-in', 'Signed back in'); };

  return (
    <BrowserFrame host={host} path={path}
      end={<ResetButton what="candidate demo" description="Starts the candidate’s session over: clears answers, photos and the proctoring log, and resets the clock." done="Candidate demo restarted." to="/candidate-website" onReset={() => { cam.stop(); resetCandidate(); }} />}>
      <div className={`cand${proctored ? ' is-proctored' : ''}`}>
        <Header onSignOut={() => (s.phase === 'exam' ? setSigningOut(true) : signOut())} />
        <main id="main" className="cand-main" ref={main}>
          {s.phase === 'welcome' && <Welcome />}
          {s.phase === 'consent' && <Consent />}
          {s.phase === 'camera' && <CameraCheck />}
          {s.phase === 'selfie' && <Selfie />}
          {s.phase === 'id' && <IdCapture />}
          {s.phase === 'verify' && <Verify />}
          {s.phase === 'ready' && <Ready />}
          {s.phase === 'exam' && QUESTIONS[s.index] && <Exam />}
          {s.phase === 'done' && <Done />}
          {s.phase === 'signed-out' && <SignedOut onSignIn={signIn} />}
        </main>
        {proctored && <ProctorFeed />}
        <Dialog open={signingOut} onClose={() => setSigningOut(false)} title="Sign out during your assessment?"
          description={<p>Your answers so far are saved, but the assessment clock keeps running while you’re away. Signing out is recorded for the proctoring review.</p>}
          footer={<>
            <button type="button" className="btn btn--secondary" onClick={() => setSigningOut(false)} autoFocus>Stay signed in</button>
            <button type="button" className="btn btn--primary" onClick={signOut}>Sign out</button>
          </>} />
      </div>
    </BrowserFrame>
  );
}
