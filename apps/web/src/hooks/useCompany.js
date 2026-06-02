import { useLocation } from 'react-router-dom';

const COMPANY_LABELS = {
  'torres-tech':   'Torres Tech',
  'yazaki-torres': 'Yazaki Torres',
  'senior-high':   'Senior High',
};

const COLLECTION_PREFIX = {
  'torres-tech':   '',      // existing collections — walang prefix
  'yazaki-torres': 'yt_',   // bagong yt_* collections
  'senior-high':   'sh_',   // bagong sh_* collections
};

export const useCompany = () => {
  const location = useLocation();
  const slug   = location.pathname.split('/')[1] ?? 'torres-tech';
  const label  = COMPANY_LABELS[slug]  ?? 'Torres Tech';
  const prefix = COLLECTION_PREFIX[slug] ?? '';
  return { company: slug, companyLabel: label, prefix };
};