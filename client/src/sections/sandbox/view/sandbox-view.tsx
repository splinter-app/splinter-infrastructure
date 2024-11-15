import { useState } from 'react';
import type { ResponseType } from 'src/types/types';

import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';

import { QuestionForm } from '../question-form';
import { RetrievedContext } from '../retrieved-context';
import { LLMResponse } from '../llm-response';
import { OverviewCard } from '../overview-card';

// ----------------------------------------------------------------------

export function SandboxView() {
  const [response, setResponse] = useState<ResponseType>();
  const [loading, setLoading] = useState(false);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: { xs: 3, md: 5 } }}>
        RAG Sandbox
      </Typography>

      <Grid container spacing={3}>
        <Grid xs={12} sm={6} md={6}>
          <OverviewCard
            title="LLM: GPT-4o"
            text="OpenAI"
            icon={<img alt="icon" src="/assets/icons/sandbox/ic-openai.svg" />}
          />
        </Grid>
        <Grid xs={12} sm={6} md={5}>
          <OverviewCard
            title="Vector DB | k = 5"
            text="Pinecone"
            icon={<img alt="icon" src="/assets/icons/sandbox/ic-pinecone.svg" />}
          />
        </Grid>
        <Grid xs={12} md={6} lg={6}>
          <QuestionForm setResponse={setResponse} setLoading={setLoading} />
        </Grid>
        <Grid xs={12} md={6} lg={5}>
          <RetrievedContext
            title="Retrieved Context"
            context={response?.context}
            loading={loading}
          />
        </Grid>

        <Grid xs={12} md={6} lg={11}>
          <LLMResponse title="LLM Response" response={response?.response} loading={loading} />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
