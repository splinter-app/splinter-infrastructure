import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import TextField from '@mui/material/TextField';
import { CircularProgress } from '@mui/material';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  response: string | undefined;
  loading: boolean;
};

export function LLMResponse({ title, subheader, response, loading, sx, ...other }: Props) {
  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />
      <Box display="grid" gap={2} sx={{ p: 3 }}>
        <TextField
          multiline
          rows={8}
          InputProps={{
            readOnly: true,
          }}
          value={response || ''}
        />
        {loading && <GradientCircularProgress />}
      </Box>
    </Card>
  );
}

export function GradientCircularProgress() {
  return (
    <>
      <svg width={0} height={0}>
        <defs>
          <linearGradient id="my_gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e01cd5" />
            <stop offset="100%" stopColor="#1CB5E0" />
          </linearGradient>
        </defs>
      </svg>
      <CircularProgress
        sx={{
          'svg circle': { stroke: 'url(#my_gradient)' },
          position: 'absolute',
          top: '50%',
          left: '46%',
        }}
      />
    </>
  );
}
