import type { CardProps } from '@mui/material/Card';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { varAlpha } from 'src/theme/styles';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  list: { label: string; total: number }[];
};

export function DataMetrics({ title, subheader, list, sx, ...other }: Props) {
  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Box display="grid" gap={2} gridTemplateColumns="repeat(2, 1fr)" sx={{ p: 3 }}>
        {list.map((metric) => (
          <Box
            key={metric.label}
            sx={(theme) => ({
              py: 2.5,
              display: 'flex',
              borderRadius: 1.5,
              textAlign: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              border: `solid 1px ${varAlpha(theme.vars.palette.grey['700Channel'], 0.12)}`,
            })}
          >
            <Typography variant="h6" sx={{ mt: 1 }}>
              {metric.total}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {metric.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  );
}
