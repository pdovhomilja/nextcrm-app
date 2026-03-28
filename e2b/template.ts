import { Template } from 'e2b';

export const template = Template()
  .fromNodeImage('20')
  .npmInstall(['agent-browser', 'tsx'], { g: true })
  // Install @anthropic-ai/sdk locally in /home/user so ESM imports resolve correctly
  .runCmd('npm install --prefix /home/user @anthropic-ai/sdk')
  .runCmd('agent-browser install --with-deps');
