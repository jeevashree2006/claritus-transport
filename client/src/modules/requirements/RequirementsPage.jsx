/**
 * Requirements module entry point (route /requirements).
 * Sub-views use the query string so no shared routing file has to change:
 *   /requirements                 -> list
 *   /requirements?new=1           -> create form
 *   /requirements?id=REQ-0001     -> detail with the 8-stage flow
 */
import { useSearchParams } from 'react-router-dom';
import RequirementCreate from './pages/RequirementCreate';
import RequirementDetail from './pages/RequirementDetail';
import RequirementList from './pages/RequirementList';
import './RequirementsPage.css';

export default function RequirementsPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get('id');
  const isNew = params.get('new') === '1';

  const nav = {
    toList: () => setParams({}),
    toNew: () => setParams({ new: '1' }),
    toDetail: (ref) => setParams({ id: ref }),
  };

  if (isNew) return <RequirementCreate nav={nav} />;
  if (id) return <RequirementDetail key={id} requirementRef={id} nav={nav} />;
  return <RequirementList nav={nav} />;
}
