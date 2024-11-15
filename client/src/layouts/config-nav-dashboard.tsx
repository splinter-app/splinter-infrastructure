import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor width="100%" height="100%" src={`/assets/icons/navbar/${name}.svg`} />
);

export const navData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: icon('ic-dashboard'),
  },
  {
    title: 'RAG Sandbox',
    path: '/sandbox',
    icon: icon('ic-chat'),
  },
];
