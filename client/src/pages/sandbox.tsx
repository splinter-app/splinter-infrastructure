import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { SandboxView } from 'src/sections/sandbox/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Users - ${CONFIG.appName}`}</title>
      </Helmet>

      <SandboxView />
    </>
  );
}
