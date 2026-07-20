import { useParams } from 'react-router-dom';
import { AreaPage } from './AreaPage';

export function AreaRoute() {
  const { areaId = '' } = useParams();
  return <AreaPage areaId={areaId} />;
}
