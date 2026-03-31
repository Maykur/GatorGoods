import { Badge } from '../ui';

function ConditionIndicator({ data }) {
  return <Badge condition={data}>{data || 'Unknown'}</Badge>;
}

export default ConditionIndicator;
