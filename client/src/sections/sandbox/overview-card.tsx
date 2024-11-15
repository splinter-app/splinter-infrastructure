import type { CardProps } from '@mui/material/Card';
import type { ColorType } from 'src/theme/core/palette';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import { varAlpha, bgGradient } from 'src/theme/styles';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  text: string;
  color?: ColorType;
  icon: React.ReactNode;
};

export function OverviewCard({ icon, title, text, color = 'primary', sx, ...other }: Props) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        ...bgGradient({
          color: `135deg, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}, ${varAlpha(theme.vars.palette[color].lighterChannel, 0.48)}`,
        }),
        p: 3,
        position: 'relative',
        color: `${color}.darker`,
        backgroundColor: 'common.white',
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box display="flex">
          <Box sx={{ width: 40, height: 35, mr: 2 }}>{icon}</Box>
          <Box sx={{ typography: 'h4' }}>{text}</Box>
        </Box>
        <Box sx={{ typography: 'subtitle2', mr: 2 }}>{title}</Box>
      </Box>
    </Card>
  );
}
