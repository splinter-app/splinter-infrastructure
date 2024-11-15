import type { CardProps } from '@mui/material/Card';
import type { ContextType } from 'src/types/types';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import TextField from '@mui/material/TextField';
import { CircularProgress } from '@mui/material';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title?: string;
  subheader?: string;
  context: ContextType[] | undefined;
  loading: boolean;
};

export function RetrievedContext({ title, subheader, context, loading, sx, ...other }: Props) {
  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Box display="grid" gap={2} sx={{ p: 3 }} position="relative">
        <TextField
          multiline
          rows={16}
          InputProps={{
            readOnly: true,
          }}
          value={
            context
              ? (context as ContextType[])
                  .reduce(
                    (acc, item) =>
                      `${acc}Relevancy Score (${item.score.toFixed(4)}): ${item.text} \n\n`,
                    ''
                  )
                  .trim()
              : ''
          }
        />
        {loading && <CircularProgress style={{ position: 'absolute', top: '50%', left: '46%' }} />}
      </Box>
    </Card>
  );
}
